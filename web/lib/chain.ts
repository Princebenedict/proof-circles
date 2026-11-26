import { bsc, bscTestnet } from "wagmi/chains";

export const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "56" ? bsc : bscTestnet;
export const PROOF = (process.env.NEXT_PUBLIC_PROOF_CIRCLES ?? "") as `0x${string}`;
export const AGENT_ID = (process.env.NEXT_PUBLIC_AGENT_ID ??
  "0x60b9262456de011f7d15a54cdd8c48baaa8b022f") as `0x${string}`;
export const USDT = "0x55d398326f99059fF775485246999027B3197955" as `0x${string}`; // BSC-USD, 18 decimals
export const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;
export const configured = /^0x[0-9a-fA-F]{40}$/.test(PROOF);
