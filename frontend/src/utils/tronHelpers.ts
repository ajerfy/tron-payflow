import type { AppError, Deal, DealStatus, TokenOption } from "../types";
import { NATIVE_TRX_ADDRESS, NILE_TRONSCAN_BASE, TOKENS } from "./constants";

function normalizeAddress(address: unknown) {
  const raw = String(address ?? "");
  if (!raw) {
    return raw;
  }
  if (raw === NATIVE_TRX_ADDRESS || raw === `0x${NATIVE_TRX_ADDRESS}`) {
    return NATIVE_TRX_ADDRESS;
  }
  if (raw.startsWith("T")) {
    return raw;
  }
  if (raw.startsWith("41") && typeof window !== "undefined" && window.tronWeb?.address?.fromHex) {
    return window.tronWeb.address.fromHex(raw);
  }
  if (raw.startsWith("0x41") && typeof window !== "undefined" && window.tronWeb?.address?.fromHex) {
    return window.tronWeb.address.fromHex(raw.slice(2));
  }
  return raw;
}

export function toUnits(amount: string, token: TokenOption) {
  const [whole = "0", fraction = ""] = amount.split(".");
  const paddedFraction = `${fraction}${"0".repeat(token.decimals)}`.slice(0, token.decimals);
  return BigInt(`${whole}${paddedFraction}`);
}

export function explorerTx(txHash: string) {
  return `${NILE_TRONSCAN_BASE}/transaction/${txHash}`;
}

export function explorerAddress(address: string) {
  return `${NILE_TRONSCAN_BASE}/address/${address}`;
}

export function getTokenByAddress(address: string) {
  return TOKENS.find((token) =>
    token.address === address ||
    (address === "TRX" && token.symbol === "TRX") ||
    (address === NATIVE_TRX_ADDRESS && token.symbol === "TRX")
  );
}

export function normalizeStatus(statusValue: unknown): DealStatus {
  const raw = Number(String(statusValue));
  return ["Created", "Accepted", "BothFunded", "Settled", "Disputed", "Resolved", "Expired", "Cancelled"][raw] as DealStatus;
}

export function normalizeDeal(raw: any): Deal {
  return {
    id: Number(raw.id ?? raw[0] ?? 0),
    partyA: normalizeAddress(raw.partyA ?? raw[1] ?? ""),
    partyB: normalizeAddress(raw.partyB ?? raw[2] ?? ""),
    tokenA: normalizeAddress(raw.tokenA ?? raw[3] ?? ""),
    amountA: String(raw.amountA ?? raw[4] ?? "0"),
    tokenB: normalizeAddress(raw.tokenB ?? raw[5] ?? ""),
    amountB: String(raw.amountB ?? raw[6] ?? "0"),
    status: normalizeStatus(raw.status ?? raw[7] ?? 0),
    createdAt: Number(raw.createdAt ?? raw[8] ?? 0),
    expiresAt: Number(raw.expiresAt ?? raw[9] ?? 0),
    partyAFunded: Boolean(raw.partyAFunded ?? raw[10]),
    partyBFunded: Boolean(raw.partyBFunded ?? raw[11]),
    partyAConfirmed: Boolean(raw.partyAConfirmed ?? raw[12]),
    partyBConfirmed: Boolean(raw.partyBConfirmed ?? raw[13]),
    disputeReason: String(raw.disputeReason ?? raw[14] ?? ""),
    settledAt: Number(raw.settledAt ?? raw[15] ?? 0)
  };
}

export function humanizeTronError(error: unknown, context = "transaction"): AppError {
  const message = String((error as Error)?.message ?? error).toLowerCase();

  if (message.includes("user rejected") || message.includes("cancel")) {
    return {
      title: "Transaction cancelled",
      message: "Transaction cancelled. No funds were moved.",
      suggestion: "Retry when both parties are ready to sign."
    };
  }
  if (message.includes("balance")) {
    return {
      title: "Insufficient token balance",
      message: "You do not have enough tokens for this step.",
      suggestion: "Lower the amount or top up the wallet before retrying."
    };
  }
  if (message.includes("allowance") || message.includes("approve")) {
    return {
      title: "Token approval required",
      message: "This deal needs a TRC-20 approval before funding.",
      suggestion: "Approve token spending first, then click fund again."
    };
  }
  if (message.includes("energy") || message.includes("bandwidth")) {
    return {
      title: "Not enough TRX for energy/bandwidth",
      message: "TRON needs TRX balance for execution resources.",
      suggestion: "Top up TRX or freeze TRX for energy, then retry."
    };
  }
  if (message.includes("network") || message.includes("connection")) {
    return {
      title: "TRON network error",
      message: "Could not connect to the TRON Nile network.",
      suggestion: "Check TronLink, confirm Nile is selected, and retry."
    };
  }
  if (message.includes("expired")) {
    return {
      title: "Deal expired",
      message: "This deal has already expired.",
      suggestion: "Claim expiry or create a new deal."
    };
  }

  return {
    title: `Could not complete ${context}`,
    message: String((error as Error)?.message ?? error),
    suggestion: "Retry the action after refreshing the deal state."
  };
}
