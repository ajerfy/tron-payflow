import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { ConnectWallet } from "../components/ConnectWallet";
import { Dashboard } from "../components/Dashboard";
import { ErrorMessage } from "../components/ErrorMessage";
import { useContract } from "../hooks/useContract";
import { useTronWeb } from "../hooks/useTronWeb";
export function HomePage() {
    const { address, balances, error: walletError, connect, isConnecting, isReady, refreshBalances } = useTronWeb();
    const { error: contractError, loadMyDeals, createDeal } = useContract(address);
    const [deals, setDeals] = useState([]);
    async function refreshDeals() {
        if (!address) {
            return;
        }
        const [nextDeals] = await Promise.all([
            loadMyDeals(),
            refreshBalances(address)
        ]);
        setDeals(nextDeals);
    }
    useEffect(() => {
        if (isReady && address) {
            void refreshDeals();
        }
    }, [isReady, address]);
    return (_jsxs("div", { className: "page-shell", children: [_jsx(ConnectWallet, { address: address, balances: balances, isConnecting: isConnecting, onConnect: connect }), _jsx(ErrorMessage, { error: walletError ?? contractError }), address ? _jsx(Dashboard, { deals: deals, walletAddress: address, onCreate: async (input) => {
                    await createDeal(input);
                    await refreshDeals();
                } }) : null] }));
}
