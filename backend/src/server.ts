import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  addSettlementRecord,
  createPaymentRecord,
  derivePaymentStatus,
  recordPaymentFailure,
  summarizeMerchantPortfolio,
  type PaymentRecord
} from "./domain.js";
import { loadPayments, savePayments } from "./store.js";

const app = express();
app.use(cors());
app.use(express.json());

const createPaymentSchema = z.object({
  merchantAddress: z.string().min(8),
  merchantName: z.string().min(2).max(60),
  supportEmail: z.string().email(),
  amountUsdt: z.number().positive(),
  label: z.string().min(1).max(120),
  category: z.string().min(2).max(60),
  counterpartyName: z.string().min(2).max(80),
  counterpartyEmail: z.string().email(),
  notes: z.string().max(300).optional(),
  network: z.enum(["demo", "nile"]).default("demo"),
  onchainRequestId: z.number().int().nonnegative().optional(),
  onchainInvoiceTxHash: z.string().min(8).optional(),
  dueAt: z.string().datetime().optional()
});

const settlementSchema = z.object({
  amountUsdt: z.number().positive(),
  txHash: z.string().min(4),
  settledAt: z.string().datetime(),
  payerAddress: z.string().min(8).optional(),
  note: z.string().max(240).optional(),
  method: z.enum(["demo", "tron_tx", "manual"]),
  referenceLabel: z.string().max(120).optional()
});

const failureSchema = z.object({
  reason: z.string().min(3).max(240),
  walletAddress: z.string().min(8).optional()
});

const payments = loadPayments();

function toClientPayment(payment: PaymentRecord) {
  const status = derivePaymentStatus(payment);
  const outstandingUsdt = Number(Math.max(payment.amountUsdt - payment.amountPaidUsdt, 0).toFixed(6));
  return {
    ...payment,
    status,
    outstandingUsdt
  };
}

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "tron-payflow-backend" });
});

app.post("/payments", (req, res) => {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const payment = createPaymentRecord(parsed.data);
  payments.set(payment.id, payment);
  savePayments(payments);
  return res.json({ payment: toClientPayment(payment), paymentLink: `/pay/${payment.id}` });
});

app.get("/payments/:id", (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) {
    return res.status(404).json({ error: "NOT_FOUND" });
  }

  res.json(toClientPayment(payment));
});

app.get("/merchant/:merchantAddress/payments", (req, res) => {
  const items = [...payments.values()]
    .filter((payment) => payment.merchantAddress === req.params.merchantAddress)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(toClientPayment);

  res.json({
    items,
    portfolio: summarizeMerchantPortfolio(items)
  });
});

app.post("/payments/:id/settlements", (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) {
    return res.status(404).json({ error: "NOT_FOUND" });
  }

  const parsed = settlementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const updated = addSettlementRecord(payment, parsed.data);
    payments.set(req.params.id, updated);
    savePayments(payments);
    return res.json(toClientPayment(updated));
  } catch (error) {
    return res.status(409).json({ error: (error as Error).message });
  }
});

app.post("/payments/:id/fail", (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) {
    return res.status(404).json({ error: "NOT_FOUND" });
  }

  const parsed = failureSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const updated = recordPaymentFailure(payment, parsed.data.reason, parsed.data.walletAddress);
  payments.set(req.params.id, updated);
  savePayments(payments);
  res.json(toClientPayment(updated));
});

const port = Number(process.env.PORT || 4100);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`TRON PayFlow backend listening on :${port}`);
});
