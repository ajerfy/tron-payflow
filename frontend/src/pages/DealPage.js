import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { startTransition, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DealDetail } from "../components/DealDetail";
import { ErrorMessage } from "../components/ErrorMessage";
import { useContract } from "../hooks/useContract";
import { useTronWeb } from "../hooks/useTronWeb";
import { explorerTx } from "../utils/tronHelpers";
export function DealPage() {
    const { dealId = "" } = useParams();
    const numericDealId = Number(dealId);
    const { address, connect, error: walletError, refreshBalances } = useTronWeb();
    const contract = useContract(address);
    const [deal, setDeal] = useState(null);
    const [pendingTxHash, setPendingTxHash] = useState("");
    const [pendingLabel, setPendingLabel] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    function patchDeal(mutator) {
        startTransition(() => {
            setDeal((current) => (current ? mutator(current) : current));
        });
    }
    async function refreshDeal(options) {
        setIsRefreshing(true);
        try {
            const withBalances = options?.withBalances ?? false;
            const [next] = await Promise.all([
                contract.refreshDeal(numericDealId),
                withBalances && address ? refreshBalances(address) : Promise.resolve()
            ]);
            if (next) {
                startTransition(() => {
                    setDeal(next);
                });
            }
        }
        finally {
            setIsRefreshing(false);
        }
    }
    async function reconcileDeal(predicate, options) {
        try {
            const next = await contract.waitForDealUpdate(numericDealId, predicate);
            startTransition(() => {
                setDeal(next);
            });
            if (options?.withBalances && address) {
                void refreshBalances(address);
            }
            setPendingTxHash("");
            setPendingLabel("");
        }
        catch {
            if (options?.clearPendingOnError) {
                setPendingTxHash("");
                setPendingLabel("");
            }
        }
    }
    useEffect(() => {
        if (Number.isFinite(numericDealId) && address) {
            void refreshDeal({ withBalances: true });
        }
    }, [numericDealId, address]);
    useEffect(() => {
        if (!deal || !address) {
            return;
        }
        if (!["Created", "Accepted", "BothFunded", "Disputed"].includes(deal.status)) {
            return;
        }
        const intervalMs = pendingTxHash ? 2500 : 5000;
        const interval = window.setInterval(() => {
            void refreshDeal();
        }, intervalMs);
        return () => window.clearInterval(interval);
    }, [deal?.id, deal?.status, address, pendingTxHash]);
    if (!address) {
        return (_jsxs("div", { className: "page-shell", children: [_jsxs("div", { className: "panel", children: [_jsxs("h1", { children: ["Connect wallet to view deal #", numericDealId] }), _jsx("button", { className: "primary-button", onClick: connect, children: "Connect TronLink" }), _jsx("p", { className: "muted", children: _jsx(Link, { to: "/", children: "Back to dashboard" }) })] }), _jsx(ErrorMessage, { error: walletError })] }));
    }
    if (!deal) {
        return _jsx("div", { className: "page-shell", children: _jsx("div", { className: "panel", children: _jsxs("p", { children: ["Loading deal #", numericDealId, "..."] }) }) });
    }
    const actions = contract.actionState(deal, address);
    return (_jsxs("div", { className: "page-shell", children: [_jsx("p", { children: _jsx(Link, { className: "text-link", to: "/", children: "\u2190 Back to dashboard" }) }), _jsx(ErrorMessage, { error: walletError ?? contract.error }), pendingTxHash ? (_jsxs("div", { className: "panel", children: [_jsx("h3", { children: "Pending transaction" }), _jsx("p", { children: pendingLabel || "Waiting for Nile confirmation." }), _jsxs("p", { children: [_jsx("strong", { children: "Tx hash:" }), " ", _jsx("a", { className: "mono", href: explorerTx(pendingTxHash), target: "_blank", rel: "noreferrer", children: pendingTxHash })] })] })) : null, _jsx(DealDetail, { deal: deal, walletAddress: address, activity: contract.getDealActivity(deal.id), isRefreshing: isRefreshing, canAccept: actions.canAccept, canFund: actions.canFund, canConfirm: actions.canConfirm, canExecuteSettlement: actions.canExecuteSettlement, canDispute: actions.canDispute, canResolve: actions.canResolve, canExpire: actions.canExpire, canCancel: actions.canCancel, onRefresh: refreshDeal, onAccept: async () => {
                    setPendingLabel("Waiting for Party B acceptance to confirm on Nile.");
                    const txHash = await contract.acceptDeal(deal.id);
                    setPendingTxHash(txHash);
                    patchDeal((current) => ({ ...current, status: "Accepted" }));
                    void reconcileDeal((candidate) => candidate.status !== "Created", { withBalances: true, clearPendingOnError: true });
                }, onFund: async () => {
                    const isPartyA = address === deal.partyA;
                    setPendingLabel("Waiting for escrow funding to confirm on Nile.");
                    const txHash = await contract.fundDeal(deal);
                    setPendingTxHash(txHash);
                    patchDeal((current) => ({
                        ...current,
                        partyAFunded: isPartyA ? true : current.partyAFunded,
                        partyBFunded: isPartyA ? current.partyBFunded : true
                    }));
                    void reconcileDeal((candidate) => (isPartyA ? candidate.partyAFunded : candidate.partyBFunded), { withBalances: true, clearPendingOnError: true });
                }, onConfirm: async () => {
                    const isPartyA = address === deal.partyA;
                    setPendingLabel("Waiting for confirmation signature to settle readiness on Nile.");
                    const txHash = await contract.confirmSettlement(deal);
                    setPendingTxHash(txHash);
                    patchDeal((current) => ({
                        ...current,
                        partyAConfirmed: isPartyA ? true : current.partyAConfirmed,
                        partyBConfirmed: isPartyA ? current.partyBConfirmed : true
                    }));
                    void reconcileDeal((candidate) => isPartyA ? candidate.partyAConfirmed : candidate.partyBConfirmed, { withBalances: false, clearPendingOnError: false });
                }, onExecuteSettlement: async () => {
                    setPendingLabel("Waiting for final settlement execution on Nile.");
                    const txHash = await contract.executeSettlement(deal);
                    setPendingTxHash(txHash);
                    patchDeal((current) => ({ ...current, status: "Settled" }));
                    void reconcileDeal((candidate) => candidate.status === "Settled", { withBalances: true, clearPendingOnError: false });
                }, onDispute: async (reason) => {
                    setPendingLabel("Waiting for dispute filing on Nile.");
                    const txHash = await contract.raiseDispute(deal.id, reason);
                    setPendingTxHash(txHash);
                    patchDeal((current) => ({ ...current, status: "Disputed", disputeReason: reason }));
                    void reconcileDeal((candidate) => candidate.status === "Disputed", { withBalances: true, clearPendingOnError: true });
                }, onResolve: async (refundBoth) => {
                    setPendingLabel("Waiting for dispute resolution on Nile.");
                    const txHash = await contract.resolveDispute(deal.id, refundBoth);
                    setPendingTxHash(txHash);
                    patchDeal((current) => ({ ...current, status: "Resolved" }));
                    void reconcileDeal((candidate) => candidate.status === "Resolved", { withBalances: true, clearPendingOnError: true });
                }, onExpire: async () => {
                    setPendingLabel("Waiting for expiry claim on Nile.");
                    const txHash = await contract.claimExpired(deal.id);
                    setPendingTxHash(txHash);
                    patchDeal((current) => ({ ...current, status: "Expired" }));
                    void reconcileDeal((candidate) => candidate.status === "Expired", { withBalances: true, clearPendingOnError: true });
                }, onCancel: async () => {
                    setPendingLabel("Waiting for cancellation on Nile.");
                    const txHash = await contract.cancelDeal(deal.id);
                    setPendingTxHash(txHash);
                    patchDeal((current) => ({ ...current, status: "Cancelled" }));
                    void reconcileDeal((candidate) => candidate.status === "Cancelled", { withBalances: true, clearPendingOnError: true });
                } })] }));
}
