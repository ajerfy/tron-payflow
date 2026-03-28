/**
 * Demo script: simulate a product-level invoice flow through backend APIs.
 */
const API = process.env.API ?? "http://localhost:4100";

async function run() {
  const createRes = await fetch(`${API}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantAddress: "TMERCHANT_DEMO_ADDR",
      merchantName: "Orbit Coffee",
      supportEmail: "support@orbitcoffee.test",
      amountUsdt: 50,
      label: "Hackathon Demo Invoice",
      network: "demo",
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      onchainRequestId: 17
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
        { token: "TWTRX_PLACEHOLDER", symbol: "WTRX", balance: 800, usdtRate: 0.11, feeBps: 30 },
        { token: "TJST_TOKEN_PLACEHOLDER", symbol: "JST", balance: 200, usdtRate: 0.19, feeBps: 35 }
      ]
    })
  });
  const quote = await quoteRes.json();

  const txHash = `SIMULATED_NILE_TX_${Date.now()}`;
  const paidAt = new Date().toISOString();
  const completeRes = await fetch(`${API}/payments/${paymentId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      txHash,
      paidAt,
      payerAddress: "TPAYER_DEMO_ADDR",
      receipt: {
        amountUsdt: 50,
        assetsUsed: quote.legs,
        totalFeeUsdt: quote.totalFeeUsdt,
        totalInputValueUsdt: quote.totalInputValueUsdt,
        txHash,
        paidAt,
        explorerUrl: `https://nile.tronscan.org/#/transaction/${txHash}`
      },
      onchainVerification: {
        requestId: 17,
        merchant: "TMERCHANT_DEMO_ADDR",
        payer: "TPAYER_DEMO_ADDR",
        paid: true,
        amountUsdt: 50,
        totalInputValueUsdt: quote.totalInputValueUsdt,
        totalFeeUsdt: quote.totalFeeUsdt,
        reconciliationHash: "0xsimulated"
      }
    })
  });
  const completed = await completeRes.json();

  console.log({
    paymentId,
    paymentLink: created.paymentLink,
    txHash,
    status: completed.status,
    attempts: completed.attemptCount,
    receipt: completed.receipt,
    onchainVerification: completed.onchainVerification
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
