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
    return (_jsxs("div", { className: "card", children: [_jsx("h3", { children: "Payment Receipt" }), _jsxs("p", { children: ["Amount settled: ", receipt.amountUsdt.toFixed(2), " USDT"] }), _jsxs("p", { children: ["Total fee: ", receipt.totalFeeUsdt.toFixed(4), " USDT"] }), _jsxs("p", { children: ["Tx hash: ", receipt.txHash] }), _jsxs("p", { children: ["Paid at: ", receipt.paidAt] }), _jsx("h4", { children: "Assets Used" }), _jsx("ul", { children: receipt.assetsUsed.map((leg) => (_jsxs("li", { children: [leg.symbol, ": ", leg.amountIn.toFixed(4), " (", leg.netUsdt.toFixed(4), " USDT net)"] }, `${leg.token}-${leg.amountIn}`))) }), _jsx("button", { onClick: () => downloadJson(`receipt-${receipt.txHash}.json`, receipt), children: "Download JSON Receipt" })] }));
}
