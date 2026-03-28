const API_BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4100";
export async function createPayment(input) {
    const response = await fetch(`${API_BASE}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
    });
    if (!response.ok) {
        throw new Error("Failed to create invoice");
    }
    return response.json();
}
export async function getPayment(id) {
    const response = await fetch(`${API_BASE}/payments/${id}`);
    if (!response.ok) {
        throw new Error("Invoice not found");
    }
    return response.json();
}
export async function getMerchantPayments(merchantAddress) {
    const response = await fetch(`${API_BASE}/merchant/${merchantAddress}/payments`);
    if (!response.ok) {
        throw new Error("Failed to load invoice dashboard");
    }
    return response.json();
}
export async function addSettlement(id, input) {
    const response = await fetch(`${API_BASE}/payments/${id}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
    });
    const json = await response.json();
    if (!response.ok) {
        throw new Error(json.error || "Failed to record settlement");
    }
    return json;
}
export async function recordFailedAttempt(id, reason, walletAddress) {
    await fetch(`${API_BASE}/payments/${id}/fail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, walletAddress })
    });
}
export function toReceipt(payment) {
    const latest = payment.settlements[payment.settlements.length - 1];
    if (!latest) {
        return null;
    }
    return {
        invoiceId: payment.id,
        amountUsdt: latest.amountUsdt,
        outstandingUsdt: payment.outstandingUsdt,
        txHash: latest.txHash,
        settledAt: latest.settledAt,
        method: latest.method,
        payerAddress: latest.payerAddress,
        note: latest.note,
        onchainRequestId: payment.onchainRequestId
    };
}
