const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OTCSettlement", function () {
  const ONE_USDT = 1_000_000n;

  let settlement;
  let usdt;
  let nonStandardUsdt;
  let owner;
  let partyA;
  let partyB;
  let stranger;
  let attack;

  beforeEach(async function () {
    [owner, partyA, partyB, stranger] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockTRC20");
    usdt = await Token.deploy("Mock USDT", "USDT", 6);
    await usdt.waitForDeployment();

    const NonStandardToken = await ethers.getContractFactory("NonStandardMockTRC20");
    nonStandardUsdt = await NonStandardToken.deploy("Nile Faucet USDT", "USDT", 6);
    await nonStandardUsdt.waitForDeployment();

    const Settlement = await ethers.getContractFactory("OTCSettlement");
    settlement = await Settlement.deploy();
    await settlement.waitForDeployment();

    const Attack = await ethers.getContractFactory("ReentrantDealParticipant");
    attack = await Attack.deploy(await settlement.getAddress());
    await attack.waitForDeployment();

    await usdt.mint(partyA.address, 1_000_000n * ONE_USDT);
    await usdt.mint(partyB.address, 1_000_000n * ONE_USDT);
    await usdt.connect(partyA).approve(await settlement.getAddress(), ethers.MaxUint256);
    await usdt.connect(partyB).approve(await settlement.getAddress(), ethers.MaxUint256);

    await nonStandardUsdt.mint(partyA.address, 1_000_000n * ONE_USDT);
    await nonStandardUsdt.mint(partyB.address, 1_000_000n * ONE_USDT);
    await nonStandardUsdt.connect(partyA).approve(await settlement.getAddress(), ethers.MaxUint256);
    await nonStandardUsdt.connect(partyB).approve(await settlement.getAddress(), ethers.MaxUint256);
  });

  it("runs the full happy path: create, accept, fund, confirm, settle", async function () {
    await expect(
      settlement.connect(partyA).createDeal(await usdt.getAddress(), 50n * ONE_USDT, ethers.ZeroAddress, ethers.parseEther("10"), partyB.address, 24)
    ).to.emit(settlement, "DealCreated");

    await expect(settlement.connect(partyB).acceptDeal(0)).to.emit(settlement, "DealAccepted");

    await expect(settlement.connect(partyA).fundDeal(0)).to.emit(settlement, "DealFunded").withArgs(0, partyA.address);
    await expect(settlement.connect(partyB).fundDeal(0, { value: ethers.parseEther("10") })).to.emit(settlement, "DealFunded").withArgs(0, partyB.address);

    let deal = await settlement.getDeal(0);
    expect(deal.status).to.equal(2n);

    await settlement.connect(partyA).confirmSettlement(0);
    await settlement.connect(partyB).confirmSettlement(0);
    deal = await settlement.getDeal(0);
    expect(deal.partyAConfirmed).to.equal(true);
    expect(deal.partyBConfirmed).to.equal(true);
    await expect(settlement.connect(stranger).executeSettlement(0)).to.emit(settlement, "DealSettled");

    deal = await settlement.getDeal(0);
    expect(deal.status).to.equal(3n);
    expect(await usdt.balanceOf(partyB.address)).to.equal(1_000_050n * ONE_USDT);
  });

  it("settles successfully with a non-standard TRC20 that returns no bool", async function () {
    await settlement
      .connect(partyA)
      .createDeal(await nonStandardUsdt.getAddress(), 50n * ONE_USDT, ethers.ZeroAddress, ethers.parseEther("10"), partyB.address, 24);

    await settlement.connect(partyB).acceptDeal(0);
    await settlement.connect(partyA).fundDeal(0);
    await settlement.connect(partyB).fundDeal(0, { value: ethers.parseEther("10") });
    await settlement.connect(partyA).confirmSettlement(0);
    await settlement.connect(partyB).confirmSettlement(0);

    await expect(settlement.connect(stranger).executeSettlement(0)).to.emit(settlement, "DealSettled");

    const deal = await settlement.getDeal(0);
    expect(deal.status).to.equal(3n);
    expect(await nonStandardUsdt.balanceOf(partyB.address)).to.equal(1_000_050n * ONE_USDT);
  });

  it("handles timeout and refunds funded assets", async function () {
    await settlement.connect(partyA).createDeal(await usdt.getAddress(), 25n * ONE_USDT, ethers.ZeroAddress, ethers.parseEther("3"), partyB.address, 1);
    await settlement.connect(partyB).acceptDeal(0);
    await settlement.connect(partyA).fundDeal(0);
    await settlement.connect(partyB).fundDeal(0, { value: ethers.parseEther("3") });

    await ethers.provider.send("evm_increaseTime", [3700]);
    await ethers.provider.send("evm_mine");

    const before = await ethers.provider.getBalance(partyB.address);
    await expect(settlement.connect(stranger).claimExpired(0)).to.emit(settlement, "DealExpired");

    const deal = await settlement.getDeal(0);
    expect(deal.status).to.equal(6n);
    expect(await usdt.balanceOf(partyA.address)).to.equal(1_000_000n * ONE_USDT);
    expect(await ethers.provider.getBalance(partyB.address)).to.be.greaterThan(before);
  });

  it("supports dispute and owner resolution", async function () {
    await settlement.connect(partyA).createDeal(await usdt.getAddress(), 30n * ONE_USDT, ethers.ZeroAddress, ethers.parseEther("2"), partyB.address, 6);
    await settlement.connect(partyB).acceptDeal(0);
    await settlement.connect(partyA).fundDeal(0);
    await settlement.connect(partyB).fundDeal(0, { value: ethers.parseEther("2") });

    await expect(settlement.connect(partyA).raiseDispute(0, "Bank wire mismatch")).to.emit(settlement, "DealDisputed");
    await expect(settlement.connect(owner).resolveDispute(0, true)).to.emit(settlement, "DealResolved").withArgs(0, true);

    const deal = await settlement.getDeal(0);
    expect(deal.status).to.equal(5n);
    expect(await usdt.balanceOf(partyA.address)).to.equal(1_000_000n * ONE_USDT);
  });

  it("allows cancellation before acceptance", async function () {
    await settlement.connect(partyA).createDeal(await usdt.getAddress(), 20n * ONE_USDT, ethers.ZeroAddress, ethers.parseEther("1"), partyB.address, 6);
    await expect(settlement.connect(partyA).cancelDeal(0)).to.emit(settlement, "DealCancelled");

    const deal = await settlement.getDeal(0);
    expect(deal.status).to.equal(7n);
  });

  it("enforces access control", async function () {
    await settlement.connect(partyA).createDeal(await usdt.getAddress(), 20n * ONE_USDT, ethers.ZeroAddress, ethers.parseEther("1"), partyB.address, 6);

    await expect(settlement.connect(stranger).acceptDeal(0)).to.be.revertedWithCustomError(settlement, "OnlyCounterparty");
    await settlement.connect(partyB).acceptDeal(0);
    await expect(settlement.connect(stranger).fundDeal(0)).to.be.revertedWithCustomError(settlement, "OnlyParticipant");
    await expect(settlement.connect(stranger).confirmSettlement(0)).to.be.revertedWithCustomError(settlement, "InvalidStatus");
  });

  it("prevents double funding", async function () {
    await settlement.connect(partyA).createDeal(await usdt.getAddress(), 20n * ONE_USDT, ethers.ZeroAddress, ethers.parseEther("1"), partyB.address, 6);
    await settlement.connect(partyB).acceptDeal(0);

    await settlement.connect(partyA).fundDeal(0);
    await expect(settlement.connect(partyA).fundDeal(0)).to.be.revertedWithCustomError(settlement, "AlreadyFunded");
  });

  it("blocks reentrancy during settlement transfers", async function () {
    await usdt.mint(await attack.getAddress(), 100n * ONE_USDT);
    await attack.approveToken(await usdt.getAddress(), await settlement.getAddress(), ethers.MaxUint256);

    await attack.createDeal(await usdt.getAddress(), 10n * ONE_USDT, ethers.ZeroAddress, ethers.parseEther("1"), partyB.address, 6);
    await settlement.connect(partyB).acceptDeal(0);
    await attack.fund(0);
    await settlement.connect(partyB).fundDeal(0, { value: ethers.parseEther("1") });

    await attack.confirm(0);
    await settlement.connect(partyB).confirmSettlement(0);
    await attack.finalize(0);

    expect(await attack.triedReentry()).to.equal(true);
    const deal = await settlement.getDeal(0);
    expect(deal.status).to.equal(3n);
  });
});
