import { useMemo, useState } from "react";
import type { Deal, DealStatus } from "../types";
import { DealCard } from "./DealCard";
import { CreateDeal } from "./CreateDeal";

type Props = {
  deals: Deal[];
  walletAddress: string;
  onCreate: Parameters<typeof CreateDeal>[0]["onCreate"];
};

const filters: Array<DealStatus | "All"> = ["All", "Created", "Accepted", "BothFunded", "Settled", "Disputed", "Expired"];

export function Dashboard({ deals, walletAddress, onCreate }: Props) {
  const [tab, setTab] = useState<"my-deals" | "create">("my-deals");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "All">("All");

  const filtered = useMemo(() => {
    return deals.filter((deal) => {
      if (deal.status === "Cancelled") {
        return false;
      }
      return statusFilter === "All" || deal.status === statusFilter;
    });
  }, [deals, statusFilter]);

  return (
    <section className="dashboard-shell">
      <div className="row tabs">
        <button className={tab === "my-deals" ? "tab active" : "tab"} onClick={() => setTab("my-deals")}>My Deals</button>
        <button className={tab === "create" ? "tab active" : "tab"} onClick={() => setTab("create")}>Create New Deal</button>
      </div>

      {tab === "create" ? <CreateDeal onCreate={onCreate} /> : (
        <section className="panel">
          <div className="row spread">
            <div>
              <h2>My Deals</h2>
              <p className="muted">Distinct views for Party A and Party B are driven by the connected wallet.</p>
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DealStatus | "All")}>
              {filters.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className="deal-grid">
            {filtered.length === 0 ? <div className="empty-state">No deals for {walletAddress} yet.</div> : filtered.map((deal) => (
              <DealCard key={deal.id} deal={deal} viewer={walletAddress} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
