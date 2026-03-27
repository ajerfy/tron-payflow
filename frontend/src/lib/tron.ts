import type { WalletAsset } from "../types";

declare global {
  interface Window {
    tronWeb?: any;
    tronLink?: { request: (args: { method: string }) => Promise<unknown> };
  }
}

const demoMode = (import.meta.env.VITE_DEMO_MODE ?? "true") === "true";
const paymentProcessor = import.meta.env.VITE_PAYMENT_PROCESSOR ?? "";
const usdtAddress = import.meta.env.VITE_USDT ?? "";
const defaultDeadlineSeconds = Number(import.meta.env.VITE_PAYMENT_DEADLINE_SECONDS ?? 900);
const feeLimitSun = Number(import.meta.env.VITE_FEE_LIMIT_SUN ?? 120000000);

const trc20Abi = [
  {
    constant: true,
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function"
  },
  {
    constant: false,
    inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  }
];

const paymentProcessorAbi = [
  {
    name: "requestCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "createPaymentRequest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountUsdt", type: "uint256" },
      { name: "merchantRef", type: "string" }
    ],
    outputs: [{ name: "requestId", type: "uint256" }]
  },
  {
    name: "executeIntentPayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestId", type: "uint256" },
      {
        name: "assets",
        type: "tuple[]",
        components: [
          { name: "token", type: "address" },
          { name: "amountInMax", type: "uint256" }
        ]
      },
      { name: "maxTotalInputValueUsdt", type: "uint256" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: []
  }
];

type ConfigAsset = {
  token: string;
  symbol: string;
  decimals: number;
  usdtRate: number;
  feeBps: number;
};

function parseConfiguredAssets(): ConfigAsset[] {
  const raw = import.meta.env.VITE_SUPPORTED_ASSETS_JSON;
  if (!raw) {
    return [
      { token: "TRX", symbol: "TRX", decimals: 6, usdtRate: 0.11, feeBps: 30 },
      { token: "TJST_TOKEN_PLACEHOLDER", symbol: "JST", decimals: 18, usdtRate: 0.19, feeBps: 35 },
      { token: "TSUN_TOKEN_PLACEHOLDER", symbol: "SUN", decimals: 18, usdtRate: 0.14, feeBps: 40 }
    ];
  }
  return JSON.parse(raw) as ConfigAsset[];
}

function toUnits(amount: number, decimals: number): bigint {
  const scaled = Math.floor(amount * 10 ** Math.min(decimals, 6)) * 10 ** Math.max(decimals - 6, 0);
  return BigInt(scaled);
}

export async function connectWallet() {
  if (demoMode) return { address: "TDEMO_WALLET_ADDRESS" };
  if (!window.tronLink) throw new Error("TronLink not found");
  await window.tronLink.request({ method: "tron_requestAccounts" });
  if (!window.tronWeb?.defaultAddress?.base58) throw new Error("Wallet not connected");
  return { address: window.tronWeb.defaultAddress.base58 };
}

export async function createOnchainPaymentRequest(amountUsdt: number, label: string): Promise<number | undefined> {
  if (demoMode) return undefined;
  if (!window.tronWeb || !paymentProcessor) throw new Error("Wallet or processor config missing");
  const tronWeb = window.tronWeb;
  const contract = await tronWeb.contract(paymentProcessorAbi as any, paymentProcessor);
  const requestCountRaw = await contract.requestCount().call();
  const requestId = Number(requestCountRaw.toString());
  const amount = Math.floor(amountUsdt * 1_000_000).toString();
  await contract.createPaymentRequest(amount, label).send({ feeLimit: feeLimitSun });
  return requestId;
}

export async function loadBalances(): Promise<WalletAsset[]> {
  if (demoMode) {
    return [
      { token: "TRX", symbol: "TRX", balance: 820, usdtRate: 0.11, feeBps: 30 },
      { token: "JST", symbol: "JST", balance: 320, usdtRate: 0.19, feeBps: 35 },
      { token: "SUN", symbol: "SUN", balance: 150, usdtRate: 0.14, feeBps: 40 }
    ];
  }

  const tronWeb = window.tronWeb;
  if (!tronWeb?.defaultAddress?.base58) throw new Error("Wallet not connected");
  const wallet = tronWeb.defaultAddress.base58;
  const assets = parseConfiguredAssets();

  const balances: WalletAsset[] = [];
  for (const a of assets) {
    if (a.token === "TRX") {
      const sun = await tronWeb.trx.getBalance(wallet);
      balances.push({ token: "TRX", symbol: "TRX", balance: sun / 1_000_000, usdtRate: a.usdtRate, feeBps: a.feeBps });
      continue;
    }

    if (!a.token.startsWith("T")) continue;
    const tokenContract = await tronWeb.contract(trc20Abi as any, a.token);
    const raw = await tokenContract.balanceOf(wallet).call();
    const balance = Number(raw.toString()) / 10 ** a.decimals;
    balances.push({ token: a.token, symbol: a.symbol, balance, usdtRate: a.usdtRate, feeBps: a.feeBps });
  }

  return balances.filter((b) => b.balance > 0);
}

export async function simulateOrSendIntentExecution(params: {
  requestId: string;
  amountUsdt: number;
  maxTotalInputValueUsdt: number;
  quoteLegs: Array<{ token: string; amountIn: number }>;
}): Promise<string> {
  if (demoMode) return `SIM_TX_${Date.now()}`;
  if (!window.tronWeb) throw new Error("TronWeb unavailable");
  if (!paymentProcessor || !usdtAddress) throw new Error("Missing contract env vars");
  const tronWeb = window.tronWeb;

  const configured = parseConfiguredAssets();
  const decimalsByToken = new Map(configured.map((a) => [a.token, a.decimals]));

  const assets = params.quoteLegs.map((leg) => {
    if (!leg.token.startsWith("T")) {
      throw new Error("Live mode requires TRC-20 token addresses (use WTRX instead of native TRX).");
    }
    const decimals = decimalsByToken.get(leg.token) ?? 6;
    return { token: leg.token, amountInMax: toUnits(leg.amountIn, decimals).toString() };
  });

  // Pre-approvals for TRC-20 assets used in route.
  for (const leg of params.quoteLegs) {
    if (leg.token === "TRX") continue;
    const decimals = decimalsByToken.get(leg.token) ?? 6;
    const amount = toUnits(leg.amountIn, decimals).toString();
    const tokenContract = await tronWeb.contract(trc20Abi as any, leg.token);
    await tokenContract.approve(paymentProcessor, amount).send({ feeLimit: feeLimitSun });
  }

  const contract = await tronWeb.contract(paymentProcessorAbi as any, paymentProcessor);
  const deadline = Math.floor(Date.now() / 1000) + defaultDeadlineSeconds;
  const maxInput = Math.ceil(params.maxTotalInputValueUsdt * 1_000_000).toString();

  // Dry-run simulation for user-facing failure hints.
  try {
    await contract.executeIntentPayment(params.requestId, assets, maxInput, deadline).call();
  } catch (err) {
    const message = String(err);
    if (message.toLowerCase().includes("energy")) throw new Error("Out of Energy/Bandwidth");
    if (message.toLowerCase().includes("slippage")) throw new Error("Slippage exceeded");
    if (message.toLowerCase().includes("liquidity")) throw new Error("Insufficient liquidity");
    throw new Error("Simulation failed before execution");
  }

  const txId = await contract.executeIntentPayment(params.requestId, assets, maxInput, deadline).send({
    feeLimit: feeLimitSun,
    shouldPollResponse: false
  });
  return String(txId);
}
