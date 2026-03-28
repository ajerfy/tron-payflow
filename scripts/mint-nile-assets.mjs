import pkg from "tronweb";

const privateKey = process.env.PRIVATE_KEY_NILE;
const recipient = process.env.RECIPIENT;

if (!privateKey) {
  throw new Error("Missing PRIVATE_KEY_NILE");
}

if (!recipient) {
  throw new Error("Missing RECIPIENT");
}

const { TronWeb } = pkg;

const tronWeb = new TronWeb({
  fullHost: "https://nile.trongrid.io",
  privateKey
});

const trc20Abi = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

const tokens = [
  { symbol: "USDT", address: "TF6HCtac1NwF7sSSq3CvQr5ezhp4MnMoFA", amount: 1_000_000_000 }
];

for (const token of tokens) {
  const contract = await tronWeb.contract(trc20Abi, token.address);
  const tx = await contract.mint(recipient, token.amount).send({ feeLimit: 120_000_000 });
  console.log(`${token.symbol}: ${tx}`);
}
