import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPayment, getMerchantPayments } from "../lib/api";
import { createOnchainPaymentRequest } from "../lib/tron";
export function MerchantPage() {
    const [merchantAddress, setMerchantAddress] = useState("TMERCHANT_DEMO_ADDR");
    const [amount, setAmount] = useState(50);
    const [label, setLabel] = useState("Invoice #1001");
    const [payments, setPayments] = useState([]);
    const [newLink, setNewLink] = useState("");
    const [error, setError] = useState("");
    async function refresh() {
        try {
            setPayments(await getMerchantPayments(merchantAddress));
        }
        catch (e) {
            setError(e.message);
        }
    }
    useEffect(() => {
        void refresh();
    }, []);
    const stats = useMemo(() => {
        return {
            paid: payments.filter((p) => p.status === "paid").length,
            pending: payments.filter((p) => p.status === "pending").length,
            failed: payments.filter((p) => p.status === "failed").length,
            total: payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountUsdt, 0)
        };
    }, [payments]);
    async function onCreate() {
        setError("");
        try {
            const onchainRequestId = await createOnchainPaymentRequest(amount, label);
            const { paymentLink } = await createPayment(merchantAddress, amount, label, onchainRequestId);
            setNewLink(paymentLink);
            await refresh();
        }
        catch (e) {
            setError(e.message);
        }
    }
    function exportJson() {
        const blob = new Blob([JSON.stringify(payments, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "merchant-reconciliation.json";
        a.click();
        URL.revokeObjectURL(url);
    }
    return (_jsxs("div", { className: "container", children: [_jsx("h1", { children: "Merchant Dashboard" }), _jsxs("div", { className: "card", children: [_jsx("h3", { children: "Create Payment Request" }), _jsx("input", { value: merchantAddress, onChange: (e) => setMerchantAddress(e.target.value), placeholder: "Merchant address" }), _jsx("input", { type: "number", value: amount, onChange: (e) => setAmount(Number(e.target.value)), placeholder: "USDT amount" }), _jsx("input", { value: label, onChange: (e) => setLabel(e.target.value), placeholder: "Reference label" }), _jsx("button", { onClick: onCreate, children: "Create Payment Link" }), newLink && _jsxs("p", { children: ["New link: ", _jsx(Link, { to: newLink, children: newLink })] })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "stat", children: ["Paid: ", stats.paid] }), _jsxs("div", { className: "stat", children: ["Pending: ", stats.pending] }), _jsxs("div", { className: "stat", children: ["Failed: ", stats.failed] }), _jsxs("div", { className: "stat", children: ["Total received: ", stats.total.toFixed(2), " USDT"] })] }), _jsxs("div", { className: "card", children: [_jsx("h3", { children: "Reconciliation Log" }), _jsx("button", { onClick: exportJson, children: "Export JSON" }), _jsx("ul", { children: payments.map((p) => (_jsxs("li", { children: [p.label, " - ", p.amountUsdt, " USDT - ", p.status, " ", p.txHash ? `- ${p.txHash}` : "", " - ", _jsx(Link, { to: `/pay/${p.id}`, children: "open" })] }, p.id))) })] }), error && _jsx("p", { className: "error-text", children: error })] }));
}
