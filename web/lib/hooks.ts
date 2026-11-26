"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useReadContract, usePublicClient, useWriteContract } from "wagmi";
import { agentAbi, proofAbi } from "./abi";
import { AGENT_ID, PROOF, chain, configured } from "./chain";

export type CircleV = {
  id: bigint; creator: `0x${string}`; deadline: bigint; finalizedAt: bigint; threshold: number; maxParticipants: number;
  participantCount: bigint; contributionCount: bigint; finalized: boolean; cancelled: boolean;
  rewardToken: `0x${string}`; rewardAmount: bigint; attestation: `0x${string}`; description: string;
};

export function status(c: CircleV) {
  if (c.finalized) return "Proof issued";
  if (c.cancelled) return "Cancelled";
  if (Number(c.deadline) < Date.now() / 1000) return "Expired";
  return "Open";
}

export function useCircles(limit = 50) {
  const r = useReadContract({
    address: PROOF, abi: proofAbi, functionName: "getCircles", args: [0n, BigInt(limit)], chainId: chain.id,
    query: { enabled: configured, refetchInterval: 10000 },
  });
  return { ...r, circles: (r.data ?? []) as readonly CircleV[] };
}

/** Agent ID gate plus .ai name, read from the collection's handleOf(address). */
export function useAgent(address?: `0x${string}`) {
  const pc = usePublicClient({ chainId: chain.id });
  return useQuery({
    queryKey: ["agent", address],
    enabled: !!address && !!pc,
    staleTime: 60_000,
    queryFn: async () => {
      const bal = (await pc!.readContract({ address: AGENT_ID, abi: agentAbi, functionName: "balanceOf", args: [address!] } as any)) as bigint;
      if (bal === 0n) return { holder: false, name: null as string | null };
      let name: string | null = null;
      try {
        const handle = ((await pc!.readContract({ address: AGENT_ID, abi: agentAbi, functionName: "handleOf", args: [address!] } as any)) as string).trim();
        if (handle) name = handle.includes(".") ? handle : `${handle}.ai`;
      } catch {
        name = null; // collection without handleOf (for example the testnet mock)
      }
      return { holder: true, name };
    },
  });
}

/** Sends a transaction, waits for the receipt, then refreshes all reads. */
export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const pc = usePublicClient({ chainId: chain.id });
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: (write: (p: any) => Promise<`0x${string}`>) => Promise<`0x${string}` | void>) {
    setBusy(true);
    setError(null);
    try {
      const hash = await fn((p) => writeContractAsync({ chainId: chain.id, ...p }));
      if (hash) await pc!.waitForTransactionReceipt({ hash });
      await qc.invalidateQueries();
      return true;
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? "Transaction failed");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error };
}