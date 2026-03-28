import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function FailureHints({ reason, supportEmail }) {
    const normalized = reason.toLowerCase();
    let title = "Settlement could not be recorded";
    let hint = "Verify the tx hash, amount, and invoice reference, then try again.";
    if (normalized.includes("outstanding balance")) {
        title = "Settlement exceeds the invoice balance";
        hint = "Lower the posted amount or create a second invoice if this transfer covered multiple obligations.";
    }
    else if (normalized.includes("required")) {
        title = "Missing settlement reference";
        hint = "Paste the TRON tx hash or use demo mode to generate a synthetic reference.";
    }
    else if (normalized.includes("wallet")) {
        title = "Counterparty wallet unavailable";
        hint = "Connect the wallet again or record the transfer manually after the counterparty sends funds.";
    }
    return (_jsxs("div", { className: "error-box", children: [_jsx("strong", { children: title }), _jsx("p", { children: reason }), _jsxs("p", { children: ["Suggested fix: ", hint] }), supportEmail ? _jsxs("p", { children: ["Need help? Contact ", supportEmail, " with the invoice reference."] }) : null] }));
}
