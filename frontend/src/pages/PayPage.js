import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { addSettlement, getPayment, recordFailedAttempt, toReceipt } from "../lib/api";
import { anchorSettlementReference, connectWallet, getExplorerAddressUrl, getExplorerTxUrl, getNetworkLabel, isDemoMode, simulateSettlementReference, waitForSettlementAnchor } from "../lib/tron";
import { FailureHints } from "../components/FailureHints";
import { ReceiptCard } from "../components/ReceiptCard";
const demoMode = isDemoMode();
export function PayPage() {
    const { id = "" } = useParams();
    const [payment, setPayment] = useState(null);
    const [walletAddress, setWalletAddress] = useState("");
    const [settlementAmount, setSettlementAmount] = useState(0);
    const [txHash, setTxHash] = useState("");
    const [note, setNote] = useState("");
    const [method, setMethod] = useState(demoMode ? "demo" : "tron_tx");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [receipt, setReceipt] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        void (async () => {
            try {
                const fetched = await getPayment(id);
                setPayment(fetched);
                setSettlementAmount(Number(fetched.outstandingUsdt.toFixed(2)));
                setReceipt(toReceipt(fetched));
            }
            catch (err) {
                setError(err.message);
            }
            finally {
                setLoading(false);
            }
        })();
    }, [id]);
    async function onConnectWallet() {
        setError("");
        try {
            const { address } = await connectWallet();
            setWalletAddress(address);
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function onSimulateSettlement() {
        if (!payment) {
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            const simulated = await simulateSettlementReference({
                invoiceId: payment.id,
                amountUsdt: settlementAmount,
                merchantAddress: payment.merchantAddress,
                payerAddress: walletAddress || undefined
            });
            setTxHash(simulated.txHash);
            setNote(simulated.note);
            const updated = await addSettlement(payment.id, {
                amountUsdt: settlementAmount,
                txHash: simulated.txHash,
                settledAt: simulated.settledAt,
                payerAddress: simulated.payerAddress,
                note: simulated.note,
                method: "demo",
                referenceLabel: payment.label
            });
            setPayment(updated);
            setReceipt({
                ...toReceipt(updated),
                explorerUrl: getExplorerTxUrl(updated.txHash)
            });
            setSettlementAmount(Number(updated.outstandingUsdt.toFixed(2)));
        }
        catch (err) {
            const message = err.message;
            setError(message);
            await recordFailedAttempt(payment.id, message, walletAddress || undefined);
        }
        finally {
            setSubmitting(false);
        }
    }
    async function onRecordSettlement() {
        if (!payment) {
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            let nextTxHash = txHash;
            let payerAddress = walletAddress || undefined;
            const settledAt = new Date().toISOString();
            if (!demoMode) {
                if (payment.onchainRequestId === undefined) {
                    throw new Error("This invoice is missing its on-chain Nile request id.");
                }
                const anchored = await anchorSettlementReference({
                    requestId: payment.onchainRequestId,
                    amountUsdt: settlementAmount,
                    payerAddress,
                    reference: txHash || `${payment.label}-${settledAt}`
                });
                await waitForSettlementAnchor(payment.onchainRequestId, payment.settlements.length);
                nextTxHash = anchored.txHash;
                payerAddress = anchored.payerAddress;
            }
            const updated = await addSettlement(payment.id, {
                amountUsdt: settlementAmount,
                txHash: nextTxHash,
                settledAt,
                payerAddress,
                note,
                method,
                referenceLabel: payment.label
            });
            setPayment(updated);
            setReceipt({
                ...toReceipt(updated),
                explorerUrl: getExplorerTxUrl(updated.txHash)
            });
            setSettlementAmount(Number(updated.outstandingUsdt.toFixed(2)));
            setTxHash("");
            setNote("");
        }
        catch (err) {
            const message = err.message;
            setError(message);
            await recordFailedAttempt(payment.id, message, walletAddress || undefined);
        }
        finally {
            setSubmitting(false);
        }
    }
    const recommendedMessage = useMemo(() => {
        if (!payment) {
            return "";
        }
        if (payment.outstandingUsdt <= 0) {
            return "This invoice is already fully reconciled.";
        }
        if (payment.status === "overdue") {
            return "This invoice is overdue. Record a settlement reference as soon as the transfer lands.";
        }
        return `Recommended next action: settle ${payment.outstandingUsdt.toFixed(2)} USDT and attach the transfer reference.`;
    }, [payment]);
    if (loading) {
        return _jsx("div", { className: "container", children: _jsx("p", { children: "Loading invoice..." }) });
    }
    if (!payment) {
        return _jsx("div", { className: "container", children: _jsx("p", { children: "Invoice not found." }) });
    }
    return (_jsxs("div", { className: "container", children: [_jsx("h1", { children: "Trading Settlement Portal" }), _jsxs("div", { className: "card", children: [_jsx("h3", { children: "Invoice Summary" }), _jsxs("p", { children: [_jsx("strong", { children: "Issuing desk:" }), " ", payment.merchantName] }), _jsxs("p", { children: [_jsx("strong", { children: "Settlement wallet:" }), " ", _jsx("a", { href: getExplorerAddressUrl(payment.merchantAddress), target: "_blank", rel: "noreferrer", children: payment.merchantAddress })] }), _jsxs("p", { children: [_jsx("strong", { children: "Counterparty:" }), " ", payment.counterpartyName, " (", payment.counterpartyEmail, ")"] }), _jsxs("p", { children: [_jsx("strong", { children: "Category:" }), " ", payment.category] }), _jsxs("p", { children: [_jsx("strong", { children: "Reference:" }), " ", payment.label] }), _jsxs("p", { children: [_jsx("strong", { children: "Amount due:" }), " ", payment.amountUsdt.toFixed(2), " USDT"] }), _jsxs("p", { children: [_jsx("strong", { children: "Collected so far:" }), " ", payment.amountPaidUsdt.toFixed(2), " USDT"] }), _jsxs("p", { children: [_jsx("strong", { children: "Outstanding:" }), " ", payment.outstandingUsdt.toFixed(2), " USDT"] }), _jsxs("p", { children: [_jsx("strong", { children: "Status:" }), " ", payment.status] }), _jsxs("p", { children: [_jsx("strong", { children: "Network:" }), " ", getNetworkLabel()] }), payment.onchainRequestId !== undefined ? _jsxs("p", { children: [_jsx("strong", { children: "Nile request id:" }), " ", payment.onchainRequestId] }) : null, payment.onchainInvoiceTxHash ? _jsxs("p", { children: [_jsx("strong", { children: "Invoice anchor tx:" }), " ", _jsx("a", { href: getExplorerTxUrl(payment.onchainInvoiceTxHash), target: "_blank", rel: "noreferrer", children: payment.onchainInvoiceTxHash })] }) : null, payment.dueAt ? _jsxs("p", { children: [_jsx("strong", { children: "Due by:" }), " ", new Date(payment.dueAt).toLocaleString()] }) : null, payment.notes ? _jsxs("p", { children: [_jsx("strong", { children: "Ops note:" }), " ", payment.notes] }) : null, payment.lastFailureReason ? _jsxs("p", { children: [_jsx("strong", { children: "Last failed attempt:" }), " ", payment.lastFailureReason] }) : null] }), _jsxs("div", { className: "card", children: [_jsx("h3", { children: "Step 1: Identify the settlement wallet" }), _jsx("p", { children: "Connect the counterparty wallet, then either anchor a Nile settlement reference on-chain or simulate one in demo mode." }), _jsx("button", { onClick: onConnectWallet, children: "Connect counterparty wallet" }), walletAddress ? _jsxs("p", { children: [_jsx("strong", { children: "Connected wallet:" }), " ", walletAddress] }) : null, _jsxs("p", { children: [_jsx("strong", { children: "Settlement guidance:" }), " ", recommendedMessage] })] }), _jsxs("div", { className: "card", children: [_jsx("h3", { children: "Step 2: Reconcile a settlement" }), _jsx("input", { type: "number", value: settlementAmount, onChange: (event) => setSettlementAmount(Number(event.target.value)), placeholder: "Settlement amount in USDT" }), _jsxs("select", { value: method, onChange: (event) => setMethod(event.target.value), children: [demoMode ? _jsx("option", { value: "demo", children: "Demo simulation" }) : null, _jsx("option", { value: "tron_tx", children: "TRON transfer reference" }), _jsx("option", { value: "manual", children: "Manual reconciliation note" })] }), _jsx("input", { value: txHash, onChange: (event) => setTxHash(event.target.value), placeholder: "Paste transfer tx hash or external reference" }), _jsx("textarea", { value: note, onChange: (event) => setNote(event.target.value), placeholder: "Settlement note", rows: 3 }), _jsxs("div", { className: "row", children: [demoMode ? _jsx("button", { disabled: submitting || payment.outstandingUsdt <= 0, onClick: onSimulateSettlement, children: "Simulate settlement" }) : null, _jsx("button", { disabled: submitting || payment.outstandingUsdt <= 0, onClick: onRecordSettlement, children: demoMode ? "Record settlement reference" : "Anchor settlement on Nile" })] })] }), _jsxs("div", { className: "card", children: [_jsx("h3", { children: "Settlement History" }), _jsx("ul", { className: "payment-list", children: payment.settlements.length === 0 ? _jsx("li", { children: "No settlement records yet." }) : payment.settlements.map((settlement) => (_jsxs("li", { children: [settlement.amountUsdt.toFixed(2), " USDT \u00B7 ", settlement.method, " \u00B7 ", new Date(settlement.settledAt).toLocaleString(), _jsx("br", {}), "Ref ", settlement.txHash, settlement.note ? ` · ${settlement.note}` : ""] }, settlement.id))) }), payment.reconciliationNotes.length > 0 ? (_jsxs(_Fragment, { children: [_jsx("h4", { children: "Reconciliation Notes" }), _jsx("ul", { className: "payment-list", children: payment.reconciliationNotes.map((entry) => (_jsxs("li", { children: [new Date(entry.createdAt).toLocaleString(), " \u00B7 ", entry.message] }, entry.id))) })] })) : null] }), error ? _jsx(FailureHints, { reason: error, supportEmail: payment.supportEmail }) : null, receipt ? _jsx(ReceiptCard, { receipt: receipt }) : null] }));
}
