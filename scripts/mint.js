const { ethers } = require("hardhat");

async function main() {
  const to = process.env.MINT_TO;
  const agentAddress = process.env.AGENT_ID_ADDRESS;
  if (!to || !agentAddress) throw new Error("Set MINT_TO and AGENT_ID_ADDRESS");
  const agent = await ethers.getContractAt("MockAgentId", agentAddress);
  await (await agent.mint(to)).wait();
  console.log("Minted mock Agent ID to", to);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});