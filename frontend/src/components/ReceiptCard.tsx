import type { Receipt } from "../types";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  return (
    <div className="card">
      <h3>Payment Receipt</h3>
      <p>Amount settled: {receipt.amountUsdt.toFixed(2)} USDT</p>
      <p>Total fee: {receipt.totalFeeUsdt.toFixed(4)} USDT</p>
      <p>Tx hash: {receipt.txHash}</p>
      <p>Paid at: {receipt.paidAt}</p>
      <h4>Assets Used</h4>
      <ul>
        {receipt.assetsUsed.map((leg) => (
          <li key={`${leg.token}-${leg.amountIn}`}>
            {leg.symbol}: {leg.amountIn.toFixed(4)} ({leg.netUsdt.toFixed(4)} USDT net)
          </li>
        ))}
      </ul>
      <button onClick={() => downloadJson(`receipt-${receipt.txHash}.json`, receipt)}>Download JSON Receipt</button>
    </div>
  );
}
