import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPayment, getMerchantPayments } from "../lib/api";
import { createOnchainPaymentRequest, getNetworkLabel, isDemoMode } from "../lib/tron";
function toDueIso(daysFromNow) {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60000).toISOString();
}
const emptyPortfolio = {
    issued: 0,
    collected: 0,
    outstanding: 0,
    pending: 0,
    partial: 0,
    paid: 0,
    overdue: 0,
    collectionRate: 0
};
export function MerchantPage() {
    const [merchantAddress, setMerchantAddress] = useState("TDESK_SETTLEMENT_ADDR");
    const [merchantName, setMerchantName] = useState("South Loop Prime");
    const [supportEmail, setSupportEmail] = useState("ops@southloopprime.test");
    const [counterpartyName, setCounterpartyName] = useState("Northstar Capital");
    const [counterpartyEmail, setCounterpartyEmail] = useState("settlements@northstar.test");
    const [category, setCategory] = useState("Liquidity provision");
    const [amount, setAmount] = useState(50);
    const [label, setLabel] = useState("LP Fee March 28");
    const [notes, setNotes] = useState("Settle against the matching trade ticket before noon.");
    const [dueDays, setDueDays] = useState(2);
    const [payments, setPayments] = useState([]);
    const [portfolio, setPortfolio] = useState(emptyPortfolio);
    const [newLink, setNewLink] = useState("");
    const [error, setError] = useState("");
    async function refresh() {
        try {
            const response = await getMerchantPayments(merchantAddress);
            setPayments(response.items);
            setPortfolio(response.portfolio);
        }
        catch (err) {
            setError(err.message);
        }
    }
    useEffect(() => {
        void refresh();
    }, [merchantAddress]);
    const spotlight = useMemo(() => {
        const newest = payments[0];
        if (!newest) {
            return "No invoices yet. Create one to start your reconciliation log.";
        }
        return `${newest.counterpartyName} owes ${newest.outstandingUsdt.toFixed(2)} USDT on ${newest.label}.`;
    }, [payments]);
    async function onCreate() {
        setError("");
        try {
            const dueAt = toDueIso(dueDays);
            const onchainAnchor = await createOnchainPaymentRequest(merchantAddress, amount, label, dueAt);
            const { paymentLink } = await createPayment({
                merchantAddress,
                merchantName,
                supportEmail,
                amountUsdt: amount,
                label,
                category,
                counterpartyName,
                counterpartyEmail,
                notes,
                network: isDemoMode() ? "demo" : "nile",
                onchainRequestId: onchainAnchor?.requestId,
                onchainInvoiceTxHash: onchainAnchor?.txHash,
                dueAt
            });
            setNewLink(paymentLink);
            await refresh();
        }
        catch (err) {
            setError(err.message);
        }
    }
    function exportJson() {
        const payload = {
            exportedAt: new Date().toISOString(),
            merchantAddress,
            portfolio,
            invoices: payments
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "trading-invoice-reconciliation.json";
        anchor.click();
        URL.revokeObjectURL(url);
    }
    return (_jsxs("div", { className: "container", children: [_jsx("h1", { children: "Trading Invoice & Reconciliation" }), _jsxs("div", { className: "card", children: [_jsx("h3", { children: "Desk Snapshot" }), _jsxs("p", { children: [_jsx("strong", { children: "Issuing desk:" }), " ", merchantName] }), _jsxs("p", { children: [_jsx("strong", { children: "Settlement wallet:" }), " ", merchantAddress] }), _jsxs("p", { children: [_jsx("strong", { children: "Operations contact:" }), " ", supportEmail] }), _jsxs("p", { children: [_jsx("strong", { children: "Network mode:" }), " ", getNetworkLabel()] }), _jsxs("p", { children: [_jsx("strong", { children: "Portfolio spotlight:" }), " ", spotlight] })] }), _jsxs("div", { className: "card", children: [_jsx("h3", { children: "Create Trading Invoice" }), _jsx("input", { value: merchantName, onChange: (event) => setMerchantName(event.target.value), placeholder: "Desk or issuer name" }), _jsx("input", { value: supportEmail, onChange: (event) => setSupportEmail(event.target.value), placeholder: "Operations email" }), _jsx("input", { value: merchantAddress, onChange: (event) => setMerchantAddress(event.target.value), placeholder: "Settlement wallet" }), _jsx("input", { value: counterpartyName, onChange: (event) => setCounterpartyName(event.target.value), placeholder: "Counterparty name" }), _jsx("input", { value: counterpartyEmail, onChange: (event) => setCounterpartyEmail(event.target.value), placeholder: "Counterparty email" }), _jsx("input", { value: category, onChange: (event) => setCategory(event.target.value), placeholder: "Invoice category" }), _jsx("input", { type: "number", value: amount, onChange: (event) => setAmount(Number(event.target.value)), placeholder: "USDT amount" }), _jsx("input", { value: label, onChange: (event) => setLabel(event.target.value), placeholder: "Reference label" }), _jsx("input", { type: "number", value: dueDays, onChange: (event) => setDueDays(Number(event.target.value)), placeholder: "Days until due" }), _jsx("textarea", { value: notes, onChange: (event) => setNotes(event.target.value), placeholder: "Operational notes", rows: 3 }), _jsx("button", { onClick: onCreate, children: "Create invoice link" }), newLink ? _jsxs("p", { children: ["New link: ", _jsx(Link, { to: newLink, children: newLink })] }) : null] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "stat", children: ["Issued: ", portfolio.issued.toFixed(2), " USDT"] }), _jsxs("div", { className: "stat", children: ["Collected: ", portfolio.collected.toFixed(2), " USDT"] }), _jsxs("div", { className: "stat", children: ["Outstanding: ", portfolio.outstanding.toFixed(2), " USDT"] }), _jsxs("div", { className: "stat", children: ["Collection rate: ", (portfolio.collectionRate * 100).toFixed(0), "%"] }), _jsxs("div", { className: "stat", children: ["Partial: ", portfolio.partial] }), _jsxs("div", { className: "stat", children: ["Overdue: ", portfolio.overdue] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "section-header", children: [_jsx("h3", { children: "Reconciliation Ledger" }), _jsx("button", { onClick: exportJson, children: "Export JSON" })] }), _jsx("ul", { className: "payment-list", children: payments.map((payment) => (_jsxs("li", { children: [_jsx("strong", { children: payment.label }), " \u00B7 ", payment.category, " \u00B7 ", payment.status, _jsx("br", {}), "Counterparty ", payment.counterpartyName, " \u00B7 Paid ", payment.amountPaidUsdt.toFixed(2), " / ", payment.amountUsdt.toFixed(2), " USDT", _jsx("br", {}), "Due ", payment.dueAt ? new Date(payment.dueAt).toLocaleString() : "open", " \u00B7 ", payment.settlements.length, " settlement record(s)", payment.onchainRequestId !== undefined ? ` · Nile request ${payment.onchainRequestId}` : "", " · ", _jsx(Link, { to: `/pay/${payment.id}`, children: "open settlement portal" })] }, payment.id))) })] }), error ? _jsx("p", { className: "error-text", children: error }) : null] }));
}
