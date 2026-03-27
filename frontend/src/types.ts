export type Payment = {
  id: string;
  merchantAddress: string;
  amountUsdt: number;
  label: string;
  onchainRequestId?: number;
  status: "pending" | "paid" | "failed";
  txHash?: string;
  createdAt: string;
  receipt?: Receipt;
};

export type WalletAsset = {
  token: string;
  symbol: string;
  balance: number;
  usdtRate: number;
  feeBps: number;
};

export type RouteLeg = {
  token: string;
  symbol: string;
  amountIn: number;
  netUsdt: number;
  feeUsdt: number;
};

export type RouteQuote = {
  ok: true;
  amountUsdt: number;
  totalFeeUsdt: number;
  totalInputValueUsdt: number;
  slippageBufferUsdt: number;
  legs: RouteLeg[];
};

export type Receipt = {
  amountUsdt: number;
  assetsUsed: RouteLeg[];
  totalFeeUsdt: number;
  txHash: string;
  paidAt: string;
};
