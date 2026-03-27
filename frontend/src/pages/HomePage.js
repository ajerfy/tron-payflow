import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
export function HomePage() {
    return (_jsxs("div", { className: "container", children: [_jsx("h1", { children: "TRON PayFlow" }), _jsx("p", { children: "Intent-based stablecoin checkout for TRON merchants." }), _jsx("div", { className: "row", children: _jsx(Link, { className: "button", to: "/merchant", children: "Merchant Dashboard" }) })] }));
}
