import { makeReceiptSummary } from "../utils/formatters";
import { explorerTx } from "../utils/tronHelpers";
import type { Deal, DealActivity } from "../types";
import { formatAmount, formatDate } from "../utils/formatters";

function downloadReceipt(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function SettlementReceipt({ deal, activity }: { deal: Deal; activity: DealActivity[] }) {
  const summary = makeReceiptSummary({
    dealId: deal.id,
    partyA: deal.partyA,
    partyB: deal.partyB,
    assetA: formatAmount(deal.amountA, deal.tokenA),
    assetB: formatAmount(deal.amountB, deal.tokenB),
    settledAt: deal.settledAt,
    txHashes: activity.map((entry) => entry.txHash)
  });

  return (
    <section className="panel">
      <div className="row spread">
        <h3>Settlement Receipt</h3>
        <button onClick={() => navigator.clipboard.writeText(summary)}>Share Receipt</button>
      </div>
      <p><strong>Deal:</strong> #{deal.id}</p>
      <p><strong>Parties:</strong> {deal.partyA} ↔ {deal.partyB}</p>
      <p><strong>Assets exchanged:</strong> {formatAmount(deal.amountA, deal.tokenA)} for {formatAmount(deal.amountB, deal.tokenB)}</p>
      <p><strong>Settled at:</strong> {formatDate(deal.settledAt)}</p>
      <ul className="stack-list">
        {activity.map((entry) => (
          <li key={`${entry.action}-${entry.txHash}`}>
            <span>{entry.label}</span>
            <a className="mono" href={explorerTx(entry.txHash)} target="_blank" rel="noreferrer">{entry.txHash.slice(0, 18)}...</a>
          </li>
        ))}
      </ul>
      <button onClick={() => downloadReceipt(`otc-settlement-${deal.id}.txt`, summary)}>Download Receipt</button>
    </section>
  );
}
