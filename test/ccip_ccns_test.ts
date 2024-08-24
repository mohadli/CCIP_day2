const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Cross-Chain Name Service Integration", function () {
  let simulatorContract, registrarContract, receiverContract;
  let sourceLookupContract, destinationLookupContract;
  let userAccount;
  const testDomain = "user123.ccns";

  beforeEach(async function () {
    // Deploy simulator
    const SimulatorFactory = await ethers.getContractFactory("CCIPLocalSimulator");
    simulatorContract = await SimulatorFactory.deploy();
    await simulatorContract.deployed();

    // Fetch configuration
    const { sourceRouter, destinationRouter, chainSelector } = await simulatorContract.configuration();

    // Deploy service contracts
    const [RegistrarFactory, ReceiverFactory, LookupFactory] = await Promise.all([
      ethers.getContractFactory("CrossChainNameServiceRegister"),
      ethers.getContractFactory("CrossChainNameServiceReceiver"),
      ethers.getContractFactory("CrossChainNameServiceLookup")
    ]);

    [registrarContract, receiverContract, sourceLookupContract, destinationLookupContract] = await Promise.all([
      RegistrarFactory.deploy(sourceRouter),
      ReceiverFactory.deploy(destinationRouter),
      LookupFactory.deploy(),
      LookupFactory.deploy()
    ]);

    await Promise.all([
      registrarContract.deployed(),
      receiverContract.deployed(),
      sourceLookupContract.deployed(),
      destinationLookupContract.deployed()
    ]);

    // Configure contracts
    await receiverContract.enableChain(chainSelector);
    await sourceLookupContract.setCrossChainNameServiceAddress(registrarContract.address);
    await destinationLookupContract.setCrossChainNameServiceAddress(receiverContract.address);

    // Set user account
    [userAccount] = await ethers.getSigners();
  });

  it("should successfully register and resolve a cross-chain name", async function () {
    // Register name
    await registrarContract.register(testDomain, userAccount.address);

    // Resolve name
    const resolvedAddress = await sourceLookupContract.lookup(testDomain);

    // Verify resolution
    expect(resolvedAddress).to.equal(userAccount.address);
  });
});
