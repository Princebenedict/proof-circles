"use client";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { chain, configured } from "@/lib/chain";
import { useAgent } from "@/lib/hooks";
import Circles from "./Circles";
import Create from "./Create";
import Proofs from "./Proofs";
import { Logo, StatusBadge } from "./Ui";
import WalletButton from "./Wallet";

const tabs = [
  ["Circles", "Circles"],
  ["Create", "Create"],
  ["Proofs", "My proofs"],
] as const;

export default function Dashboard() {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("Circles");
  const { address, chainId, isConnected } = useAccount();
  const agent = useAgent(address);
  const holder = !!agent.data?.holder;
  const canAct = isConnected && holder && chainId === chain.id && configured;
  const title = tabs.find((t) => t[0] === tab)![1];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-grid/20 bg-paper md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex h-14 items-center border-b border-grid/20 px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center bg-forest text-paper"><Logo /></span>
            <span className="font-display text-sm font-bold tracking-tight text-forest">Proof Circles</span>
          </Link>
        </div>
        <nav className="flex md:flex-col">
          {tabs.map(([key, label], i) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 border-b border-grid/20 px-5 py-3.5 text-left font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-150 md:flex-none ${tab === key ? "bg-forest text-paper" : "text-grid hover:bg-white/60"}`}>
              {String(i + 1).padStart(2, "0")}. {label}
            </button>
          ))}
          <Link href="/verify"
            className="flex-1 border-b border-grid/20 px-5 py-3.5 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-grid transition-colors duration-150 hover:bg-white/60 md:flex-none">
            04. Verify
          </Link>
        </nav>
        <div className="hidden p-5 md:block">
          <StatusBadge>
            {!isConnected ? "Not connected" : agent.isLoading ? "Checking Agent ID" : holder ? "Agent ID verified" : "No Agent ID"}
          </StatusBadge>
          {holder && agent.data?.name && <p className="mt-3 font-mono text-[11px] text-forest">{agent.data.name}</p>}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="flex h-14 items-center justify-between border-b border-grid/20 bg-paper px-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-grid/60">{chain.name}</span>
          <WalletButton />
        </div>
        <div className="p-6 md:p-10">
          <h1 className="mb-8 font-display text-5xl font-bold leading-[0.9] tracking-tighter text-forest md:text-6xl">{title}</h1>
          {isConnected && !agent.isLoading && !holder && (
            <p className="mb-6 border border-grid/20 bg-paper p-4 text-sm">This wallet holds no Agent ID on {chain.name}. You can browse circles, but joining and creating are locked.</p>
          )}
          {isConnected && chainId !== chain.id && (
            <p className="mb-6 border border-coral bg-paper p-4 text-sm">Switch your wallet to {chain.name} to take actions.</p>
          )}
          {tab === "Circles" && <Circles canAct={canAct} onCreate={() => setTab("Create")} />}
          {tab === "Create" && <Create canAct={canAct} onCreated={() => setTab("Circles")} />}
          {tab === "Proofs" && <Proofs />}
        </div>
      </main>
    </div>
  );
}
