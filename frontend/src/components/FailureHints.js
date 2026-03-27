import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function FailureHints({ reason }) {
    const normalized = reason.toLowerCase();
    let title = "Transaction failed";
    let hint = "Please try again.";
    if (normalized.includes("liquidity") || normalized.includes("balance")) {
        title = "Insufficient balance or liquidity";
        hint = "Use different assets, lower payment amount, or split into multiple payments.";
    }
    else if (normalized.includes("slippage")) {
        title = "Slippage exceeded";
        hint = "Increase slippage tolerance or choose a more liquid token pair.";
    }
    else if (normalized.includes("energy")) {
        title = "Out of Energy/Bandwidth";
        hint = "Acquire/freeze more TRX or use fee delegation in production setup.";
    }
    return (_jsxs("div", { className: "error-box", children: [_jsx("strong", { children: title }), _jsx("p", { children: reason }), _jsxs("p", { children: ["Suggested fix: ", hint] })] }));
}
