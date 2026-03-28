import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { makeReceiptSummary } from "../utils/formatters";
import { explorerTx } from "../utils/tronHelpers";
import { formatAmount, formatDate } from "../utils/formatters";
function downloadReceipt(filename, contents) {
    const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
export function SettlementReceipt({ deal, activity }) {
    const summary = makeReceiptSummary({
        dealId: deal.id,
        partyA: deal.partyA,
        partyB: deal.partyB,
        assetA: formatAmount(deal.amountA, deal.tokenA),
        assetB: formatAmount(deal.amountB, deal.tokenB),
        settledAt: deal.settledAt,
        txHashes: activity.map((entry) => entry.txHash)
    });
    return (_jsxs("section", { className: "panel", children: [_jsxs("div", { className: "row spread", children: [_jsx("h3", { children: "Settlement Receipt" }), _jsx("button", { onClick: () => navigator.clipboard.writeText(summary), children: "Share Receipt" })] }), _jsxs("p", { children: [_jsx("strong", { children: "Deal:" }), " #", deal.id] }), _jsxs("p", { children: [_jsx("strong", { children: "Parties:" }), " ", deal.partyA, " \u2194 ", deal.partyB] }), _jsxs("p", { children: [_jsx("strong", { children: "Assets exchanged:" }), " ", formatAmount(deal.amountA, deal.tokenA), " for ", formatAmount(deal.amountB, deal.tokenB)] }), _jsxs("p", { children: [_jsx("strong", { children: "Settled at:" }), " ", formatDate(deal.settledAt)] }), _jsx("ul", { className: "stack-list", children: activity.map((entry) => (_jsxs("li", { children: [_jsx("span", { children: entry.label }), _jsxs("a", { className: "mono", href: explorerTx(entry.txHash), target: "_blank", rel: "noreferrer", children: [entry.txHash.slice(0, 18), "..."] })] }, `${entry.action}-${entry.txHash}`))) }), _jsx("button", { onClick: () => downloadReceipt(`otc-settlement-${deal.id}.txt`, summary), children: "Download Receipt" })] }));
}
