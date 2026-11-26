const { ethers, network } = require("hardhat");

const MAINNET_AGENT_ID = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";

async function main() {
  const [deployer] = await ethers.getSigners();
  let agent = process.env.AGENT_ID_ADDRESS;

  if (!agent) {
    if (network.config.chainId === 56) {
      agent = MAINNET_AGENT_ID;
    } else {
      const Mock = await ethers.getContractFactory("MockAgentId");
      const mock = await Mock.deploy();
      await mock.waitForDeployment();
      await (await mock.mint(deployer.address)).wait();
      agent = await mock.getAddress();
      console.log("MockAgentId deployed:", agent, "(minted one to deployer)");
    }
  }

  const PC = await ethers.getContractFactory("ProofCircles");
  const pc = await PC.deploy(agent);
  await pc.waitForDeployment();
  const addr = await pc.getAddress();

  console.log("ProofCircles:", addr);
  console.log("Verify with:");
  console.log(`npx hardhat verify --network ${network.name} ${addr} ${agent}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
