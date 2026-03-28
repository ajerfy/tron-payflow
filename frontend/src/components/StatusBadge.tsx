import type { DealStatus } from "../types";
import { statusTone } from "../utils/formatters";

export function StatusBadge({ status }: { status: DealStatus }) {
  return <span className={`status-badge ${statusTone(status)}`}>{status}</span>;
}
