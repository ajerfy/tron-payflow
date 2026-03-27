import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { MerchantPage } from "./pages/MerchantPage";
import { PayPage } from "./pages/PayPage";
export function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/merchant", element: _jsx(MerchantPage, {}) }), _jsx(Route, { path: "/pay/:id", element: _jsx(PayPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
