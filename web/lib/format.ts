import { formatEther } from "viem";
import { USDT, ZERO } from "./chain";

export const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

export function timeLeft(deadline: bigint) {
  const s = Number(deadline) - Math.floor(Date.now() / 1000);
  if (s <= 0) return "ended";
  if (s < 3600) return `${Math.ceil(s / 60)}m left`;
  if (s < 86400) return `${Math.floor(s / 3600)}h left`;
  return `${Math.floor(s / 86400)}d left`;
}

export function reward(token: string, amount: bigint) {
  if (amount === 0n) return null;
  const sym = token === ZERO ? "BNB" : token.toLowerCase() === USDT.toLowerCase() ? "USDT" : "tokens";
  return `${formatEther(amount)} ${sym}`;
}
