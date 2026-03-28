import { useState } from "react";
import type { Deal, DealActivity } from "../types";
import { ENERGY_HINTS, STATUS_ORDER } from "../utils/constants";
import { explorerTx } from "../utils/tronHelpers";
import { formatAmount, formatDate, truncateAddress } from "../utils/formatters";
import { StatusBadge } from "./StatusBadge";
import { SettlementReceipt } from "./SettlementReceipt";

type Props = {
  deal: Deal;
  walletAddress: string;
  activity: DealActivity[];
  isRefreshing: boolean;
  canAccept: boolean;
  canFund: boolean;
  canConfirm: boolean;
  canExecuteSettlement: boolean;
  canDispute: boolean;
  canResolve: boolean;
  canExpire: boolean;
  canCancel: boolean;
  onAccept: () => Promise<void>;
  onFund: () => Promise<void>;
  onConfirm: () => Promise<void>;
  onExecuteSettlement: () => Promise<void>;
  onDispute: (reason: string) => Promise<void>;
  onResolve: (refundBoth: boolean) => Promise<void>;
  onExpire: () => Promise<void>;
  onCancel: () => Promise<void>;
  onRefresh: () => Promise<void>;
};

export function DealDetail(props: Props) {
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeComposer, setShowDisputeComposer] = useState(false);

  const {
    deal,
    walletAddress,
    activity,
    isRefreshing,
    canAccept,
    canFund,
    canConfirm,
    canExecuteSettlement,
    canDispute,
    canResolve,
    canExpire,
    canCancel,
    onAccept,
    onFund,
    onConfirm,
    onExecuteSettlement,
    onDispute,
    onResolve,
    onExpire,
    onCancel,
    onRefresh
  } = props;

  const role = walletAddress === deal.partyA ? "Party A" : walletAddress === deal.partyB ? "Party B" : "Observer";

  return (
    <div className="detail-grid">
      <section className="panel">
        <div className="row spread detail-header">
          <div>
            <p className="muted">Deal #{deal.id}</p>
            <h2>{formatAmount(deal.amountA, deal.tokenA)} for {formatAmount(deal.amountB, deal.tokenB)}</h2>
          </div>
          <div className="row detail-header-actions">
            <button className="refresh-button" onClick={onRefresh}>{isRefreshing ? "Refreshing..." : "Refresh On-Chain State"}</button>
            <StatusBadge status={deal.status} />
          </div>
        </div>

        <div className="meta-grid">
          <div className="stat-block"><span className="muted">Your role</span><strong>{role}</strong></div>
          <div className="stat-block"><span className="muted">Party A</span><strong className="mono">{truncateAddress(deal.partyA, 8, 6)}</strong></div>
          <div className="stat-block"><span className="muted">Party B</span><strong className="mono">{truncateAddress(deal.partyB, 8, 6)}</strong></div>
          <div className="stat-block"><span className="muted">Expires</span><strong>{formatDate(deal.expiresAt)}</strong></div>
        </div>

        <div className="lifecycle">
          {STATUS_ORDER.map((status) => (
            <div key={status} className={deal.status === status ? "lifecycle-step active" : "lifecycle-step"}>
              {status}
            </div>
          ))}
          <div className={deal.status === "Disputed" || deal.status === "Resolved" ? "lifecycle-step active" : "lifecycle-step"}>Disputed → Resolved</div>
          <div className={deal.status === "Expired" ? "lifecycle-step active" : "lifecycle-step"}>Expired</div>
        </div>

        <div className="funding-grid">
          <div className="stat-block">
            <span className="muted">Party A funding</span>
            <strong>{deal.partyAFunded ? "Funded" : "Awaiting deposit"}</strong>
          </div>
          <div className="stat-block">
            <span className="muted">Party B funding</span>
            <strong>{deal.partyBFunded ? "Funded" : "Awaiting deposit"}</strong>
          </div>
          <div className="stat-block">
            <span className="muted">Confirmations</span>
            <strong>{Number(deal.partyAConfirmed) + Number(deal.partyBConfirmed)} / 2</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Actions</h3>
        <p className="muted">Each write action uses TRON energy/bandwidth. Keep extra TRX in the wallet before signing.</p>
        <div className="action-stack">
          {canAccept ? <button onClick={onAccept}>Accept Deal · {ENERGY_HINTS.accept}</button> : null}
          {canFund ? <button onClick={onFund}>Fund Deal · {ENERGY_HINTS.fund}</button> : null}
          {canConfirm ? <button onClick={onConfirm}>Confirm Ready To Settle · {ENERGY_HINTS.confirm}</button> : null}
          {canExecuteSettlement ? <button onClick={onExecuteSettlement}>Finalize Settlement · {ENERGY_HINTS.confirm}</button> : null}
          {canDispute ? (
            <>
              {!showDisputeComposer ? (
                <button onClick={() => setShowDisputeComposer(true)}>Open Dispute Form</button>
              ) : (
                <>
                  <textarea
                    value={disputeReason}
                    onChange={(event) => setDisputeReason(event.target.value)}
                    placeholder="Describe the mismatch, failed delivery, or settlement issue."
                    rows={3}
                  />
                  <div className="row">
                    <button onClick={() => onDispute(disputeReason || "Settlement terms disputed by participant.")}>
                      Raise Dispute · {ENERGY_HINTS.dispute}
                    </button>
                    <button onClick={() => { setShowDisputeComposer(false); setDisputeReason(""); }}>
                      Close Dispute Form
                    </button>
                  </div>
                </>
              )}
            </>
          ) : null}
          {canResolve ? (
            <div className="row">
              <button onClick={() => onResolve(true)}>Resolve: Refund Both</button>
              <button onClick={() => onResolve(false)}>Resolve: Force Settlement</button>
            </div>
          ) : null}
          {canExpire ? <button onClick={onExpire}>Claim Expired Deal · {ENERGY_HINTS.expire}</button> : null}
          {canCancel ? <button onClick={onCancel}>Cancel Deal</button> : null}
        </div>
      </section>

      <section className="panel">
        <h3>Activity & Verification</h3>
        <ul className="stack-list">
          {activity.length === 0 ? <li>No local transaction history recorded yet.</li> : activity.map((entry) => (
            <li key={`${entry.action}-${entry.txHash}`}>
              <div>
                <strong>{entry.label}</strong>
                <p className="muted">{new Date(entry.timestamp).toLocaleString()}</p>
              </div>
              <a className="mono" href={explorerTx(entry.txHash)} target="_blank" rel="noreferrer">{truncateAddress(entry.txHash, 10, 8)}</a>
            </li>
          ))}
        </ul>
      </section>

      {(deal.status === "Settled" || deal.status === "Resolved") ? <SettlementReceipt deal={deal} activity={activity} /> : null}
    </div>
  );
}
