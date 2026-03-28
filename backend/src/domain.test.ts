import test from "node:test";
import assert from "node:assert/strict";
import {
  addSettlementRecord,
  createPaymentRecord,
  derivePaymentStatus,
  recordPaymentFailure,
  summarizeMerchantPortfolio
} from "./domain.js";

test("partial settlement updates outstanding balance and status", () => {
  const invoice = createPaymentRecord({
    merchantAddress: "TISSUER123",
    merchantName: "South Loop Prime",
    supportEmail: "ops@southloop.test",
    amountUsdt: 120,
    label: "LP Fee March",
    category: "Liquidity provision",
    counterpartyName: "Northstar Capital",
    counterpartyEmail: "settlements@northstar.test",
    network: "demo",
    dueAt: "2026-03-30T10:00:00.000Z"
  }, new Date("2026-03-28T09:00:00.000Z"));

  const updated = addSettlementRecord(invoice, {
    amountUsdt: 50,
    txHash: "SIM_TX_001",
    settledAt: "2026-03-28T09:15:00.000Z",
    payerAddress: "TPAYER001",
    method: "demo",
    referenceLabel: "first tranche"
  });

  assert.equal(updated.amountPaidUsdt, 50);
  assert.equal(updated.status, "partial");
  assert.equal(updated.settlements.length, 1);
  assert.match(updated.reconciliationNotes[0]?.message ?? "", /70\.00 USDT remains outstanding/);
});

test("full settlement marks invoice paid", () => {
  const invoice = createPaymentRecord({
    merchantAddress: "TISSUER123",
    merchantName: "South Loop Prime",
    supportEmail: "ops@southloop.test",
    amountUsdt: 80,
    label: "Broker Fee 1007",
    category: "Broker services",
    counterpartyName: "Acadia Trading",
    counterpartyEmail: "ap@acadia.test",
    network: "demo"
  }, new Date("2026-03-28T09:00:00.000Z"));

  const updated = addSettlementRecord(invoice, {
    amountUsdt: 80,
    txHash: "TRX_ABC_123",
    settledAt: "2026-03-28T09:18:00.000Z",
    method: "manual"
  });

  assert.equal(updated.status, "paid");
  assert.equal(updated.paidAt, "2026-03-28T09:18:00.000Z");
  assert.equal(updated.txHash, "TRX_ABC_123");
});

test("overpayment is rejected", () => {
  const invoice = createPaymentRecord({
    merchantAddress: "TISSUER123",
    merchantName: "South Loop Prime",
    supportEmail: "ops@southloop.test",
    amountUsdt: 80,
    label: "Broker Fee 1007",
    category: "Broker services",
    counterpartyName: "Acadia Trading",
    counterpartyEmail: "ap@acadia.test",
    network: "demo"
  }, new Date("2026-03-28T09:00:00.000Z"));

  assert.throws(() => addSettlementRecord(invoice, {
    amountUsdt: 120,
    txHash: "TRX_TOO_BIG",
    settledAt: "2026-03-28T09:18:00.000Z",
    method: "manual"
  }));
});

test("failed attempt is logged without blocking future collection", () => {
  const invoice = createPaymentRecord({
    merchantAddress: "TISSUER123",
    merchantName: "South Loop Prime",
    supportEmail: "ops@southloop.test",
    amountUsdt: 95,
    label: "OTC Desk Settlement",
    category: "OTC trade fee",
    counterpartyName: "Blue Mesa",
    counterpartyEmail: "ops@bluemesa.test",
    network: "demo"
  }, new Date("2026-03-28T09:00:00.000Z"));

  const failed = recordPaymentFailure(invoice, "Counterparty submitted the wrong tx hash.", "TPAYER002", new Date("2026-03-28T09:21:00.000Z"));

  assert.equal(failed.status, "pending");
  assert.equal(failed.attemptCount, 1);
  assert.equal(failed.reconciliationNotes[0]?.kind, "failed-attempt");
});

test("portfolio summary aggregates paid, outstanding, and collection rate", () => {
  const pending = createPaymentRecord({
    merchantAddress: "TISSUER123",
    merchantName: "South Loop Prime",
    supportEmail: "ops@southloop.test",
    amountUsdt: 100,
    label: "Invoice A",
    category: "Trading fee",
    counterpartyName: "Alpha",
    counterpartyEmail: "ops@alpha.test",
    network: "demo"
  }, new Date("2026-03-28T09:00:00.000Z"));

  const paid = addSettlementRecord(createPaymentRecord({
    merchantAddress: "TISSUER123",
    merchantName: "South Loop Prime",
    supportEmail: "ops@southloop.test",
    amountUsdt: 200,
    label: "Invoice B",
    category: "Broker services",
    counterpartyName: "Bravo",
    counterpartyEmail: "ops@bravo.test",
    network: "demo"
  }, new Date("2026-03-28T09:00:00.000Z")), {
    amountUsdt: 200,
    txHash: "TRX_PAID",
    settledAt: "2026-03-28T10:00:00.000Z",
    method: "manual"
  });

  const overdue = createPaymentRecord({
    merchantAddress: "TISSUER123",
    merchantName: "South Loop Prime",
    supportEmail: "ops@southloop.test",
    amountUsdt: 150,
    label: "Invoice C",
    category: "Liquidity provision",
    counterpartyName: "Charlie",
    counterpartyEmail: "ops@charlie.test",
    network: "demo",
    dueAt: "2026-03-27T09:00:00.000Z"
  }, new Date("2026-03-28T09:00:00.000Z"));

  overdue.status = derivePaymentStatus(overdue, "2026-03-28T09:00:00.000Z");

  const summary = summarizeMerchantPortfolio([pending, paid, overdue]);
  assert.equal(summary.issued, 450);
  assert.equal(summary.collected, 200);
  assert.equal(summary.outstanding, 250);
  assert.equal(summary.paid, 1);
  assert.equal(summary.pending, 1);
  assert.equal(summary.overdue, 1);
});
