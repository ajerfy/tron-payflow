# Submission Runbook

## Validation

1. Contracts:
   - `cd contracts && npm install && npm test`
2. Backend:
   - `cd backend && npm install && npm test && npm run build`
3. Frontend:
   - `cd frontend && npm install && npm run build`

## Demo Recording Flow

1. Start backend with `npm run dev`.
2. Start frontend with `npm run dev`.
3. Merchant setup:
   - show merchant profile, support email, and payout wallet
   - create a time-limited invoice
4. Payer checkout:
   - open the payment link
   - connect TronLink on Nile
   - compute route and review fees
   - execute payment
5. Show success proof:
   - tx hash
   - TronScan link
   - on-chain request id
   - reconciliation hash
   - receipt JSON download
6. Return to merchant dashboard:
   - show paid status
   - show attempt count / failure recovery if relevant
   - export reconciliation JSON

## Judge Talking Points

- This is a merchant checkout product, not a simple send/receive wallet.
- Merchant and payer each have a clear role and UX.
- The contract exposes verifiable request state for the UI to read back after payment.
- The checkout explains route cost, slippage buffer, and common TRON failure cases.
- The merchant side includes support contact, invoice expiry, and reconciliation export.
