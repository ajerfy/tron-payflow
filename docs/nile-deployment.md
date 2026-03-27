# Nile Deployment Guide

## 1) Deploy Contracts

Use TronBox or Tron IDE with Solidity `0.8.24` compatible compiler.

Deploy order:

1. `MockTRC20` (or real USDT address on Nile)
2. `MockRouterAdapter` (set USDT address)
3. `PaymentProcessor` (USDT + Router addresses)

If using real DEXs, deploy adapter contracts and pass coordinator/router address into `PaymentProcessor`.

## 2) Configure Frontend Env

Create `frontend/.env`:

```bash
VITE_BACKEND_URL=http://localhost:4100
VITE_DEMO_MODE=false
VITE_PAYMENT_PROCESSOR=TNILE_PAYMENT_PROCESSOR_ADDRESS
VITE_USDT=TNILE_USDT_ADDRESS
VITE_FEE_LIMIT_SUN=120000000
VITE_PAYMENT_DEADLINE_SECONDS=900
VITE_SUPPORTED_ASSETS_JSON=[{"token":"TWTRX_ADDRESS","symbol":"WTRX","decimals":6,"usdtRate":0.11,"feeBps":30},{"token":"TJST_ADDRESS","symbol":"JST","decimals":18,"usdtRate":0.19,"feeBps":35},{"token":"TSUN_ADDRESS","symbol":"SUN","decimals":18,"usdtRate":0.14,"feeBps":40}]
```

Use `VITE_DEMO_MODE=true` only for offline demo simulation.

## 3) TronLink + Nile Setup

- install TronLink extension
- switch network to Nile testnet
- fund payer wallet with test TRX for energy/bandwidth

## 4) Production Swap Integration Notes

- map route legs to SunSwap/JustMoney swap calls
- compute and validate `amountOutMin` per hop
- preserve exact-output final USDT by adding input buffer and strict refund path
- optionally integrate fee delegation for smoother UX

## 5) Live User Flow (Now Wired)

1. Merchant clicks "Create Payment Link" in frontend.
2. Frontend creates on-chain payment request using `createPaymentRequest`.
3. Backend stores link + `onchainRequestId`.
4. Payer opens link, balances are read via TronWeb.
5. Quote route is computed by backend.
6. Payer clicks pay:
   - TRC-20 approvals are sent
   - `executeIntentPayment` is simulated (`.call()`) for safety
   - live tx is broadcast (`.send()`)
7. Backend marks payment paid and stores receipt.
