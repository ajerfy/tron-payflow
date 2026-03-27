import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { completePayment, fetchQuote, getPayment } from "../lib/api";
import { connectWallet, loadBalances, simulateOrSendIntentExecution } from "../lib/tron";
import { FailureHints } from "../components/FailureHints";
import { ReceiptCard } from "../components/ReceiptCard";
export function PayPage() {
    const { id = "" } = useParams();
    const [payment, setPayment] = useState(null);
    const [assets, setAssets] = useState([]);
    const [quote, setQuote] = useState(null);
    const [walletAddress, setWalletAddress] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [receipt, setReceipt] = useState(null);
    useEffect(() => {
        void (async () => {
            try {
                const p = await getPayment(id);
                setPayment(p);
            }
            catch (e) {
                setError(e.message);
            }
            finally {
                setLoading(false);
            }
        })();
    }, [id]);
    async function onAnalyzeWallet() {
        setError("");
        try {
            const { address } = await connectWallet();
            setWalletAddress(address);
            const balances = await loadBalances();
            setAssets(balances);
            if (!payment)
                return;
            const q = await fetchQuote(payment.amountUsdt, balances);
            setQuote(q);
        }
        catch (e) {
            setError(e.message);
        }
    }
    async function onPay() {
        if (!payment || !quote)
            return;
        setError("");
        try {
            const fallbackId = Number(payment.id.replace(/\D/g, "")) || 0;
            const txHash = await simulateOrSendIntentExecution({
                requestId: String(payment.onchainRequestId ?? fallbackId),
                amountUsdt: payment.amountUsdt,
                maxTotalInputValueUsdt: payment.amountUsdt + quote.totalFeeUsdt + quote.slippageBufferUsdt,
                quoteLegs: quote.legs.map((l) => ({ token: l.token, amountIn: l.amountIn }))
            });
            const r = {
                amountUsdt: payment.amountUsdt,
                assetsUsed: quote.legs,
                totalFeeUsdt: quote.totalFeeUsdt,
                txHash,
                paidAt: new Date().toISOString()
            };
            setReceipt(r);
            await completePayment(payment.id, txHash, r);
            setPayment({ ...payment, status: "paid", txHash, receipt: r });
        }
        catch (e) {
            setError(e.message);
        }
    }
    const canPay = useMemo(() => payment?.status === "pending" && quote !== null, [payment, quote]);
    if (loading)
        return _jsx("div", { className: "container", children: _jsx("p", { children: "Loading payment..." }) });
    if (!payment)
        return _jsx("div", { className: "container", children: _jsx("p", { children: "Payment not found." }) });
    return (_jsxs("div", { className: "container", children: [_jsx("h1", { children: "TRON PayFlow Checkout" }), _jsxs("div", { className: "card", children: [_jsxs("p", { children: [_jsx("strong", { children: "Merchant:" }), " ", payment.merchantAddress] }), _jsxs("p", { children: [_jsx("strong", { children: "Reference:" }), " ", payment.label] }), _jsxs("p", { children: [_jsx("strong", { children: "Amount Due:" }), " ", payment.amountUsdt.toFixed(2), " USDT"] }), _jsxs("p", { children: [_jsx("strong", { children: "Status:" }), " ", payment.status] })] }), _jsxs("div", { className: "card", children: [_jsx("h3", { children: "Step 1: Analyze Wallet" }), _jsx("button", { onClick: onAnalyzeWallet, children: "Connect + Compute Best Route" }), walletAddress && _jsxs("p", { children: ["Connected wallet: ", walletAddress] }), assets.length > 0 && (_jsx("ul", { children: assets.map((a) => (_jsxs("li", { children: [a.symbol, ": ", a.balance.toFixed(4)] }, a.token))) }))] }), quote && (_jsxs("div", { className: "card", children: [_jsx("h3", { children: "Step 2: Suggested Payment Method" }), _jsxs("p", { children: ["Total input value: ", quote.totalInputValueUsdt.toFixed(4), " USDT"] }), _jsxs("p", { children: ["Estimated fees: ", quote.totalFeeUsdt.toFixed(4), " USDT"] }), _jsxs("p", { children: ["Slippage buffer: ", quote.slippageBufferUsdt.toFixed(4), " USDT"] }), _jsx("ul", { children: quote.legs.map((leg) => (_jsxs("li", { children: [leg.symbol, ": ", leg.amountIn.toFixed(4), " ", "->", " ", leg.netUsdt.toFixed(4), " USDT (fee ", leg.feeUsdt.toFixed(4), ")"] }, `${leg.token}-${leg.amountIn}`))) }), _jsx("button", { disabled: !canPay, onClick: onPay, children: "Pay in One Click" })] })), error && _jsx(FailureHints, { reason: error }), receipt && _jsx(ReceiptCard, { receipt: receipt })] }));
}
