"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useReadContract } from "wagmi";
import { Chip, Corners, Label, Logo } from "@/components/Ui";
import Who from "@/components/Who";
import { proofAbi } from "@/lib/abi";
import { PROOF, chain, configured } from "@/lib/chain";
import type { CircleV } from "@/lib/hooks";

type Query = { id: bigint; account: `0x${string}` };

const snippet = `// Solidity
interface IProofCircles {
  function verifyProof(uint256 id, address account)
    external view returns (bool valid, bytes32 attestation);
}

// viem
const [valid, attestation] = await client.readContract({
  address: PROOF_CIRCLES,
  abi: parseAbi(["function verifyProof(uint256,address) view returns (bool,bytes32)"]),
  functionName: "verifyProof",
  args: [circleId, account],
});`;

export default function VerifyPage() {
  const [idText, setIdText] = useState("");
  const [acct, setAcct] = useState("");
  const [q, setQ] = useState<Query | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function run(idRaw: string, aRaw: string) {
    const id = idRaw.trim();
    const a = aRaw.trim();
    if (!/^\d+$/.test(id) || BigInt(id) === 0n) return setErr("Enter a circle number, for example 1");
    if (!isAddress(a)) return setErr("Enter a valid wallet address");
    setErr(null);
    setQ({ id: BigInt(id), account: a as `0x${string}` });
    window.history.replaceState(null, "", `/verify?circle=${id}&account=${a}`);
  }

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get("circle");
    const a = p.get("account");
    if (c && a) {
      setIdText(c);
      setAcct(a);
      run(c, a);
    }
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <main>
      <header className="border-b border-grid/20 bg-paper">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center bg-forest text-paper"><Logo /></span>
            <span className="font-display text-sm font-bold tracking-tight text-forest">Proof Circles</span>
          </Link>
          <Link href="/app" className="btn btn-ghost">Open app</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-grid/70">Public check / no wallet needed</p>
        <h1 className="mt-4 font-display text-6xl font-bold leading-[0.9] tracking-tighter text-forest md:text-8xl">Verify a proof.</h1>
        <p className="mt-8 max-w-xl border-l border-forest pl-5 font-mono text-[13px] uppercase leading-relaxed tracking-[0.06em]">
          Check on chain whether a wallet contributed to a sealed circle.
        </p>

        <div className="relative mt-12 max-w-[640px] border border-grid/20 bg-paper p-8">
          <Corners />
          <div className="space-y-5">
            <div><Label>Circle number</Label><input className="input" inputMode="numeric" placeholder="1" value={idText} onChange={(e) => setIdText(e.target.value)} /></div>
            <div><Label>Wallet address</Label><input className="input font-mono text-xs" placeholder="0x..." value={acct} onChange={(e) => setAcct(e.target.value)} /></div>
            <button className="btn btn-solid" onClick={() => run(idText, acct)}>Verify</button>
            {err && <p className="font-mono text-[11px] text-coral">{err}</p>}
            {!configured && <p className="font-mono text-[11px] text-coral">Contract address is not set in web/.env.local</p>}
          </div>
        </div>

        {q && configured && <Result q={q} onCopy={copy} copied={copied} />}

        <div className="mt-16 border-t border-grid/20 pt-10">
          <Label>Verify from your own dApp</Label>
          <p className="max-w-xl text-sm leading-relaxed">One read call. No indexer and no API key. The contract is on {chain.name}.</p>
          <pre className="mt-5 overflow-x-auto border border-grid/20 bg-white p-4 font-mono text-[11px] leading-relaxed text-grid">{snippet}</pre>
          {configured && (
            <a className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.1em] text-forest underline" target="_blank" rel="noreferrer"
              href={`${chain.blockExplorers?.default.url}/address/${PROOF}#code`}>View contract source</a>
          )}
        </div>
      </div>
    </main>
  );
}

function Result({ q, onCopy, copied }: { q: Query; onCopy: () => void; copied: boolean }) {
  const circle = useReadContract({ address: PROOF, abi: proofAbi, functionName: "getCircle", args: [q.id], chainId: chain.id, query: { retry: false } });
  const verify = useReadContract({ address: PROOF, abi: proofAbi, functionName: "verifyProof", args: [q.id, q.account], chainId: chain.id, query: { retry: false } });
  const contributors = useReadContract({ address: PROOF, abi: proofAbi, functionName: "getContributors", args: [q.id], chainId: chain.id, query: { retry: false } });

  if (circle.isLoading || verify.isLoading) {
    return <div className="mt-8 max-w-[640px] border border-dashed border-grid/30 p-8 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-grid/70">Reading chain</div>;
  }
  if (circle.isError || !circle.data) {
    return <div className="mt-8 max-w-[640px] border border-coral bg-paper p-8"><Chip tone="coral">Not found</Chip><p className="mt-4 text-sm">Circle {String(q.id)} does not exist on {chain.name}.</p></div>;
  }

  const c = circle.data as unknown as CircleV;
  const [valid, attestation] = (verify.data ?? [false, "0x"]) as readonly [boolean, `0x${string}`];
  const list = (contributors.data ?? []) as readonly `0x${string}`[];
  const reason = valid ? null : !c.finalized ? "This circle has not been sealed yet." : "This wallet did not contribute to this circle.";

  return (
    <div className="mt-8 max-w-[640px] space-y-px border border-grid/20 bg-grid/20">
      <div className={`bg-paper p-8 ${valid ? "border-l-2 border-mint" : "border-l-2 border-coral"}`}>
        <div className="flex items-center justify-between gap-4">
          <Chip tone={valid ? "mint" : "coral"}>{valid ? "Valid proof" : "Not valid"}</Chip>
          <button className="btn btn-ghost" onClick={onCopy}>{copied ? "Copied" : "Copy link"}</button>
        </div>
        <p className="mt-5 font-display text-2xl font-bold leading-tight tracking-tight text-forest">{c.description}</p>
        <p className="mt-3 text-sm">Wallet <Who address={q.account} /> {valid ? "contributed to this sealed circle." : ""}</p>
        {reason && <p className="mt-2 text-sm text-grid/80">{reason}</p>}
      </div>
      <div className="bg-paper p-8">
        <Label>Circle {String(q.id).padStart(3, "0")}</Label>
        <p className="font-mono text-[11px] uppercase tracking-[0.1em]">
          {String(c.contributionCount)}/{c.threshold} contributions / {c.finalized ? `sealed ${new Date(Number(c.finalizedAt) * 1000).toLocaleString()}` : c.cancelled ? "cancelled" : "open"}
        </p>
        {c.finalized && (
          <>
            <div className="mt-5"><Label>Attestation</Label><p className="break-all border border-grid/20 bg-white p-3 font-mono text-[11px]">{attestation}</p></div>
            <div className="mt-5">
              <Label>Contributors</Label>
              <ul className="space-y-1 text-sm">{list.map((a) => <li key={a}><Who address={a} /></li>)}</ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
