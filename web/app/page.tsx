"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import Who from "@/components/Who";
import { Chip, Corners, Label, Logo, StatusBadge, Topology } from "@/components/Ui";
import WalletButton from "@/components/Wallet";
import { PROOF, chain, configured } from "@/lib/chain";
import { reward } from "@/lib/format";
import { status, useCircles } from "@/lib/hooks";

const nav = [
  ["01", "How it works", "#how"],
  ["02", "Circles", "#circles"],
  ["03", "Start", "#start"],
  ["04", "Verify", "/verify"],
];

const fade = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.35, ease: "easeOut" } };

const mock = "mt-6 border border-grid/20 bg-white p-4 font-mono text-[11px] leading-relaxed text-grid";

export default function Landing() {
  const { circles } = useCircles(6);

  return (
    <main>
      <header className="fixed inset-x-0 top-0 z-30 border-b border-grid/20 bg-paper">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center bg-forest text-paper"><Logo /></span>
            <span className="font-display text-sm font-bold tracking-tight text-forest">Proof Circles</span>
          </Link>
          <nav className="hidden gap-8 md:flex">
            {nav.map(([n, l, h]) => (
              <a key={n} href={h} className="font-mono text-[10px] uppercase tracking-[0.1em] text-grid transition-colors duration-150 hover:text-forest">{n}. {l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/app" className="btn btn-ghost hidden sm:inline-flex">Open app</Link>
            <WalletButton />
          </div>
        </div>
      </header>

      <section className="border-b border-grid/20 pt-14">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <StatusBadge>Agent ID gated / BNB Chain</StatusBadge>
            <h1 className="mt-8 font-display text-6xl font-bold leading-[0.9] tracking-tighter text-forest md:text-8xl">Threshold proofs, signed together.</h1>
            <p className="mt-10 max-w-md border-l border-forest pl-5 font-mono text-[13px] uppercase leading-relaxed tracking-[0.06em]">
              Small circles of Agent ID holders sign contributions. At the threshold, one attestation is sealed on chain.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/app" className="btn btn-solid">Start a circle</Link>
              <a href="#how" className="btn btn-ghost">How it works</a>
            </div>
          </div>
          <Topology />
        </div>
      </section>

      <section id="how" className="border-b border-grid/20">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-grid/70">01. How it works</p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[0.95] tracking-tighter text-forest md:text-6xl">Four steps from claim to verifiable proof.</h2>
          <div className="mt-14 grid gap-px border border-grid/20 bg-grid/20 md:grid-cols-2">
            {[
              ["coral", "01 / Form a circle", "An Agent ID holder opens a circle with a question, a threshold, a deadline and an optional BNB or USDT reward.",
                "threshold   2 to 50 members\ndeadline    set by creator\nreward      optional, held in contract"],
              ["mint", "02 / Sign contributions", "Members join and each submit an observation. Only its hash goes on chain, signed by the contributor's wallet.",
                "dataHash = keccak256(observation)\nsignature = sign(contributionDigest)"],
              ["gold", "03 / Seal the proof", "When contributions reach the threshold, the circle closes. One attestation hash is stored and a soulbound proof is minted to every contributor.",
                "event ProofIssued(circleId, attestation)\nproof NFT: non-transferable"],
              ["forest", "04 / Verify anywhere", "Any contract or dApp can check a proof with one read call. No indexer needed.",
                "verifyProof(id, account)\n  returns (bool valid, bytes32 attestation)"],
            ].map(([tone, title, body, code], i) => (
              <motion.div key={title} {...fade} transition={{ duration: 0.35, delay: i * 0.05, ease: "easeOut" }} className="bg-paper p-8">
                <p className={`border-l-2 pl-3 font-mono text-[11px] uppercase tracking-[0.1em] text-forest ${tone === "coral" ? "border-coral" : tone === "mint" ? "border-mint" : tone === "gold" ? "border-gold" : "border-forest"}`}>{title}</p>
                <p className="mt-5 text-sm leading-relaxed">{body}</p>
                <pre className={mock}>{code}</pre>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="circles" className="border-b border-grid/20">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-grid/70">02. Circles</p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[0.95] tracking-tighter text-forest md:text-6xl">Latest on chain.</h2>
          {!configured || circles.length === 0 ? (
            <div className="mt-12 border border-dashed border-grid/30 bg-paper p-10 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-grid/70">
              {!configured ? "Contract address is not configured yet" : "No circles on chain yet. The first one is yours to open"}
            </div>
          ) : (
            <div className="mt-12 grid gap-px border border-grid/20 bg-grid/20 md:grid-cols-3">
              {circles.map((c) => {
                const st = status(c);
                const rw = reward(c.rewardToken, c.rewardAmount);
                return (
                  <div key={String(c.id)} className="bg-paper p-6">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-grid/60">Circle {String(c.id).padStart(3, "0")}</span>
                      <Chip tone={st === "Open" ? "mint" : st === "Proof issued" ? "gold" : "line"}>{st}</Chip>
                    </div>
                    <p className="mt-4 font-display text-lg font-bold leading-tight tracking-tight text-forest">{c.description}</p>
                    <p className="mt-4 text-xs text-grid/70">By <Who address={c.creator} /></p>
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-grid/70">
                      {String(c.contributionCount)}/{c.threshold} contributions{rw ? ` / ${rw}` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section id="start" className="px-6 py-24">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.1em] text-grid/70">03. Start</p>
        <h2 className="mx-auto mt-4 max-w-2xl text-center font-display text-4xl font-bold leading-[0.95] tracking-tighter text-forest md:text-6xl">Your Agent ID is the key.</h2>
        <div className="relative mx-auto mt-12 w-full max-w-[640px] border border-grid/20 bg-paper p-8">
          <Corners />
          <div className="space-y-5">
            <div><Label>Network</Label><input readOnly className="input" value={chain.name} /></div>
            <div><Label>Contract</Label><input readOnly className="input font-mono text-xs" value={configured ? PROOF : "Not configured"} /></div>
            <Link href="/app" className="btn btn-solid w-full">Start a circle</Link>
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.1em] text-grid/60">No Agent ID, no seat</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-grid/20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-6 font-mono text-[10px] uppercase tracking-[0.1em] text-grid/60">
          <span>Proof Circles / Open source</span>
          <span>BNB Smart Chain</span>
        </div>
      </footer>
    </main>
  );
}
