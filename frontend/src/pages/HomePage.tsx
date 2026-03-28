import { useEffect, useState } from "react";
import { ConnectWallet } from "../components/ConnectWallet";
import { Dashboard } from "../components/Dashboard";
import { ErrorMessage } from "../components/ErrorMessage";
import { useContract } from "../hooks/useContract";
import { useTronWeb } from "../hooks/useTronWeb";
import type { Deal } from "../types";

export function HomePage() {
  const { address, balances, error: walletError, connect, isConnecting, isReady, refreshBalances } = useTronWeb();
  const { error: contractError, loadMyDeals, createDeal } = useContract(address);
  const [deals, setDeals] = useState<Deal[]>([]);

  async function refreshDeals() {
    if (!address) {
      return;
    }
    const [nextDeals] = await Promise.all([
      loadMyDeals(),
      refreshBalances(address)
    ]);
    setDeals(nextDeals);
  }

  useEffect(() => {
    if (isReady && address) {
      void refreshDeals();
    }
  }, [isReady, address]);

  return (
    <div className="page-shell">
      <ConnectWallet address={address} balances={balances} isConnecting={isConnecting} onConnect={connect} />
      <ErrorMessage error={walletError ?? contractError} />
      {address ? <Dashboard deals={deals} walletAddress={address} onCreate={async (input) => {
        await createDeal(input);
        await refreshDeals();
      }} /> : null}
    </div>
  );
}
