const API_BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4100";
export async function createPayment(merchantAddress, amountUsdt, label, onchainRequestId) {
    const response = await fetch(`${API_BASE}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantAddress, amountUsdt, label, onchainRequestId })
    });
    if (!response.ok)
        throw new Error("Failed to create payment request");
    return response.json();
}
export async function getPayment(id) {
    const response = await fetch(`${API_BASE}/payments/${id}`);
    if (!response.ok)
        throw new Error("Payment not found");
    return response.json();
}
export async function getMerchantPayments(merchantAddress) {
    const response = await fetch(`${API_BASE}/merchant/${merchantAddress}/payments`);
    if (!response.ok)
        throw new Error("Failed to load merchant dashboard");
    return response.json();
}
export async function fetchQuote(amountUsdt, assets) {
    const response = await fetch(`${API_BASE}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsdt, assets })
    });
    const json = await response.json();
    if (!response.ok)
        throw new Error(json.reason || "Quote failed");
    return json;
}
export async function completePayment(id, txHash, receipt) {
    const response = await fetch(`${API_BASE}/payments/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, receipt })
    });
    if (!response.ok)
        throw new Error("Failed to finalize payment");
    return response.json();
}
