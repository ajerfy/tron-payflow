import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ErrorMessage({ error }) {
    if (!error) {
        return null;
    }
    return (_jsxs("div", { className: "panel error-panel", children: [_jsx("strong", { children: error.title }), _jsx("p", { children: error.message }), error.suggestion ? _jsx("p", { className: "muted", children: error.suggestion }) : null] }));
}
