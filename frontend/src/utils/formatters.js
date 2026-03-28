import { TOKENS } from "./constants";
export function truncateAddress(address, lead = 6, tail = 4) {
    if (!address) {
        return "Not connected";
    }
    if (address.length <= lead + tail) {
        return address;
    }
    return `${address.slice(0, lead)}...${address.slice(-tail)}`;
}
export function formatDate(timestampSeconds) {
    if (!timestampSeconds) {
        return "Not set";
    }
    return new Date(timestampSeconds * 1000).toLocaleString();
}
export function formatAmount(rawAmount, tokenAddress) {
    const token = TOKENS.find((entry) => entry.address === tokenAddress || (tokenAddress === "TRX" && entry.symbol === "TRX"));
    const decimals = token?.decimals ?? 6;
    const divisor = 10 ** decimals;
    const numeric = Number(rawAmount) / divisor;
    return `${numeric.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: token?.symbol === "TRX" ? 3 : 2
    })} ${token?.label ?? "TOKEN"}`;
}
export function statusTone(status) {
    switch (status) {
        case "Settled":
        case "Resolved":
            return "status-green";
        case "Created":
        case "Accepted":
        case "BothFunded":
            return "status-amber";
        case "Disputed":
            return "status-red";
        default:
            return "status-gray";
    }
}
export function makeReceiptSummary(input) {
    return [
        `OTC Settlement Receipt`,
        `Deal ID: ${input.dealId}`,
        `Party A: ${input.partyA}`,
        `Party B: ${input.partyB}`,
        `Assets: ${input.assetA} for ${input.assetB}`,
        `Settled at: ${input.settledAt ? formatDate(input.settledAt) : "Pending"}`,
        `Transaction hashes:`,
        ...input.txHashes.map((hash) => `- ${hash}`)
    ].join("\n");
}
