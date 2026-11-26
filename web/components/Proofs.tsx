"use client";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { proofAbi } from "@/lib/abi";
import { PROOF, USDT, ZERO, chain, configured } from "@/lib/chain";
import { CircleV, useTx } from "@/lib/hooks";
import { EmptyNote } from "./Circles";

export default function Proofs() {
  const { address } = useAccount();
  const tx = useTx();
  const q = { enabled: configured && !!address };
  const { data } = useReadContract({ address: PROOF, abi: proofAbi, functionName: "getProofs", args: [address!], chainId: chain.id, query: q });
  const bnb = useReadContract({ address: PROOF, abi: proofAbi, functionName: "claimable", args: [ZERO, address!], chainId: chain.id, query: q });
  const usdt = useReadContract({ address: PROOF, abi: proofAbi, functionName: "claimable", args: [USDT, address!], chainId: chain.id, query: q });

  if (!address) return <EmptyNote>Connect a wallet to see your proofs</EmptyNote>;
  const [ids, circles] = (data ?? [[], []]) as [readonly bigint[], readonly CircleV[]];
  const claims = [
    { token: ZERO, sym: "BNB", amt: (bnb.data ?? 0n) as bigint },
    { token: USDT, sym: "USDT", amt: (usdt.data ?? 0n) as bigint },
  ].filter((c) => c.amt > 0n);

  return (
    <div className="space-y-8">
      {claims.length > 0 && (
        <div className="space-y-px border border-grid/20 bg-grid/20">
          {claims.map((c) => (
            <div key={c.sym} className="flex items-center justify-between gap-4 bg-paper p-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.1em]">Claimable <span className="text-forest">{formatEther(c.amt)} {c.sym}</span></span>
              <button className="btn btn-solid" disabled={tx.busy} onClick={() => tx.run((w) => w({ address: PROOF, abi: proofAbi, functionName: "claim", args: [c.token] }))}>Claim</button>
            </div>
          ))}
          {tx.error && <p className="bg-paper p-4 font-mono text-[11px] text-coral">{tx.error}</p>}
        </div>
      )}
      {ids.length === 0 ? (
        <EmptyNote>No proofs yet. Contribute to a circle until it reaches its threshold</EmptyNote>
      ) : (
        <div className="grid gap-px border border-grid/20 bg-grid/20 sm:grid-cols-2">
          {ids.map((pid, i) => (
            <div key={String(pid)} className="border-l-2 border-gold bg-paper p-6 transition-colors duration-150 hover:bg-white/60">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-forest">Proof {String(pid).padStart(3, "0")}</p>
              <p className="mt-3 font-display text-lg font-bold leading-tight tracking-tight text-forest">{circles[i].description}</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-grid/60">Circle {String(circles[i].id).padStart(3, "0")} / sealed {new Date(Number(circles[i].finalizedAt) * 1000).toLocaleDateString()}</p>
              <p className="mt-2 break-all font-mono text-[10px] text-grid/50">{circles[i].attestation}</p>
              <a className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.1em] text-forest underline" target="_blank" rel="noreferrer"
                href={`${chain.blockExplorers?.default.url}/token/${PROOF}?a=${pid}`}>View on explorer</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
