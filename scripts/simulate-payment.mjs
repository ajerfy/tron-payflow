/**
 * Demo script: simulate end-to-end payment through backend APIs.
 */
const API = process.env.API ?? "http://localhost:4100";

async function run() {
  const createRes = await fetch(`${API}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantAddress: "TMERCHANT_DEMO_ADDR",
      amountUsdt: 50,
      label: "Hackathon Demo Invoice"
    })
  });
  const created = await createRes.json();
  const paymentId = created.payment.id;

  const quoteRes = await fetch(`${API}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amountUsdt: 50,
      assets: [
        { token: "TRX", symbol: "TRX", balance: 800, usdtRate: 0.11, feeBps: 30 },
        { token: "JST", symbol: "JST", balance: 200, usdtRate: 0.19, feeBps: 35 }
      ]
    })
  });
  const quote = await quoteRes.json();

  const txHash = `SIMULATED_NILE_TX_${Date.now()}`;
  const completeRes = await fetch(`${API}/payments/${paymentId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      txHash,
      receipt: {
        amountUsdt: 50,
        assetsUsed: quote.legs,
        totalFeeUsdt: quote.totalFeeUsdt,
        txHash,
        paidAt: new Date().toISOString()
      }
    })
  });
  const completed = await completeRes.json();

  // eslint-disable-next-line no-console
  console.log({
    paymentId,
    paymentLink: created.paymentLink,
    txHash,
    status: completed.status,
    receipt: completed.receipt
  });
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
