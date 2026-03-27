# Architecture Overview

## High-Level Components

1. Checkout UI (`frontend`)
2. Merchant dashboard (`frontend`)
3. Routing/index API (`backend`)
4. Settlement contracts (`contracts`)

## Smart Contract Design

- `PaymentProcessor.sol`
  - stores payment requests and statuses
  - executes intent payments with exact-output requirement
  - emits settlement/failure events for reconciliation
- `MockRouterAdapter.sol`
  - computes token usage across multiple assets
  - returns exact USDT output and fee/input metrics
  - acts as adapter abstraction for DEX integrations

To go live, replace `MockRouterAdapter` with:

- `SunSwapV2Adapter.sol`
- `SunSwapV3Adapter.sol`
- `JustMoneyAdapter.sol`

then select route by best quote in a coordinator.

## Intent and Execution Model

Intent in UI:

`Pay X USDT to Merchant Y before deadline`

Execution:

1. UI computes route quote and slippage buffer.
2. Payer signs one `executeIntentPayment(...)` call.
3. Contract enforces exact USDT out and max input value guard.

## Failure Handling

- insufficient asset or liquidity -> `InsufficientLiquidity`
- stale quote / over input -> `SlippageExceeded`
- expired user action -> `DeadlineExceeded`
- energy/bandwidth issues are surfaced at wallet tx stage (frontend hinting included)

## Reconciliation

- `PaymentSettled` event captures request id, payer, merchant, total input/fees
- request stores `reconciliationHash`
- merchant dashboard exports payment history JSON
