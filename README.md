# TRON PayFlow: Intent-Based Payment Router

TRON PayFlow is a full-stack hackathon demo for intent-based stablecoin checkout on TRON (Nile).  
Merchants request exact USDT (TRC-20), payers pay with any supported assets, and the system routes + settles to exact USDT.

## Product Journey

1. Merchant creates a payment request (`Pay 50 USDT`).
2. System generates payment link (`/pay/:id`).
3. Payer opens link, wallet balances are scanned.
4. Routing engine suggests best multi-asset strategy.
5. Payer signs one intent execution transaction.
6. On-chain processor swaps and sends exact USDT to merchant.
7. Receipt view shows tx hash, fee breakdown, assets used.

## Monorepo Structure

- `contracts/` - Solidity smart contracts + tests + deploy scripts
- `backend/` - Routing/index API (Express + TypeScript)
- `frontend/` - React checkout and merchant dashboard (Vite + TS)
- `scripts/` - Integration and demo helpers
- `docs/` - Architecture and Nile deployment notes

## Key Components

- `PaymentProcessor.sol`:
  - payment intent lifecycle
  - exact USDT settlement guarantee
  - failure logging and reconciliation hash
- `MockRouterAdapter.sol`:
  - route adapter abstraction (replaceable with SunSwap/JustMoney adapters)
  - multi-asset exact output swapping
- Frontend:
  - merchant request creation + dashboard
  - payer checkout flow with recommended route
  - failure handling UX and receipts export
- Backend:
  - quote endpoint, route computation, transaction indexing cache

## Quick Start

### 1) Contracts

```bash
cd contracts
npm install
npm test
```

### 2) Backend

```bash
cd backend
npm install
npm run dev
```

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

## Demo Mode

Set `VITE_DEMO_MODE=true` in `frontend/.env` to:

- preload fake balances
- simulate route and settlement data
- bypass wallet requirement for UI demos

## Nile Testnet Notes

- configure TronLink to Nile
- set `VITE_PAYMENT_PROCESSOR` and token addresses in frontend env
- use `tronbox` or Tron IDE deployment flow from `docs/nile-deployment.md`

## Example Test Transactions

From contract tests:

- Request: `50 USDT`
- Inputs: `400 WTRX + 300 JST`
- Output: merchant receives exactly `50 USDT`
- Slippage failure and liquidity failure scenarios are also covered

## Submission Checklist

- [x] Tests-first smart contract implementation
- [x] Exact USDT settlement and intent execution flow
- [x] Merchant dashboard + payer checkout UX
- [x] Failure handling with actionable UX hints
- [x] Receipt generation and export
- [x] Demo mode and live mode toggle
- [x] Nile deployment and env documentation
