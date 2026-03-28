export type TokenSymbol = "TRX" | "USDT";

export type TokenOption = {
  symbol: TokenSymbol;
  address: string;
  decimals: number;
  label: string;
  kind: "native" | "trc20";
};

export type WalletBalance = {
  symbol: TokenSymbol;
  formatted: number;
  raw: string;
};

export type DealStatus =
  | "Created"
  | "Accepted"
  | "BothFunded"
  | "Settled"
  | "Disputed"
  | "Resolved"
  | "Expired"
  | "Cancelled";

export type Deal = {
  id: number;
  partyA: string;
  partyB: string;
  tokenA: string;
  amountA: string;
  tokenB: string;
  amountB: string;
  status: DealStatus;
  createdAt: number;
  expiresAt: number;
  partyAFunded: boolean;
  partyBFunded: boolean;
  partyAConfirmed: boolean;
  partyBConfirmed: boolean;
  disputeReason: string;
  settledAt: number;
};

export type DealActivityAction =
  | "create"
  | "accept"
  | "fund-party-a"
  | "fund-party-b"
  | "confirm-party-a"
  | "confirm-party-b"
  | "execute-settlement"
  | "dispute"
  | "resolve"
  | "expire"
  | "cancel"
  | "approve-party-a"
  | "approve-party-b";

export type DealActivity = {
  action: DealActivityAction;
  txHash: string;
  timestamp: string;
  label: string;
};

export type DealActionState = {
  needsApproval: boolean;
  canAccept: boolean;
  canFund: boolean;
  canConfirm: boolean;
  canExecuteSettlement: boolean;
  canDispute: boolean;
  canResolve: boolean;
  canExpire: boolean;
  canCancel: boolean;
};

export type CreateDealInput = {
  tokenA: string;
  amountA: string;
  tokenB: string;
  amountB: string;
  counterparty: string;
  timeoutHours: number;
};

export type AppError = {
  title: string;
  message: string;
  suggestion?: string;
};
