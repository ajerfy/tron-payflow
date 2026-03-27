import type { Payment, RouteQuote, WalletAsset } from "../types";

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4100";

export async function createPayment(merchantAddress: string, amountUsdt: number, label: string, onchainRequestId?: number) {
  const response = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantAddress, amountUsdt, label, onchainRequestId })
  });
  if (!response.ok) throw new Error("Failed to create payment request");
  return response.json() as Promise<{ payment: Payment; paymentLink: string }>;
}

export async function getPayment(id: string) {
  const response = await fetch(`${API_BASE}/payments/${id}`);
  if (!response.ok) throw new Error("Payment not found");
  return response.json() as Promise<Payment>;
}

export async function getMerchantPayments(merchantAddress: string) {
  const response = await fetch(`${API_BASE}/merchant/${merchantAddress}/payments`);
  if (!response.ok) throw new Error("Failed to load merchant dashboard");
  return response.json() as Promise<Payment[]>;
}

export async function fetchQuote(amountUsdt: number, assets: WalletAsset[]) {
  const response = await fetch(`${API_BASE}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountUsdt, assets })
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.reason || "Quote failed");
  return json as RouteQuote;
}

export async function completePayment(id: string, txHash: string, receipt: unknown) {
  const response = await fetch(`${API_BASE}/payments/${id}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash, receipt })
  });
  if (!response.ok) throw new Error("Failed to finalize payment");
  return response.json() as Promise<Payment>;
}
