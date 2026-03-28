const demoMode = (import.meta.env.VITE_DEMO_MODE ?? "true") === "true";
const tronScanBaseUrl = import.meta.env.VITE_TRONSCAN_BASE_URL ?? "https://nile.tronscan.org/#";
const paymentProcessor = import.meta.env.VITE_PAYMENT_PROCESSOR ?? "";
const feeLimitSun = Number(import.meta.env.VITE_FEE_LIMIT_SUN ?? 120000000);
const paymentProcessorAbi = [
    {
        name: "requestCount",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }]
    },
    {
        name: "createPaymentRequest",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "merchant", type: "address" },
            { name: "amountUsdt", type: "uint256" },
            { name: "dueAt", type: "uint64" },
            { name: "merchantRef", type: "string" }
        ],
        outputs: [{ name: "requestId", type: "uint256" }]
    },
    {
        name: "recordSettlementReference",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "requestId", type: "uint256" },
            { name: "amountUsdt", type: "uint256" },
            { name: "payer", type: "address" },
            { name: "txHash", type: "bytes32" }
        ],
        outputs: [{ name: "reconciliationHash", type: "bytes32" }]
    },
    {
        name: "getPaymentRequestSummary",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "requestId", type: "uint256" }],
        outputs: [
            { name: "merchant", type: "address" },
            { name: "creator", type: "address" },
            { name: "amountUsdt", type: "uint256" },
            { name: "amountPaidUsdt", type: "uint256" },
            { name: "closed", type: "bool" },
            { name: "createdAt", type: "uint64" },
            { name: "dueAt", type: "uint64" },
            { name: "settlementCount", type: "uint256" },
            { name: "merchantRef", type: "string" }
        ]
    },
    {
        name: "getSettlement",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "requestId", type: "uint256" },
            { name: "settlementIndex", type: "uint256" }
        ],
        outputs: [
            { name: "amountUsdt", type: "uint256" },
            { name: "settledAt", type: "uint64" },
            { name: "payer", type: "address" },
            { name: "txHash", type: "bytes32" },
            { name: "reconciliationHash", type: "bytes32" }
        ]
    }
];
function randomHex(length) {
    const alphabet = "abcdef0123456789";
    let out = "";
    for (let index = 0; index < length; index += 1) {
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
}
function requireContract() {
    if (!window.tronWeb || !paymentProcessor) {
        throw new Error("Wallet or processor config missing");
    }
    return window.tronWeb.contract(paymentProcessorAbi, paymentProcessor);
}
function toUsdtUnits(amount) {
    return Math.round(amount * 1000000).toString();
}
function unixIso(secondsRaw) {
    const seconds = Number(String(secondsRaw ?? 0));
    if (!seconds) {
        return undefined;
    }
    return new Date(seconds * 1000).toISOString();
}
async function toBytes32(reference) {
    const trimmed = reference.trim();
    if (!trimmed) {
        throw new Error("Settlement reference is required.");
    }
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(trimmed)) {
        return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
    }
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(trimmed));
    return `0x${Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}
function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}
export function isDemoMode() {
    return demoMode;
}
export function getNetworkLabel() {
    return demoMode ? "Demo reconciliation mode" : "TRON Nile";
}
export function getExplorerTxUrl(txHash) {
    if (!txHash || txHash.startsWith("SIM_")) {
        return "";
    }
    return `${tronScanBaseUrl}/transaction/${txHash}`;
}
export function getExplorerAddressUrl(address) {
    if (!address) {
        return "";
    }
    return `${tronScanBaseUrl}/address/${address}`;
}
export async function connectWallet() {
    if (demoMode) {
        return { address: "TDEMO_COUNTERPARTY_ADDRESS" };
    }
    if (!window.tronLink) {
        throw new Error("TronLink not found");
    }
    await window.tronLink.request({ method: "tron_requestAccounts" });
    if (!window.tronWeb?.defaultAddress?.base58) {
        throw new Error("Wallet not connected");
    }
    return { address: window.tronWeb.defaultAddress.base58 };
}
export async function createOnchainPaymentRequest(merchantAddress, amountUsdt, label, dueAt) {
    if (demoMode) {
        return undefined;
    }
    await connectWallet();
    const contract = await requireContract();
    const requestCountRaw = await contract.requestCount().call();
    const requestId = Number(String(requestCountRaw));
    const dueAtUnix = dueAt ? Math.floor(new Date(dueAt).getTime() / 1000) : 0;
    const txHash = await contract.createPaymentRequest(merchantAddress, toUsdtUnits(amountUsdt), dueAtUnix, label).send({ feeLimit: feeLimitSun, shouldPollResponse: false });
    return {
        requestId,
        txHash: String(txHash)
    };
}
export async function anchorSettlementReference(params) {
    if (demoMode) {
        throw new Error("Live Nile anchoring is disabled in demo mode.");
    }
    const { address } = await connectWallet();
    const payer = params.payerAddress || address;
    const contract = await requireContract();
    const referenceBytes = await toBytes32(params.reference);
    const txHash = await contract.recordSettlementReference(params.requestId, toUsdtUnits(params.amountUsdt), payer, referenceBytes).send({ feeLimit: feeLimitSun, shouldPollResponse: false });
    return {
        txHash: String(txHash),
        payerAddress: payer,
        settledAt: new Date().toISOString()
    };
}
export async function waitForSettlementAnchor(requestId, previousSettlementCount = 0) {
    if (demoMode) {
        return undefined;
    }
    const contract = await requireContract();
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const summary = await contract.getPaymentRequestSummary(requestId).call();
        const settlementCount = Number(String(summary.settlementCount ?? summary[7] ?? 0));
        if (settlementCount > previousSettlementCount) {
            return {
                amountPaidUsdt: Number(String(summary.amountPaidUsdt ?? summary[3] ?? 0)) / 1000000,
                settlementCount,
                dueAt: unixIso(summary.dueAt ?? summary[6]),
                closed: Boolean(summary.closed ?? summary[4])
            };
        }
        await sleep(1500);
    }
    throw new Error("On-chain settlement anchor confirmation timed out");
}
export async function simulateSettlementReference(params) {
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    const txHash = `SIM_${params.invoiceId}_${randomHex(12)}`;
    return {
        txHash,
        settledAt: new Date().toISOString(),
        note: `Demo settlement simulated for ${params.amountUsdt.toFixed(2)} USDT to ${params.merchantAddress}.`,
        payerAddress: params.payerAddress
    };
}
