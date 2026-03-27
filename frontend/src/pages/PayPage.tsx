import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { completePayment, fetchQuote, getPayment } from "../lib/api";
import { connectWallet, loadBalances, simulateOrSendIntentExecution } from "../lib/tron";
import { FailureHints } from "../components/FailureHints";
import { ReceiptCard } from "../components/ReceiptCard";
import type { Payment, Receipt, RouteQuote, WalletAsset } from "../types";

export function PayPage() {
  const { id = "" } = useParams();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [quote, setQuote] = useState<RouteQuote | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const p = await getPayment(id);
        setPayment(p);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onAnalyzeWallet() {
    setError("");
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
      const balances = await loadBalances();
      setAssets(balances);
      if (!payment) return;
      const q = await fetchQuote(payment.amountUsdt, balances);
      setQuote(q);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onPay() {
    if (!payment || !quote) return;
    setError("");
    try {
      const fallbackId = Number(payment.id.replace(/\D/g, "")) || 0;
      const txHash = await simulateOrSendIntentExecution({
        requestId: String(payment.onchainRequestId ?? fallbackId),
        amountUsdt: payment.amountUsdt,
        maxTotalInputValueUsdt: payment.amountUsdt + quote.totalFeeUsdt + quote.slippageBufferUsdt,
        quoteLegs: quote.legs.map((l) => ({ token: l.token, amountIn: l.amountIn }))
      });
      const r: Receipt = {
        amountUsdt: payment.amountUsdt,
        assetsUsed: quote.legs,
        totalFeeUsdt: quote.totalFeeUsdt,
        txHash,
        paidAt: new Date().toISOString()
      };
      setReceipt(r);
      await completePayment(payment.id, txHash, r);
      setPayment({ ...payment, status: "paid", txHash, receipt: r });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const canPay = useMemo(() => payment?.status === "pending" && quote !== null, [payment, quote]);

  if (loading) return <div className="container"><p>Loading payment...</p></div>;
  if (!payment) return <div className="container"><p>Payment not found.</p></div>;

  return (
    <div className="container">
      <h1>TRON PayFlow Checkout</h1>
      <div className="card">
        <p><strong>Merchant:</strong> {payment.merchantAddress}</p>
        <p><strong>Reference:</strong> {payment.label}</p>
        <p><strong>Amount Due:</strong> {payment.amountUsdt.toFixed(2)} USDT</p>
        <p><strong>Status:</strong> {payment.status}</p>
      </div>

      <div className="card">
        <h3>Step 1: Analyze Wallet</h3>
        <button onClick={onAnalyzeWallet}>Connect + Compute Best Route</button>
        {walletAddress && <p>Connected wallet: {walletAddress}</p>}
        {assets.length > 0 && (
          <ul>
            {assets.map((a) => (
              <li key={a.token}>{a.symbol}: {a.balance.toFixed(4)}</li>
            ))}
          </ul>
        )}
      </div>

      {quote && (
        <div className="card">
          <h3>Step 2: Suggested Payment Method</h3>
          <p>Total input value: {quote.totalInputValueUsdt.toFixed(4)} USDT</p>
          <p>Estimated fees: {quote.totalFeeUsdt.toFixed(4)} USDT</p>
          <p>Slippage buffer: {quote.slippageBufferUsdt.toFixed(4)} USDT</p>
          <ul>
            {quote.legs.map((leg) => (
              <li key={`${leg.token}-${leg.amountIn}`}>
                {leg.symbol}: {leg.amountIn.toFixed(4)} {"->"} {leg.netUsdt.toFixed(4)} USDT (fee {leg.feeUsdt.toFixed(4)})
              </li>
            ))}
          </ul>
          <button disabled={!canPay} onClick={onPay}>Pay in One Click</button>
        </div>
      )}

      {error && <FailureHints reason={error} />}
      {receipt && <ReceiptCard receipt={receipt} />}
    </div>
  );
}
