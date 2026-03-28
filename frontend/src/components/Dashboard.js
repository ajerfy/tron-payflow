import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { DealCard } from "./DealCard";
import { CreateDeal } from "./CreateDeal";
const filters = ["All", "Created", "Accepted", "BothFunded", "Settled", "Disputed", "Expired"];
export function Dashboard({ deals, walletAddress, onCreate }) {
    const [tab, setTab] = useState("my-deals");
    const [statusFilter, setStatusFilter] = useState("All");
    const filtered = useMemo(() => {
        return deals.filter((deal) => {
            if (deal.status === "Cancelled") {
                return false;
            }
            return statusFilter === "All" || deal.status === statusFilter;
        });
    }, [deals, statusFilter]);
    return (_jsxs("section", { className: "dashboard-shell", children: [_jsxs("div", { className: "row tabs", children: [_jsx("button", { className: tab === "my-deals" ? "tab active" : "tab", onClick: () => setTab("my-deals"), children: "My Deals" }), _jsx("button", { className: tab === "create" ? "tab active" : "tab", onClick: () => setTab("create"), children: "Create New Deal" })] }), tab === "create" ? _jsx(CreateDeal, { onCreate: onCreate }) : (_jsxs("section", { className: "panel", children: [_jsxs("div", { className: "row spread", children: [_jsxs("div", { children: [_jsx("h2", { children: "My Deals" }), _jsx("p", { className: "muted", children: "Distinct views for Party A and Party B are driven by the connected wallet." })] }), _jsx("select", { value: statusFilter, onChange: (event) => setStatusFilter(event.target.value), children: filters.map((status) => _jsx("option", { value: status, children: status }, status)) })] }), _jsx("div", { className: "deal-grid", children: filtered.length === 0 ? _jsxs("div", { className: "empty-state", children: ["No deals for ", walletAddress, " yet."] }) : filtered.map((deal) => (_jsx(DealCard, { deal: deal, viewer: walletAddress }, deal.id))) })] }))] }));
}
