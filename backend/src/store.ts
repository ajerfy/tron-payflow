import fs from "node:fs";
import path from "node:path";
import type { PaymentRecord } from "./domain.js";

const defaultPath = path.resolve(process.cwd(), "data/payments.json");

function ensureParent(filepath: string) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
}

export function loadPayments(filepath = defaultPath) {
  try {
    const raw = fs.readFileSync(filepath, "utf8");
    const items = JSON.parse(raw) as PaymentRecord[];
    return new Map(items.map((payment) => [payment.id, payment]));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Map<string, PaymentRecord>();
    }
    throw error;
  }
}

export function savePayments(payments: Map<string, PaymentRecord>, filepath = defaultPath) {
  ensureParent(filepath);
  fs.writeFileSync(filepath, JSON.stringify([...payments.values()], null, 2));
}
