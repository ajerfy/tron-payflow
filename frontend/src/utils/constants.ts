import type { TokenOption } from "../types";

export const OTC_SETTLEMENT_ADDRESS = import.meta.env.VITE_OTC_SETTLEMENT ?? "TB59phmMjh4RCKcyKfkYHNicZ87kLvpjGZ";
export const NILE_TRONSCAN_BASE = "https://nile.tronscan.org/#";
export const DEFAULT_FEE_LIMIT = Number(import.meta.env.VITE_FEE_LIMIT_SUN ?? 200_000_000);
export const NILE_USDT = import.meta.env.VITE_USDT ?? "THU5ZDKVGjcw5RGTXJVRRQwNGLPaMnbZUQ";
export const NATIVE_TRX_ADDRESS = "410000000000000000000000000000000000000000";

export const TOKENS: TokenOption[] = [
  { symbol: "TRX", address: "TRX", decimals: 6, label: "TRX", kind: "native" },
  { symbol: "USDT", address: NILE_USDT, decimals: 6, label: "USDT", kind: "trc20" }
];

export const STATUS_ORDER = ["Created", "Accepted", "BothFunded", "Settled"] as const;

export const ENERGY_HINTS: Record<string, string> = {
  create: "~12-18 TRX fee limit reserved for deal creation",
  accept: "~6-10 TRX fee limit reserved for accepting",
  fund: "~8-15 TRX fee limit plus any TRC-20 approval",
  confirm: "~6-10 TRX fee limit reserved for confirmation",
  dispute: "~6-10 TRX fee limit reserved for dispute filing",
  resolve: "~8-14 TRX fee limit reserved for dispute resolution",
  expire: "~6-10 TRX fee limit reserved for expiry claim"
};
