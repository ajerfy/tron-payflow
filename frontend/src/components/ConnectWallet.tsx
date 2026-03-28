import type { WalletBalance } from "../types";
import { truncateAddress } from "../utils/formatters";

type Props = {
  address: string;
  balances: WalletBalance[];
  isConnecting: boolean;
  onConnect: () => void;
};

export function ConnectWallet({ address, balances, isConnecting, onConnect }: Props) {
  return (
    <section className="hero-grid">
      <div className="panel">
        <p className="eyebrow">Instant OTC Settlement Layer</p>
        <h1>Atomic OTC escrow on TRON Nile.</h1>
        <p className="hero-copy">
          Create bilateral deals, fund both sides into escrow, and settle or resolve disputes with verifiable on-chain
          actions instead of trust-based chat workflows.
        </p>
        <div className="row">
          <button className="primary-button" onClick={onConnect} disabled={isConnecting}>
            {address ? "Reconnect wallet" : "Connect TronLink"}
          </button>
        </div>
        <p className="muted">
          No TronLink? Install the browser extension, switch to Nile testnet, and request TRX plus USDT from the faucet.
        </p>
      </div>

      <div className="panel">
        <h3>Wallet Overview</h3>
        <p><strong>Connected:</strong> <span className="mono">{truncateAddress(address)}</span></p>
        <ul className="stack-list">
          {balances.length === 0 ? <li>No balances loaded yet.</li> : balances.map((balance) => (
            <li key={balance.symbol}>
              <span>{balance.symbol}</span>
              <strong className="mono">{balance.formatted.toFixed(balance.symbol === "TRX" ? 3 : 2)}</strong>
            </li>
          ))}
        </ul>
        <p className="muted">TRON uses energy and bandwidth instead of gas. Keep extra TRX available before every write action.</p>
      </div>
    </section>
  );
}
