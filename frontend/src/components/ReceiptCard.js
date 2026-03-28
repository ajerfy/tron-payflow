import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
export function ReceiptCard({ receipt }) {
    return (_jsxs("div", { className: "card", children: [_jsx("h3", { children: "Settlement Receipt" }), _jsxs("p", { children: ["Invoice: ", receipt.invoiceId] }), _jsxs("p", { children: ["Settlement recorded: ", receipt.amountUsdt.toFixed(2), " USDT"] }), _jsxs("p", { children: ["Outstanding after posting: ", receipt.outstandingUsdt.toFixed(2), " USDT"] }), receipt.onchainRequestId !== undefined ? _jsxs("p", { children: ["Nile request id: ", receipt.onchainRequestId] }) : null, _jsxs("p", { children: ["Reference: ", receipt.txHash] }), _jsxs("p", { children: ["Method: ", receipt.method] }), receipt.payerAddress ? _jsxs("p", { children: ["Payer wallet: ", receipt.payerAddress] }) : null, receipt.note ? _jsxs("p", { children: ["Ops note: ", receipt.note] }) : null, receipt.explorerUrl ? _jsx("p", { children: _jsx("a", { href: receipt.explorerUrl, target: "_blank", rel: "noreferrer", children: "Open in TronScan" }) }) : null, _jsxs("p", { children: ["Settled at: ", new Date(receipt.settledAt).toLocaleString()] }), _jsx("button", { onClick: () => downloadJson(`settlement-${receipt.txHash}.json`, receipt), children: "Download JSON receipt" })] }));
}
