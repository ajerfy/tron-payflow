import { jsx as _jsx } from "react/jsx-runtime";
import { statusTone } from "../utils/formatters";
export function StatusBadge({ status }) {
    return _jsx("span", { className: `status-badge ${statusTone(status)}`, children: status });
}
