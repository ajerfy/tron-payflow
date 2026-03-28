import { Link } from "react-router-dom";
import type { Deal } from "../types";
import { formatAmount, formatDate, truncateAddress } from "../utils/formatters";
import { StatusBadge } from "./StatusBadge";

export function DealCard({ deal, viewer }: { deal: Deal; viewer: string }) {
  const role = viewer === deal.partyA ? "Party A" : viewer === deal.partyB ? "Party B" : "Observer";

  return (
    <article className="panel deal-card">
      <div className="row spread">
        <div>
          <p className="muted">Deal #{deal.id}</p>
          <h3>{formatAmount(deal.amountA, deal.tokenA)} for {formatAmount(deal.amountB, deal.tokenB)}</h3>
        </div>
        <StatusBadge status={deal.status} />
      </div>
      <p className="muted">{role} · Counterparty {truncateAddress(viewer === deal.partyA ? deal.partyB : deal.partyA)}</p>
      <p className="muted">Expires {formatDate(deal.expiresAt)}</p>
      <Link className="text-link" to={`/deals/${deal.id}`}>Open deal detail</Link>
    </article>
  );
}
