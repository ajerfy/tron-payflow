# Submission Runbook

## Local Validation

1. Contracts:
   - `cd contracts && npm install && npm test`
2. Backend:
   - `cd backend && npm install && npm run build`
3. Frontend:
   - `cd frontend && npm install && npm run build`

## Demo Recording Flow

1. Start backend (`npm run dev`).
2. Start frontend (`npm run dev`).
3. Merchant:
   - create payment link (e.g. 50 USDT).
4. Payer:
   - open payment link
   - connect wallet
   - compute route
   - click pay once
5. Show success state:
   - tx hash
   - assets used
   - fee breakdown
   - receipt JSON download
6. Return to merchant dashboard:
   - show paid status
   - reconciliation export JSON

## Judge Talking Points

- Intent-based UX: payer states outcome, not swap path.
- Exact-output guarantee for merchant denomination.
- Multi-asset aggregation and route optimization.
- Robust TRON-specific failure messaging (energy/bandwidth).
- Modular adapter architecture for SunSwap/JustMoney expansion.
