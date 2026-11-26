"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { keccak256, toBytes } from "viem";
import { useAccount, usePublicClient, useReadContract, useReadContracts, useSignMessage } from "wagmi";
import { proofAbi } from "@/lib/abi";
import { PROOF, chain, configured } from "@/lib/chain";
import { reward, timeLeft } from "@/lib/format";
import { CircleV, status, useCircles, useTx } from "@/lib/hooks";
import { Chip, Label } from "./Ui";
import Who from "./Who";

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="border border-dashed border-grid/30 bg-paper p-10 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-grid/70">{children}</div>;
}

const toneFor = (st: string) => (st === "Open" ? "mint" : st === "Proof issued" ? "gold" : "line");

export default function Circles({ canAct, onCreate }: { canAct: boolean; onCreate: () => void }) {
  const { address } = useAccount();
  const { circles, isLoading } = useCircles();
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const { data: flags } = useReadContracts({
    contracts: circles.map((c) => ({ address: PROOF, abi: proofAbi, functionName: "isParticipant", args: [c.id, address], chainId: chain.id })),
    query: { enabled: !!address && circles.length > 0 },
  });
  const mine = new Set(circles.filter((_, i) => flags?.[i]?.result === true).map((c) => c.id));
  const shown = filter === "mine" ? circles.filter((c) => mine.has(c.id)) : circles;

  if (!configured) return <EmptyNote>Contract address is not set. Add NEXT_PUBLIC_PROOF_CIRCLES to web/.env.local</EmptyNote>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["all", "mine"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`btn ${filter === f ? "btn-solid" : "btn-ghost"}`}>
              {f === "all" ? "All circles" : "My circles"}
            </button>
          ))}
        </div>
        <button onClick={onCreate} className="btn btn-ghost">New circle</button>
      </div>
      {isLoading ? (
        <EmptyNote>Loading circles from chain</EmptyNote>
      ) : shown.length === 0 ? (
        <EmptyNote>{filter === "mine" ? "You are not in any circle yet" : "No circles exist yet. Create the first one"}</EmptyNote>
      ) : (
        <div className="space-y-px bg-grid/20 border border-grid/20">
          {shown.map((c) => <CircleCard key={String(c.id)} c={c} canAct={canAct} />)}
        </div>
      )}
    </div>
  );
}

function CircleCard({ c, canAct }: { c: CircleV; canAct: boolean }) {
  const [open, setOpen] = useState(false);
  const st = status(c);
  const pct = Math.min(100, (Number(c.contributionCount) / c.threshold) * 100);
  const rw = reward(c.rewardToken, c.rewardAmount);

  return (
    <div className="bg-paper">
      <button onClick={() => setOpen(!open)} className="w-full p-6 text-left transition-colors duration-150 hover:bg-white/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-grid/60">Circle {String(c.id).padStart(3, "0")}</p>
            <p className="mt-2 font-display text-xl font-bold leading-tight tracking-tight text-forest">{c.description}</p>
            <p className="mt-2 text-xs text-grid/70">Opened by <Who address={c.creator} /></p>
          </div>
          <Chip tone={toneFor(st)}>{st}</Chip>
        </div>
        <div className="mt-5 h-1 bg-grid/10">
          <motion.div className="h-full bg-forest" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-grid/70">
          <span>{String(c.contributionCount)}/{c.threshold} contributions</span>
          <span>{String(c.participantCount)}/{c.maxParticipants} members</span>
          {st === "Open" && <span>{timeLeft(c.deadline)}</span>}
          {rw && <span className="text-forest">Reward {rw}</span>}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="overflow-hidden">
            <Details c={c} canAct={canAct} st={st} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Details({ c, canAct, st }: { c: CircleV; canAct: boolean; st: string }) {
  const { address } = useAccount();
  const tx = useTx();
  const { data: contributors } = useReadContract({ address: PROOF, abi: proofAbi, functionName: "getContributors", args: [c.id], chainId: chain.id });
  const list = (contributors ?? []) as readonly `0x${string}`[];
  const { data: items } = useReadContracts({
    contracts: list.map((a) => ({ address: PROOF, abi: proofAbi, functionName: "getContribution", args: [c.id, a], chainId: chain.id })),
    query: { enabled: list.length > 0 },
  });
  const { data: joined } = useReadContract({
    address: PROOF, abi: proofAbi, functionName: "isParticipant", args: [c.id, address!], chainId: chain.id, query: { enabled: !!address },
  });
  const submitted = !!address && list.some((a) => a.toLowerCase() === address.toLowerCase());
  const isOpen = st === "Open";
  const canCancel = !!address && ((c.creator.toLowerCase() === address.toLowerCase() && !c.finalized && !c.cancelled) || st === "Expired");

  return (
    <div className="space-y-6 border-t border-grid/20 p-6">
      <div>
        <Label>Contribution timeline</Label>
        {list.length === 0 ? (
          <p className="text-sm text-grid/70">No contributions yet.</p>
        ) : (
          <ol className="space-y-3 border-l border-forest pl-4">
            {list.map((a, i) => {
              const r: any = items?.[i]?.result;
              return (
                <li key={a} className="text-sm">
                  <Who address={a} />
                  {r && (
                    <span className="block font-mono text-[10px] uppercase tracking-[0.08em] text-grid/60">
                      {new Date(Number(r.at) * 1000).toLocaleString()} / hash {r.dataHash.slice(0, 12)}
                      {r.metadataURI && <> / <a className="text-forest underline" href={r.metadataURI.startsWith("ipfs://") ? "https://ipfs.io/ipfs/" + r.metadataURI.slice(7) : r.metadataURI} target="_blank" rel="noreferrer">metadata</a></>}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {c.finalized && (
        <div>
          <Label>Attestation</Label>
          <p className="break-all border border-grid/20 bg-white p-3 font-mono text-[11px] text-grid">{c.attestation}</p>
        </div>
      )}

      {isOpen && canAct && !joined && (
        <button className="btn btn-solid" disabled={tx.busy || c.participantCount >= BigInt(c.maxParticipants)}
          onClick={() => tx.run((w) => w({ address: PROOF, abi: proofAbi, functionName: "joinCircle", args: [c.id] }))}>
          {tx.busy ? "Confirm in wallet" : c.participantCount >= BigInt(c.maxParticipants) ? "Circle is full" : "Join circle"}
        </button>
      )}
      {isOpen && canAct && joined && !submitted && <ContributeForm id={c.id} />}
      {isOpen && joined && submitted && <Chip tone="mint">Your contribution is in</Chip>}
      {canAct && canCancel && (
        <button className="btn btn-ghost" disabled={tx.busy}
          onClick={() => tx.run((w) => w({ address: PROOF, abi: proofAbi, functionName: "cancelCircle", args: [c.id] }))}>
          Cancel and refund reward
        </button>
      )}
      {tx.error && <p className="font-mono text-[11px] text-coral">{tx.error}</p>}
    </div>
  );
}

function ContributeForm({ id }: { id: bigint }) {
  const { address } = useAccount();
  const pc = usePublicClient({ chainId: chain.id });
  const { signMessageAsync } = useSignMessage();
  const tx = useTx();
  const [text, setText] = useState("");
  const [uri, setUri] = useState("");

  async function submit() {
    await tx.run(async (w) => {
      const dataHash = keccak256(toBytes(text.trim()));
      const digest = (await pc!.readContract({ address: PROOF, abi: proofAbi, functionName: "contributionDigest", args: [id, address!, dataHash] })) as `0x${string}`;
      const signature = await signMessageAsync({ message: { raw: digest } });
      return w({ address: PROOF, abi: proofAbi, functionName: "submitContribution", args: [id, dataHash, uri.trim(), signature] });
    });
  }

  return (
    <div className="space-y-4">
      <div><Label>Observation</Label><textarea className="input min-h-24" placeholder="Your observation or contribution" value={text} onChange={(e) => setText(e.target.value)} /></div>
      <div><Label>Metadata URI (optional)</Label><input className="input" placeholder="ipfs:// or https://" value={uri} onChange={(e) => setUri(e.target.value)} /></div>
      <p className="text-xs text-grid/70">Only the keccak256 hash of your text goes on chain. Keep the original so you can prove it later.</p>
      <button className="btn btn-solid" disabled={tx.busy || !text.trim()} onClick={submit}>{tx.busy ? "Sign and confirm" : "Sign and submit"}</button>
      {tx.error && <p className="font-mono text-[11px] text-coral">{tx.error}</p>}
    </div>
  );
}
