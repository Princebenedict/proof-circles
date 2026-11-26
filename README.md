# Proof Circles

Threshold proofs made by Agent ID holders on BNB Chain. A circle collects signed contributions from a small group. When the threshold is met (for example 3 of 5), the contract seals one attestation and mints a soulbound proof to every contributor. Any dApp can verify it with one read call.

## Layout

- `contracts/` Solidity (ProofCircles, plus a mock Agent ID for testnet)
- `scripts/` deploy and mint scripts
- `test/` Hardhat tests
- `web/` Next.js 14 app (Tailwind, Framer Motion, Wagmi, Viem, RainbowKit)

## How Agent ID is used

- The contract stores the Agent ID collection (`0x60b9262456de011f7d15a54cdd8c48baaa8b022f` on mainnet) as an immutable address.
- `createCircle`, `joinCircle` and `submitContribution` revert unless `balanceOf(msg.sender) > 0` on that collection.
- The frontend reads the same collection to gate actions and resolves the `.ai` name with `handleOf(address)`.

## Pages

- `/` landing
- `/app` dashboard: browse circles, create, join, contribute, claim, view proofs
- `/verify` public proof check, no wallet needed, shareable links

## Setup

1. `npm install`
2. `cp .env.example .env` and fill in `DEPLOYER_PRIVATE_KEY` and `BSCSCAN_API_KEY`
3. `npx hardhat test`

## Deploy contracts

1. Testnet: `npm run deploy:testnet` (deploys a mock Agent ID and mints one to the deployer)
2. Mainnet: `npm run deploy:mainnet` (uses the real Agent ID collection)
3. Verify with the command the script prints

## Run the frontend

1. `cd web`
2. `npm install`
3. `cp .env.example .env.local` and set `NEXT_PUBLIC_PROOF_CIRCLES`, `NEXT_PUBLIC_CHAIN_ID` and `NEXT_PUBLIC_WC_PROJECT_ID`
4. On testnet also set `NEXT_PUBLIC_AGENT_ID` to the mock address from the deploy output
5. `npm run dev`

## Test with two wallets on testnet

1. Mint a mock Agent ID to a second wallet: `MINT_TO=0x... AGENT_ID_ADDRESS=0x... npx hardhat run scripts/mint.js --network bscTestnet`
2. Wallet one creates a circle with threshold 2
3. Wallet two joins and contributes, then wallet one contributes
4. Both wallets see a proof under My proofs, and `/verify` shows it as valid

## Verify a proof from another contract

```solidity
interface IProofCircles {
    function verifyProof(uint256 id, address account) external view returns (bool valid, bytes32 attestation);
}
```

`valid` is true when the circle was sealed and `account` contributed to it.

## Design notes

- Contributions are signed with EIP-191 over `contributionDigest(id, contributor, dataHash)`. The signature is emitted in the event so anyone can audit it.
- Only the hash is stored. The content stays with the author, with an optional metadata URI.
- Rewards are pull-based (`claim`), split equally, with rounding dust going to the creator.
- Proof NFTs are soulbound. Any transfer after mint reverts.
- The contract compiles with viaIR and the Cancun EVM target. Reward amounts should stay small because the contract is unaudited.
- The circle list reads the latest 50 circles. Add an indexer for more.

## License

MIT