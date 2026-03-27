import cors from "cors";
import express from "express";
import { z } from "zod";

const app = express();
app.use(cors());
app.use(express.json());

type Asset = { token: string; symbol: string; balance: number; usdtRate: number; feeBps: number };

const defaultAssets: Asset[] = [
  { token: "TRX", symbol: "TRX", balance: 1200, usdtRate: 0.11, feeBps: 30 },
  { token: "JST", symbol: "JST", balance: 900, usdtRate: 0.19, feeBps: 35 },
  { token: "SUN", symbol: "SUN", balance: 500, usdtRate: 0.15, feeBps: 40 }
];

const createPaymentSchema = z.object({
  merchantAddress: z.string().min(8),
  amountUsdt: z.number().positive(),
  label: z.string().min(1),
  onchainRequestId: z.number().int().nonnegative().optional()
});

const quoteSchema = z.object({
  amountUsdt: z.number().positive(),
  assets: z.array(
    z.object({
      token: z.string(),
      symbol: z.string(),
      balance: z.number().nonnegative(),
      usdtRate: z.number().positive(),
      feeBps: z.number().int().min(0).max(1000)
    })
  ).min(1)
});

const payments = new Map<string, {
  id: string;
  merchantAddress: string;
  amountUsdt: number;
  label: string;
  status: "pending" | "paid" | "failed";
  txHash?: string;
  createdAt: string;
  receipt?: unknown;
}>();

function computeRoute(amountUsdt: number, assets: Asset[]) {
  const sorted = [...assets].sort((a, b) => (b.usdtRate * (1 - b.feeBps / 10000)) - (a.usdtRate * (1 - a.feeBps / 10000)));
  let remaining = amountUsdt;
  const legs: Array<{ token: string; symbol: string; amountIn: number; netUsdt: number; feeUsdt: number }> = [];
  let totalFee = 0;
  let totalInputValue = 0;

  for (const a of sorted) {
    if (remaining <= 0) break;
    const netRate = a.usdtRate * (1 - a.feeBps / 10000);
    const maxNet = a.balance * netRate;
    const takeNet = Math.min(maxNet, remaining);
    if (takeNet <= 0) continue;

    const amountIn = takeNet / netRate;
    const gross = amountIn * a.usdtRate;
    const fee = gross - takeNet;
    legs.push({ token: a.token, symbol: a.symbol, amountIn, netUsdt: takeNet, feeUsdt: fee });
    totalFee += fee;
    totalInputValue += gross;
    remaining -= takeNet;
  }

  if (remaining > 1e-6) {
    return {
      ok: false,
      reason: "INSUFFICIENT_LIQUIDITY_OR_BALANCE"
    };
  }

  return {
    ok: true,
    amountUsdt,
    totalFeeUsdt: totalFee,
    totalInputValueUsdt: totalInputValue,
    slippageBufferUsdt: amountUsdt * 0.01,
    legs
  };
}

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "tron-payflow-backend" });
});

app.post("/payments", (req, res) => {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = `pay_${Date.now()}`;
  const payment = {
    id,
    merchantAddress: parsed.data.merchantAddress,
    amountUsdt: parsed.data.amountUsdt,
    label: parsed.data.label,
    onchainRequestId: parsed.data.onchainRequestId,
    status: "pending" as const,
    createdAt: new Date().toISOString()
  };
  payments.set(id, payment);
  return res.json({ payment, paymentLink: `/pay/${id}` });
});

app.get("/payments/:id", (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(payment);
});

app.get("/merchant/:merchantAddress/payments", (req, res) => {
  const items = [...payments.values()].filter((p) => p.merchantAddress === req.params.merchantAddress);
  res.json(items);
});

app.post("/quote", (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const route = computeRoute(parsed.data.amountUsdt, parsed.data.assets);
  if (!route.ok) return res.status(422).json(route);
  return res.json(route);
});

app.post("/payments/:id/complete", (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) return res.status(404).json({ error: "NOT_FOUND" });

  const txHash = (req.body?.txHash as string | undefined) ?? `SIM_${Date.now()}`;
  const receipt = req.body?.receipt ?? {};
  const updated = { ...payment, status: "paid" as const, txHash, receipt };
  payments.set(req.params.id, updated);
  res.json(updated);
});

const port = Number(process.env.PORT || 4100);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`TRON PayFlow backend listening on :${port}`);
});
