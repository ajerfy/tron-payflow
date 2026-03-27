const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TRON PayFlow - PaymentProcessor", function () {
  async function deployFixture() {
    const [owner, merchant, payer] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockTRC20");
    const usdt = await Token.deploy("Tether USD", "USDT", 6);
    const trxW = await Token.deploy("Wrapped TRX", "WTRX", 6);
    const jst = await Token.deploy("JUST", "JST", 6);

    const Router = await ethers.getContractFactory("MockRouterAdapter");
    const router = await Router.deploy(await usdt.getAddress());

    const Processor = await ethers.getContractFactory("PaymentProcessor");
    const processor = await Processor.deploy(await usdt.getAddress(), await router.getAddress());

    const ONE_M = 1_000_000n;
    await usdt.mint(await router.getAddress(), 10_000n * ONE_M);
    await trxW.mint(payer.address, 2_000n * ONE_M);
    await jst.mint(payer.address, 2_000n * ONE_M);

    // 1 WTRX => 0.10 USDT, 1 JST => 0.20 USDT
    await router.setRate(await trxW.getAddress(), 100_000n);
    await router.setRate(await jst.getAddress(), 200_000n);
    await router.setFeeBps(30);

    return { owner, merchant, payer, usdt, trxW, jst, router, processor, ONE_M };
  }

  it("creates payment request and settles exact USDT with multi-asset input", async function () {
    const { merchant, payer, usdt, trxW, jst, processor, ONE_M } = await deployFixture();
    const exactOut = 50n * ONE_M;

    const tx = await processor.connect(merchant).createPaymentRequest(exactOut, "INV-001");
    await expect(tx).to.emit(processor, "PaymentRequestCreated");

    await trxW.connect(payer).approve(await processor.getAddress(), 700n * ONE_M);
    await jst.connect(payer).approve(await processor.getAddress(), 700n * ONE_M);

    const assets = [
      [await trxW.getAddress(), 400n * ONE_M],
      [await jst.getAddress(), 300n * ONE_M]
    ];

    await expect(
      processor.connect(payer).executeIntentPayment(0, assets, 52n * ONE_M, Math.floor(Date.now() / 1000) + 1200)
    ).to.emit(processor, "PaymentSettled");

    expect(await usdt.balanceOf(merchant.address)).to.equal(exactOut);
  });

  it("reverts when max input quote is too tight (slippage exceeded)", async function () {
    const { merchant, payer, trxW, jst, processor, ONE_M } = await deployFixture();
    await processor.connect(merchant).createPaymentRequest(40n * ONE_M, "INV-002");

    await trxW.connect(payer).approve(await processor.getAddress(), 400n * ONE_M);
    await jst.connect(payer).approve(await processor.getAddress(), 400n * ONE_M);

    const assets = [
      [await trxW.getAddress(), 300n * ONE_M],
      [await jst.getAddress(), 300n * ONE_M]
    ];

    await expect(
      processor.connect(payer).executeIntentPayment(0, assets, 35n * ONE_M, Math.floor(Date.now() / 1000) + 1200)
    ).to.be.revertedWithCustomError(processor, "SlippageExceeded");
  });

  it("reverts when liquidity/asset limits are insufficient", async function () {
    const { merchant, payer, trxW, jst, processor, ONE_M } = await deployFixture();
    await processor.connect(merchant).createPaymentRequest(200n * ONE_M, "INV-003");

    await trxW.connect(payer).approve(await processor.getAddress(), 10n * ONE_M);
    await jst.connect(payer).approve(await processor.getAddress(), 10n * ONE_M);

    const assets = [
      [await trxW.getAddress(), 10n * ONE_M],
      [await jst.getAddress(), 10n * ONE_M]
    ];

    await expect(
      processor.connect(payer).executeIntentPayment(0, assets, 200n * ONE_M, Math.floor(Date.now() / 1000) + 1200)
    ).to.be.revertedWithCustomError(processor, "InsufficientLiquidity");
  });
});
