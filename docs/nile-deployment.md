# Nile Deployment Guide

## 1) Deploy Contracts

Deploy the contracts in this order:

1. `MockTRC20` for the supported payer assets and settlement USDT, or substitute the Nile token addresses you plan to demo with
2. `MockRouterAdapter` using the settlement USDT address
3. `PaymentProcessor` using the USDT and router addresses

The contract now supports:

- invoice expiry via `createPaymentRequest(amountUsdt, expiresAt, merchantRef)`
- on-chain verification via `getPaymentRequestSummary(requestId)`

## 2) Configure Frontend Env

Create `frontend/.env`:

```bash
VITE_BACKEND_URL=http://localhost:4100
VITE_DEMO_MODE=false
VITE_PAYMENT_PROCESSOR=TNILE_PAYMENT_PROCESSOR_ADDRESS
VITE_FEE_LIMIT_SUN=120000000
VITE_PAYMENT_DEADLINE_SECONDS=900
VITE_TRONSCAN_BASE_URL=https://nile.tronscan.org/#
VITE_SUPPORTED_ASSETS_JSON=[{"token":"TWTRX_ADDRESS","symbol":"WTRX","decimals":6,"usdtRate":0.11,"feeBps":30},{"token":"TJST_ADDRESS","symbol":"JST","decimals":18,"usdtRate":0.19,"feeBps":35},{"token":"TSUN_ADDRESS","symbol":"SUN","decimals":18,"usdtRate":0.14,"feeBps":40}]
```

## 3) TronLink and Wallet Setup

- Install TronLink
- Switch the wallet to Nile testnet
- Create at least two accounts: one merchant and one payer
- Fund the payer with TRX for energy/bandwidth and the supported tokens used in the route

## 4) What the UI Verifies

After a successful payment, the frontend reads `getPaymentRequestSummary(requestId)` and stores:

- request id
- merchant address
- payer address
- amount settled
- total input value
- total fee
- reconciliation hash
- paid timestamp

The receipt view then shows:

- the tx hash
- a TronScan link
- the on-chain request id
- the reconciliation hash

## 5) Live Demo Flow on Nile

1. Merchant opens the dashboard and enters wallet, support email, and invoice expiry.
2. Merchant creates an invoice and receives a pay link.
3. Payer opens the link, connects TronLink, and computes the route.
4. Payer reviews fees, signs approvals if needed, and executes the payment.
5. UI shows the tx hash and on-chain verification details.
6. Merchant dashboard shows the invoice as paid and includes it in reconciliation export.

## 6) Production Hardening Ideas

- Replace `MockRouterAdapter` with a Nile-compatible DEX integration
- Add backend-side chain verification instead of trusting the browser to post proof
- Add fee delegation or gas sponsorship for smoother retail UX
- Persist payments in a database instead of in-memory storage
