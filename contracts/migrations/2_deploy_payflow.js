const fs = require("fs");
const path = require("path");

const OTCSettlement = artifacts.require("./OTCSettlement.sol");
const MockTRC20 = artifacts.require("./MockTRC20.sol");

const INITIAL_FAUCET_RECIPIENTS = [
  "TEXeKthDVHTEs7a3AbCZHYTQ2TWZmDKLG6",
  "TJK6idK421WdJW1TaRY93Jn9Yusn96WEdi"
];
const INITIAL_MINT_AMOUNT = "1000000000000"; // 1,000,000 USDT (6 decimals)

module.exports = async function (deployer, network) {
  await deployer.deploy(MockTRC20, "OTC Demo USDT", "USDT", 6);
  const usdt = await MockTRC20.deployed();

  await deployer.deploy(OTCSettlement);
  const settlement = await OTCSettlement.deployed();

  for (const recipient of INITIAL_FAUCET_RECIPIENTS) {
    await usdt.mint(recipient, INITIAL_MINT_AMOUNT);
  }

  const deployment = {
    network,
    deployedAt: new Date().toISOString(),
    otcSettlement: settlement.address,
    usdt: usdt.address,
    purpose: "Instant OTC settlement layer with escrow, disputes, and expiries"
  };

  const deploymentsDir = path.resolve(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(path.join(deploymentsDir, `${network}.json`), JSON.stringify(deployment, null, 2));

  console.log("Deployment complete:");
  console.log(JSON.stringify(deployment, null, 2));
};
