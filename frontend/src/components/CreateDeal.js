import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { ENERGY_HINTS, TOKENS } from "../utils/constants";
export function CreateDeal({ onCreate }) {
    const [form, setForm] = useState({
        tokenA: TOKENS[0].address,
        amountA: "10",
        tokenB: TOKENS[1].address,
        amountB: "100",
        counterparty: "",
        timeoutHours: 24
    });
    const [submitting, setSubmitting] = useState(false);
    const impliedRate = useMemo(() => {
        const amountA = Number(form.amountA || 0);
        const amountB = Number(form.amountB || 0);
        if (!amountA || !amountB) {
            return "Enter both amounts";
        }
        return `1 ${TOKENS.find((token) => token.address === form.tokenA)?.symbol} = ${(amountB / amountA).toFixed(4)} ${TOKENS.find((token) => token.address === form.tokenB)?.symbol}`;
    }, [form]);
    async function submit() {
        setSubmitting(true);
        try {
            await onCreate(form);
            setForm({ ...form, counterparty: "" });
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsxs("section", { className: "panel", children: [_jsx("h2", { children: "Create New Deal" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: [_jsx("span", { children: "I\u2019m selling" }), _jsxs("div", { className: "inline-field", children: [_jsx("select", { value: form.tokenA, onChange: (event) => setForm({ ...form, tokenA: event.target.value }), children: TOKENS.map((token) => _jsx("option", { value: token.address, children: token.label }, token.address)) }), _jsx("input", { value: form.amountA, onChange: (event) => setForm({ ...form, amountA: event.target.value }) })] })] }), _jsxs("label", { children: [_jsx("span", { children: "I want" }), _jsxs("div", { className: "inline-field", children: [_jsx("select", { value: form.tokenB, onChange: (event) => setForm({ ...form, tokenB: event.target.value }), children: TOKENS.map((token) => _jsx("option", { value: token.address, children: token.label }, token.address)) }), _jsx("input", { value: form.amountB, onChange: (event) => setForm({ ...form, amountB: event.target.value }) })] })] }), _jsxs("label", { children: [_jsx("span", { children: "Counterparty address" }), _jsx("input", { value: form.counterparty, onChange: (event) => setForm({ ...form, counterparty: event.target.value }), placeholder: "T..." })] }), _jsxs("label", { children: [_jsx("span", { children: "Timeout" }), _jsx("select", { value: form.timeoutHours, onChange: (event) => setForm({ ...form, timeoutHours: Number(event.target.value) }), children: [1, 6, 12, 24, 48].map((hours) => _jsxs("option", { value: hours, children: [hours, " hour", hours > 1 ? "s" : ""] }, hours)) })] })] }), _jsxs("div", { className: "row spread", children: [_jsxs("div", { children: [_jsx("p", { className: "muted", children: "Implied rate" }), _jsx("strong", { children: impliedRate })] }), _jsxs("div", { children: [_jsx("p", { className: "muted", children: "Energy estimate" }), _jsx("strong", { children: ENERGY_HINTS.create })] })] }), _jsx("button", { className: "primary-button", disabled: submitting, onClick: submit, children: "Create Deal" })] }));
}
