import { useEffect, useState } from "react";
import { TOKENS } from "../utils/constants";
import type { AppError, WalletBalance } from "../types";
import { humanizeTronError } from "../utils/tronHelpers";

declare global {
  interface Window {
    tronWeb?: any;
    tronLink?: { request: (args: { method: string }) => Promise<unknown> };
  }
}

const trc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
];

export function useTronWeb() {
  const [address, setAddress] = useState("");
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  async function refreshBalances(currentAddress = address) {
    if (!window.tronWeb?.defaultAddress?.base58 || !currentAddress) {
      return;
    }

    try {
      const trxSun = await window.tronWeb.trx.getBalance(currentAddress);
      const nextBalances: WalletBalance[] = [
        { symbol: "TRX", formatted: Number(trxSun) / 1_000_000, raw: String(trxSun) }
      ];

      const tokenBalances = await Promise.all(TOKENS.filter((entry) => entry.kind === "trc20").map(async (token) => {
        const tokenContract = await window.tronWeb.contract(trc20Abi as any, token.address);
        const raw = await tokenContract.balanceOf(currentAddress).call();
        return {
          symbol: token.symbol,
          formatted: Number(String(raw ?? 0)) / 10 ** token.decimals,
          raw: String(raw ?? 0)
        } satisfies WalletBalance;
      }));

      nextBalances.push(...tokenBalances);

      setBalances(nextBalances);
    } catch (err) {
      setError(humanizeTronError(err, "balance refresh"));
    }
  }

  async function connect() {
    setIsConnecting(true);
    setError(null);
    try {
      if (!window.tronLink) {
        throw new Error("TronLink not found");
      }
      await window.tronLink.request({ method: "tron_requestAccounts" });
      const nextAddress = window.tronWeb?.defaultAddress?.base58;
      if (!nextAddress) {
        throw new Error("Wallet not connected");
      }
      setAddress(nextAddress);
      setIsReady(true);
      await refreshBalances(nextAddress);
    } catch (err) {
      setError(humanizeTronError(err, "wallet connection"));
    } finally {
      setIsConnecting(false);
    }
  }

  useEffect(() => {
    if (window.tronWeb?.defaultAddress?.base58) {
      const current = window.tronWeb.defaultAddress.base58;
      setAddress(current);
      setIsReady(true);
      void refreshBalances(current);
    }
  }, []);

  return {
    address,
    balances,
    error,
    isReady,
    isConnecting,
    connect,
    refreshBalances
  };
}
