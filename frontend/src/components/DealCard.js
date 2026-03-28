import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { formatAmount, formatDate, truncateAddress } from "../utils/formatters";
import { StatusBadge } from "./StatusBadge";
export function DealCard({ deal, viewer }) {
    const role = viewer === deal.partyA ? "Party A" : viewer === deal.partyB ? "Party B" : "Observer";
    return (_jsxs("article", { className: "panel deal-card", children: [_jsxs("div", { className: "row spread", children: [_jsxs("div", { children: [_jsxs("p", { className: "muted", children: ["Deal #", deal.id] }), _jsxs("h3", { children: [formatAmount(deal.amountA, deal.tokenA), " for ", formatAmount(deal.amountB, deal.tokenB)] })] }), _jsx(StatusBadge, { status: deal.status })] }), _jsxs("p", { className: "muted", children: [role, " \u00B7 Counterparty ", truncateAddress(viewer === deal.partyA ? deal.partyB : deal.partyA)] }), _jsxs("p", { className: "muted", children: ["Expires ", formatDate(deal.expiresAt)] }), _jsx(Link, { className: "text-link", to: `/deals/${deal.id}`, children: "Open deal detail" })] }));
}
