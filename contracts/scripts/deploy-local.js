const { ethers } = require("hardhat");

async function main() {
  const Token = await ethers.getContractFactory("MockTRC20");
  const usdt = await Token.deploy("Tether USD", "USDT", 6);
  const wtrx = await Token.deploy("Wrapped TRX", "WTRX", 6);
  const jst = await Token.deploy("JUST", "JST", 6);

  const Router = await ethers.getContractFactory("MockRouterAdapter");
  const router = await Router.deploy(await usdt.getAddress());

  const Processor = await ethers.getContractFactory("PaymentProcessor");
  const processor = await Processor.deploy(await usdt.getAddress(), await router.getAddress());

  await usdt.mint(await router.getAddress(), 1_000_000_000_000n);
  await router.setRate(await wtrx.getAddress(), 100_000n);
  await router.setRate(await jst.getAddress(), 200_000n);
  await router.setFeeBps(30);

  console.log("USDT:", await usdt.getAddress());
  console.log("WTRX:", await wtrx.getAddress());
  console.log("JST:", await jst.getAddress());
  console.log("Router:", await router.getAddress());
  console.log("PaymentProcessor:", await processor.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
