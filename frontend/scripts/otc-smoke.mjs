import TronWebModule from "tronweb";
import otcAbi from "../src/abi/OTCSettlement.json" with { type: "json" };

const { TronWeb } = TronWebModule;

const fullHost = process.env.TRON_FULL_HOST ?? "https://nile.trongrid.io";
const otcSettlement = process.env.VITE_OTC_SETTLEMENT ?? process.env.OTC_SETTLEMENT ?? "TB59phmMjh4RCKcyKfkYHNicZ87kLvpjGZ";
const usdt = process.env.VITE_USDT ?? process.env.USDT ?? "THU5ZDKVGjcw5RGTXJVRRQwNGLPaMnbZUQ";
const feeLimit = Number(process.env.FEE_LIMIT_SUN ?? 200_000_000);
const partyAKey = process.env.PARTY_A_PRIVATE_KEY_NILE;
const partyBKey = process.env.PARTY_B_PRIVATE_KEY_NILE;

if (!partyAKey || !partyBKey) {
  console.error("Missing PARTY_A_PRIVATE_KEY_NILE or PARTY_B_PRIVATE_KEY_NILE.");
  process.exit(1);
}

const partyAToken = (process.env.DEAL_A_TOKEN ?? "TRX").toUpperCase();
const partyBToken = (process.env.DEAL_B_TOKEN ?? "TRX").toUpperCase();
const partyAAmount = Number(process.env.DEAL_A_AMOUNT ?? "1");
const partyBAmount = Number(process.env.DEAL_B_AMOUNT ?? "1");
const timeoutHours = Number(process.env.DEAL_TIMEOUT_HOURS ?? "6");

function tokenConfig(symbol) {
  if (symbol === "TRX") {
    return { address: "410000000000000000000000000000000000000000", decimals: 6, symbol };
  }
  if (symbol === "USDT") {
    return { address: usdt, decimals: 6, symbol };
  }
  throw new Error(`Unsupported token ${symbol}`);
}

function toUnits(amount, decimals) {
  return BigInt(Math.round(amount * 10 ** decimals)).toString();
}

async function createClient(privateKey) {
  return new TronWeb({
    fullHost,
    privateKey
  });
}

async function approveIfNeeded(client, ownerBase58, tokenAddress, amountRaw) {
  if (tokenAddress === "410000000000000000000000000000000000000000") {
    return null;
  }

  const tokenAbi = [
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

  const token = await client.contract(tokenAbi, tokenAddress);
  const allowance = BigInt(String(await token.allowance(ownerBase58, otcSettlement).call()));
  if (allowance >= BigInt(amountRaw)) {
    return null;
  }

  return token.approve(otcSettlement, amountRaw).send({ feeLimit });
}

async function waitForReceipt(client, txId, label, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const info = await client.trx.getTransactionInfo(txId);
    if (info && Object.keys(info).length > 0) {
      const result = String(info.receipt?.result ?? "");
      if (result === "SUCCESS") {
        return info;
      }
      if (result && result !== "SUCCESS") {
        throw new Error(`${label} failed on-chain (${result})`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function waitForCondition(label, predicate, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const done = await predicate();
    if (done) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function main() {
  const clientA = await createClient(partyAKey);
  const clientB = await createClient(partyBKey);
  const addressA = clientA.address.fromPrivateKey(partyAKey);
  const addressB = clientB.address.fromPrivateKey(partyBKey);

  const contractA = await clientA.contract(otcAbi, otcSettlement);
  const contractB = await clientB.contract(otcAbi, otcSettlement);

  const tokenA = tokenConfig(partyAToken);
  const tokenB = tokenConfig(partyBToken);
  const amountA = toUnits(partyAAmount, tokenA.decimals);
  const amountB = toUnits(partyBAmount, tokenB.decimals);

  const nextDealId = Number(String(await contractA.nextDealId().call()));
  const createTx = await contractA.createDeal(
    tokenA.address,
    amountA,
    tokenB.address,
    amountB,
    addressB,
    timeoutHours
  ).send({ feeLimit });
  console.log("createDeal:submitted", { dealId: nextDealId, tx: createTx });
  try {
    await waitForReceipt(clientA, createTx, "createDeal");
  } catch (error) {
    await waitForCondition("createDeal state update", async () => {
      const currentDealId = Number(String(await contractA.nextDealId().call()));
      return currentDealId > nextDealId;
    });
  }
  console.log("createDeal", { dealId: nextDealId, tx: createTx, partyA: addressA, partyB: addressB });

  const acceptTx = await contractB.acceptDeal(nextDealId).send({ feeLimit });
  console.log("acceptDeal:submitted", { tx: acceptTx });
  try {
    await waitForReceipt(clientB, acceptTx, "acceptDeal");
  } catch (error) {
    await waitForCondition("acceptDeal state update", async () => {
      const next = await contractA.getDeal(nextDealId).call();
      const status = Number(String(next.status ?? next[7]));
      return status >= 1;
    });
  }
  console.log("acceptDeal", { tx: acceptTx });

  const approveATx = await approveIfNeeded(clientA, addressA, tokenA.address, amountA);
  if (approveATx) {
    console.log("approveA:submitted", { tx: approveATx });
    await waitForReceipt(clientA, approveATx, "approve A");
    console.log("approveA", { tx: approveATx });
  }
  const fundATx = await contractA.fundDeal(nextDealId).send({
    feeLimit,
    callValue: tokenA.symbol === "TRX" ? amountA : 0
  });
  console.log("fundA:submitted", { tx: fundATx });
  try {
    await waitForReceipt(clientA, fundATx, "fund A");
  } catch (error) {
    await waitForCondition("fund A state update", async () => {
      const next = await contractA.getDeal(nextDealId).call();
      return Boolean(next.partyAFunded ?? next[10]);
    });
  }
  console.log("fundA", { tx: fundATx });

  const approveBTx = await approveIfNeeded(clientB, addressB, tokenB.address, amountB);
  if (approveBTx) {
    console.log("approveB:submitted", { tx: approveBTx });
    await waitForReceipt(clientB, approveBTx, "approve B");
    console.log("approveB", { tx: approveBTx });
  }
  const fundBTx = await contractB.fundDeal(nextDealId).send({
    feeLimit,
    callValue: tokenB.symbol === "TRX" ? amountB : 0
  });
  console.log("fundB:submitted", { tx: fundBTx });
  try {
    await waitForReceipt(clientB, fundBTx, "fund B");
  } catch (error) {
    await waitForCondition("fund B state update", async () => {
      const next = await contractA.getDeal(nextDealId).call();
      return Boolean(next.partyBFunded ?? next[11]);
    });
  }
  console.log("fundB", { tx: fundBTx });

  const confirmATx = await contractA.confirmSettlement(nextDealId).send({ feeLimit });
  console.log("confirmA:submitted", { tx: confirmATx });
  try {
    await waitForReceipt(clientA, confirmATx, "confirm A");
  } catch (error) {
    await waitForCondition("confirm A state update", async () => {
      const next = await contractA.getDeal(nextDealId).call();
      return Boolean(next.partyAConfirmed ?? next[12]) || Number(String(next.status ?? next[7])) === 3;
    });
  }
  console.log("confirmA", { tx: confirmATx });

  const confirmBTx = await contractB.confirmSettlement(nextDealId).send({ feeLimit });
  console.log("confirmB:submitted", { tx: confirmBTx });
  try {
    await waitForReceipt(clientB, confirmBTx, "confirm B");
  } catch (error) {
    await waitForCondition("confirm B state update", async () => {
      const next = await contractA.getDeal(nextDealId).call();
      return Boolean(next.partyBConfirmed ?? next[13]) || Number(String(next.status ?? next[7])) === 3;
    });
  }
  console.log("confirmB", { tx: confirmBTx });

  const finalizeTx = await contractA.executeSettlement(nextDealId).send({ feeLimit });
  console.log("finalize:submitted", { tx: finalizeTx });
  try {
    await waitForReceipt(clientA, finalizeTx, "finalize settlement");
  } catch (error) {
    await waitForCondition("finalize settlement state update", async () => {
      const next = await contractA.getDeal(nextDealId).call();
      return Number(String(next.status ?? next[7])) === 3;
    });
  }
  console.log("finalize", { tx: finalizeTx });

  const finalDeal = await contractA.getDeal(nextDealId).call();
  console.log("finalDeal", {
    id: Number(String(finalDeal.id ?? finalDeal[0])),
    status: Number(String(finalDeal.status ?? finalDeal[7])),
    partyAFunded: Boolean(finalDeal.partyAFunded ?? finalDeal[10]),
    partyBFunded: Boolean(finalDeal.partyBFunded ?? finalDeal[11]),
    partyAConfirmed: Boolean(finalDeal.partyAConfirmed ?? finalDeal[12]),
    partyBConfirmed: Boolean(finalDeal.partyBConfirmed ?? finalDeal[13]),
    settledAt: Number(String(finalDeal.settledAt ?? finalDeal[15]))
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
