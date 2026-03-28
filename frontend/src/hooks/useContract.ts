import { useMemo, useState } from "react";
import abi from "../abi/OTCSettlement.json";
import { DEFAULT_FEE_LIMIT, NATIVE_TRX_ADDRESS, OTC_SETTLEMENT_ADDRESS, TOKENS } from "../utils/constants";
import { explorerTx, getTokenByAddress, humanizeTronError, normalizeDeal, toUnits } from "../utils/tronHelpers";
import type { AppError, CreateDealInput, Deal, DealActivity, DealActionState } from "../types";

declare global {
  interface Window {
    tronWeb?: any;
  }
}

const trc20Abi = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }]
  }
];

type PersistedActivity = Record<string, DealActivity[]>;

function readActivityLog(): PersistedActivity {
  try {
    return JSON.parse(localStorage.getItem("otc-tx-log") ?? "{}") as PersistedActivity;
  } catch {
    return {};
  }
}

function writeActivityLog(log: PersistedActivity) {
  localStorage.setItem("otc-tx-log", JSON.stringify(log));
}

function upsertActivity(dealId: number, activity: DealActivity) {
  const current = readActivityLog();
  const key = String(dealId);
  current[key] = [activity, ...(current[key] ?? [])];
  writeActivityLog(current);
}

function getActivity(dealId: number) {
  return readActivityLog()[String(dealId)] ?? [];
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function decodeHexMessage(raw: string) {
  try {
    if (!raw) {
      return "";
    }
    const normalized = raw.startsWith("0x") ? raw.slice(2) : raw;
    const bytes = normalized.match(/.{1,2}/g)?.map((value) => parseInt(value, 16)) ?? [];
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return raw;
  }
}

export function useContract(walletAddress: string) {
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(false);

  const contract = useMemo(() => {
    if (!window.tronWeb) {
      return null;
    }
    return window.tronWeb.contract(abi as any, OTC_SETTLEMENT_ADDRESS);
  }, [walletAddress]);

  async function refreshDeal(dealId: number) {
    if (!contract) {
      return null;
    }
    const raw = await contract.getDeal(dealId).call();
    return normalizeDeal(raw);
  }

  async function waitForDealUpdate(dealId: number, predicate: (deal: Deal) => boolean, timeoutMs = 20000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const next = await refreshDeal(dealId);
      if (next && predicate(next)) {
        return next;
      }
      await sleep(1000);
    }
    throw new Error("Waiting for Nile confirmation took too long. Refresh the deal and check the tx hash in TronScan.");
  }

  async function waitForTransactionSuccess(txHash: string, context: string, timeoutMs = 45000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const info = await window.tronWeb.trx.getTransactionInfo(txHash);
      if (info && Object.keys(info).length > 0) {
        const result = String(info.receipt?.result ?? "");
        if (result === "SUCCESS") {
          return info;
        }
        if (result && result !== "SUCCESS") {
          const reason = decodeHexMessage(String(info.resMessage ?? ""));
          throw new Error(reason ? `${context} failed on-chain: ${reason}` : `${context} failed on-chain.`);
        }
      }
      await sleep(1500);
    }
    throw new Error(`Timed out waiting for ${context} on Nile.`);
  }

  async function loadMyDeals() {
    if (!contract || !walletAddress) {
      return [];
    }
    const idsRaw = await contract.getMyDeals(walletAddress).call();
    const ids = Array.from(idsRaw as ArrayLike<unknown>).map((value) => Number(String(value)));
    const uniqueIds = [...new Set(ids)].sort((a, b) => b - a);
    const deals = await Promise.all(uniqueIds.map((dealId) => refreshDeal(dealId)));
    return deals.filter(Boolean) as Deal[];
  }

  async function approveIfNeeded(tokenAddress: string, amount: bigint, action: DealActivity["action"], dealId: number) {
    const token = getTokenByAddress(tokenAddress);
    if (!token || token.kind !== "trc20") {
      return;
    }

    const tokenContract = await window.tronWeb.contract(trc20Abi as any, tokenAddress);
    const allowance = BigInt(String(await tokenContract.allowance(walletAddress, OTC_SETTLEMENT_ADDRESS).call()));
    if (allowance >= amount) {
      return;
    }

    const txHash = await tokenContract.approve(OTC_SETTLEMENT_ADDRESS, amount.toString()).send({ feeLimit: DEFAULT_FEE_LIMIT });
    await waitForTransactionSuccess(String(txHash), "token approval");
    upsertActivity(dealId, {
      action,
      txHash: String(txHash),
      timestamp: new Date().toISOString(),
      label: `Approval for ${token.symbol}`
    });
  }

  async function runAction<T>(context: string, fn: () => Promise<T>) {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      const normalized = humanizeTronError(err, context);
      setError(normalized);
      throw normalized;
    } finally {
      setLoading(false);
    }
  }

  function actionState(deal: Deal, viewer: string): DealActionState {
    const isPartyA = viewer === deal.partyA;
    const isPartyB = viewer === deal.partyB;
    return {
      needsApproval:
        (isPartyA && deal.tokenA !== TOKENS[0].address && !deal.partyAFunded) ||
        (isPartyB && deal.tokenB !== TOKENS[0].address && !deal.partyBFunded),
      canAccept: isPartyB && deal.status === "Created",
      canFund:
        (isPartyA && deal.status === "Accepted" && !deal.partyAFunded) ||
        (isPartyB && deal.status === "Accepted" && !deal.partyBFunded),
      canConfirm:
        (isPartyA || isPartyB) &&
        deal.status === "BothFunded" &&
        !((isPartyA && deal.partyAConfirmed) || (isPartyB && deal.partyBConfirmed)),
      canExecuteSettlement:
        deal.status === "BothFunded" &&
        deal.partyAConfirmed &&
        deal.partyBConfirmed,
      canDispute: (isPartyA || isPartyB) && (deal.status === "Accepted" || deal.status === "BothFunded"),
      canResolve: deal.status === "Disputed",
      canExpire: ["Created", "Accepted", "BothFunded", "Disputed"].includes(deal.status),
      canCancel: isPartyA && deal.status === "Created"
    };
  }

  async function createDeal(input: CreateDealInput) {
    if (!contract) {
      throw new Error("Contract unavailable");
    }
    return runAction("deal creation", async () => {
      const nextDealId = Number(String(await contract.nextDealId().call()));
      const tokenA = TOKENS.find((token) => token.address === input.tokenA)!;
      const tokenB = TOKENS.find((token) => token.address === input.tokenB)!;
      const txHash = await contract.createDeal(
        tokenA.kind === "native" ? NATIVE_TRX_ADDRESS : tokenA.address,
        toUnits(input.amountA, tokenA).toString(),
        tokenB.kind === "native" ? NATIVE_TRX_ADDRESS : tokenB.address,
        toUnits(input.amountB, tokenB).toString(),
        input.counterparty,
        input.timeoutHours
      ).send({ feeLimit: DEFAULT_FEE_LIMIT });
      await waitForTransactionSuccess(String(txHash), "deal creation");
      upsertActivity(nextDealId, {
        action: "create",
        txHash: String(txHash),
        timestamp: new Date().toISOString(),
        label: "Deal created"
      });
      return { txHash: String(txHash), dealId: nextDealId, explorerUrl: explorerTx(String(txHash)) };
    });
  }

  async function acceptDeal(dealId: number) {
    if (!contract) {
      throw new Error("Contract unavailable");
    }
    return runAction("deal acceptance", async () => {
      const txHash = await contract.acceptDeal(dealId).send({ feeLimit: DEFAULT_FEE_LIMIT });
      upsertActivity(dealId, { action: "accept", txHash: String(txHash), timestamp: new Date().toISOString(), label: "Deal accepted" });
      return String(txHash);
    });
  }

  async function fundDeal(deal: Deal) {
    if (!contract) {
      throw new Error("Contract unavailable");
    }
    return runAction("deal funding", async () => {
      const isPartyA = walletAddress === deal.partyA;
      const tokenAddress = isPartyA ? deal.tokenA : deal.tokenB;
      const amount = BigInt(isPartyA ? deal.amountA : deal.amountB);
      const token = getTokenByAddress(tokenAddress) ?? {
        symbol: "USDT",
        address: tokenAddress,
        decimals: 6,
        label: "External TRC-20",
        kind: tokenAddress === NATIVE_TRX_ADDRESS ? "native" as const : "trc20" as const
      };

      if (token.kind === "trc20") {
        await approveIfNeeded(token.address, amount, isPartyA ? "approve-party-a" : "approve-party-b", deal.id);
      }

      const txHash = await contract.fundDeal(deal.id).send({
        feeLimit: DEFAULT_FEE_LIMIT,
        callValue: token.kind === "native" ? amount.toString() : 0
      });

      upsertActivity(deal.id, {
        action: isPartyA ? "fund-party-a" : "fund-party-b",
        txHash: String(txHash),
        timestamp: new Date().toISOString(),
        label: isPartyA ? "Party A funded escrow" : "Party B funded escrow"
      });
      return String(txHash);
    });
  }

  async function confirmSettlement(deal: Deal) {
    if (!contract) {
      throw new Error("Contract unavailable");
    }
    return runAction("settlement confirmation", async () => {
      const txHash = await contract.confirmSettlement(deal.id).send({ feeLimit: DEFAULT_FEE_LIMIT });
      const isPartyA = walletAddress === deal.partyA;
      try {
        await waitForTransactionSuccess(String(txHash), "settlement confirmation");
      } catch (error) {
        const updated = await waitForDealUpdate(
          deal.id,
          (candidate) => isPartyA ? candidate.partyAConfirmed : candidate.partyBConfirmed,
          45000
        ).catch(() => null);
        if (!updated) {
          console.warn("Settlement confirmation still pending on Nile", {
            dealId: deal.id,
            txHash: String(txHash),
            error
          });
        }
      }
      upsertActivity(deal.id, {
        action: isPartyA ? "confirm-party-a" : "confirm-party-b",
        txHash: String(txHash),
        timestamp: new Date().toISOString(),
        label: isPartyA ? "Party A submitted settlement confirmation" : "Party B submitted settlement confirmation"
      });
      return String(txHash);
    });
  }

  async function executeSettlement(deal: Deal) {
    if (!contract) {
      throw new Error("Contract unavailable");
    }
    return runAction("final settlement", async () => {
      const txHash = await contract.executeSettlement(deal.id).send({ feeLimit: DEFAULT_FEE_LIMIT });
      try {
        await waitForTransactionSuccess(String(txHash), "final settlement");
      } catch (error) {
        const updated = await waitForDealUpdate(
          deal.id,
          (candidate) => candidate.status === "Settled",
          45000
        ).catch(() => null);
        if (!updated) {
          console.warn("Final settlement still pending on Nile", {
            dealId: deal.id,
            txHash: String(txHash),
            error
          });
        }
      }
      upsertActivity(deal.id, {
        action: "execute-settlement",
        txHash: String(txHash),
        timestamp: new Date().toISOString(),
        label: "Settlement finalized on-chain"
      });
      return String(txHash);
    });
  }

  async function raiseDispute(dealId: number, reason: string) {
    if (!contract) {
      throw new Error("Contract unavailable");
    }
    return runAction("dispute filing", async () => {
      const txHash = await contract.raiseDispute(dealId, reason).send({ feeLimit: DEFAULT_FEE_LIMIT });
      upsertActivity(dealId, { action: "dispute", txHash: String(txHash), timestamp: new Date().toISOString(), label: "Dispute raised" });
      return String(txHash);
    });
  }

  async function resolveDispute(dealId: number, refundBoth: boolean) {
    if (!contract) {
      throw new Error("Contract unavailable");
    }
    return runAction("dispute resolution", async () => {
      const txHash = await contract.resolveDispute(dealId, refundBoth).send({ feeLimit: DEFAULT_FEE_LIMIT });
      upsertActivity(dealId, { action: "resolve", txHash: String(txHash), timestamp: new Date().toISOString(), label: refundBoth ? "Dispute resolved with refunds" : "Dispute resolved with forced settlement" });
      return String(txHash);
    });
  }

  async function claimExpired(dealId: number) {
    if (!contract) {
      throw new Error("Contract unavailable");
    }
    return runAction("expiry claim", async () => {
      const txHash = await contract.claimExpired(dealId).send({ feeLimit: DEFAULT_FEE_LIMIT });
      upsertActivity(dealId, { action: "expire", txHash: String(txHash), timestamp: new Date().toISOString(), label: "Deal expired and funds returned" });
      return String(txHash);
    });
  }

  async function cancelDeal(dealId: number) {
    if (!contract) {
      throw new Error("Contract unavailable");
    }
    return runAction("deal cancellation", async () => {
      const txHash = await contract.cancelDeal(dealId).send({ feeLimit: DEFAULT_FEE_LIMIT });
      upsertActivity(dealId, { action: "cancel", txHash: String(txHash), timestamp: new Date().toISOString(), label: "Deal cancelled" });
      return String(txHash);
    });
  }

  return {
    contractAddress: OTC_SETTLEMENT_ADDRESS,
    error,
    loading,
    loadMyDeals,
    refreshDeal,
    createDeal,
    acceptDeal,
    fundDeal,
    confirmSettlement,
    executeSettlement,
    raiseDispute,
    resolveDispute,
    claimExpired,
    cancelDeal,
    actionState,
    getDealActivity: getActivity
    ,
    waitForDealUpdate
  };
}
