const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function setup() {
  const [a, b, c, outsider] = await ethers.getSigners();
  const agent = await (await ethers.getContractFactory("MockAgentId")).deploy();
  for (const s of [a, b, c]) await agent.mint(s.address);
  const pc = await (await ethers.getContractFactory("ProofCircles")).deploy(await agent.getAddress());
  return { a, b, c, outsider, pc };
}

async function contribute(pc, signer, id, text) {
  const h = ethers.keccak256(ethers.toUtf8Bytes(text));
  const digest = await pc.contributionDigest(id, signer.address, h);
  const sig = await signer.signMessage(ethers.getBytes(digest));
  return pc.connect(signer).submitContribution(id, h, "", sig);
}

describe("ProofCircles", () => {
  it("blocks wallets without an Agent ID", async () => {
    const { outsider, pc } = await setup();
    const dl = (await time.latest()) + 3600;
    await expect(
      pc.connect(outsider).createCircle("test", 2, 3, dl, ethers.ZeroAddress, 0)
    ).to.be.revertedWithCustomError(pc, "NotAgent");
  });

  it("seals at threshold, mints soulbound proofs and splits the reward", async () => {
    const { a, b, c, pc } = await setup();
    const dl = (await time.latest()) + 3600;
    await pc.createCircle("Is the bridge slow today?", 3, 5, dl, ethers.ZeroAddress, ethers.parseEther("3"), {
      value: ethers.parseEther("3"),
    });
    const id = await pc.circleCount();
    await pc.connect(b).joinCircle(id);
    await pc.connect(c).joinCircle(id);

    await contribute(pc, a, id, "a");
    await contribute(pc, b, id, "b");
    await contribute(pc, c, id, "c");

    const view = await pc.getCircle(id);
    expect(view.finalized).to.equal(true);
    expect((await pc.verifyProof(id, b.address))[0]).to.equal(true);
    expect(await pc.claimable(ethers.ZeroAddress, b.address)).to.equal(ethers.parseEther("1"));
    await expect(pc.connect(b).claim(ethers.ZeroAddress)).to.changeEtherBalance(b, ethers.parseEther("1"));

    const [ids] = await pc.getProofs(a.address);
    await expect(pc.connect(a).transferFrom(a.address, b.address, ids[0])).to.be.revertedWithCustomError(pc, "Soulbound");
  });

  it("rejects a signature from the wrong wallet", async () => {
    const { a, b, pc } = await setup();
    const dl = (await time.latest()) + 3600;
    await pc.createCircle("x", 2, 3, dl, ethers.ZeroAddress, 0);
    const id = await pc.circleCount();
    await pc.connect(b).joinCircle(id);
    const h = ethers.keccak256(ethers.toUtf8Bytes("x"));
    const digest = await pc.contributionDigest(id, b.address, h);
    const badSig = await a.signMessage(ethers.getBytes(digest));
    await expect(pc.connect(b).submitContribution(id, h, "", badSig)).to.be.revertedWithCustomError(pc, "BadSignature");
  });

  it("refunds the creator when cancelled after the deadline", async () => {
    const { a, b, pc } = await setup();
    const dl = (await time.latest()) + 3600;
    await pc.createCircle("x", 2, 3, dl, ethers.ZeroAddress, ethers.parseEther("1"), { value: ethers.parseEther("1") });
    const id = await pc.circleCount();
    await expect(pc.connect(b).cancelCircle(id)).to.be.revertedWithCustomError(pc, "Unauthorized");
    await time.increase(3601);
    await pc.connect(b).cancelCircle(id);
    expect(await pc.claimable(ethers.ZeroAddress, a.address)).to.equal(ethers.parseEther("1"));
  });
});
