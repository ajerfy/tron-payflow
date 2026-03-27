import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPayment, getMerchantPayments } from "../lib/api";
import { createOnchainPaymentRequest } from "../lib/tron";
import type { Payment } from "../types";

export function MerchantPage() {
  const [merchantAddress, setMerchantAddress] = useState("TMERCHANT_DEMO_ADDR");
  const [amount, setAmount] = useState(50);
  const [label, setLabel] = useState("Invoice #1001");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newLink, setNewLink] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function refresh() {
    try {
      setPayments(await getMerchantPayments(merchantAddress));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const stats = useMemo(() => {
    return {
      paid: payments.filter((p) => p.status === "paid").length,
      pending: payments.filter((p) => p.status === "pending").length,
      failed: payments.filter((p) => p.status === "failed").length,
      total: payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountUsdt, 0)
    };
  }, [payments]);

  async function onCreate() {
    setError("");
    try {
      const onchainRequestId = await createOnchainPaymentRequest(amount, label);
      const { paymentLink } = await createPayment(merchantAddress, amount, label, onchainRequestId);
      setNewLink(paymentLink);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(payments, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "merchant-reconciliation.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container">
      <h1>Merchant Dashboard</h1>
      <div className="card">
        <h3>Create Payment Request</h3>
        <input value={merchantAddress} onChange={(e) => setMerchantAddress(e.target.value)} placeholder="Merchant address" />
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="USDT amount" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Reference label" />
        <button onClick={onCreate}>Create Payment Link</button>
        {newLink && <p>New link: <Link to={newLink}>{newLink}</Link></p>}
      </div>

      <div className="row">
        <div className="stat">Paid: {stats.paid}</div>
        <div className="stat">Pending: {stats.pending}</div>
        <div className="stat">Failed: {stats.failed}</div>
        <div className="stat">Total received: {stats.total.toFixed(2)} USDT</div>
      </div>

      <div className="card">
        <h3>Reconciliation Log</h3>
        <button onClick={exportJson}>Export JSON</button>
        <ul>
          {payments.map((p) => (
            <li key={p.id}>
              {p.label} - {p.amountUsdt} USDT - {p.status} {p.txHash ? `- ${p.txHash}` : ""} - <Link to={`/pay/${p.id}`}>open</Link>
            </li>
          ))}
        </ul>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
