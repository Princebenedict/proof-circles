"use client";
import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { erc20Abi, proofAbi } from "@/lib/abi";
import { PROOF, USDT, ZERO, chain } from "@/lib/chain";
import { useTx } from "@/lib/hooks";
import { Corners, Label } from "./Ui";

export default function Create({ canAct, onCreated }: { canAct: boolean; onCreated: () => void }) {
  const { address } = useAccount();
  const pc = usePublicClient({ chainId: chain.id });
  const tx = useTx();
  const [desc, setDesc] = useState("");
  const [threshold, setThreshold] = useState(3);
  const [max, setMax] = useState(5);
  const [hours, setHours] = useState(24);
  const [kind, setKind] = useState<"none" | "bnb" | "usdt">("none");
  const [amount, setAmount] = useState("");

  const valid = desc.trim().length > 0 && desc.length <= 280 && threshold >= 2 && max >= threshold && max <= 50 && hours > 0 &&
    (kind === "none" || Number(amount) > 0);

  async function submit() {
    const ok = await tx.run(async (w) => {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + Math.round(hours * 3600));
      const token = kind === "usdt" ? USDT : ZERO;
      const amt = kind === "none" ? 0n : parseEther(amount);
      if (kind === "usdt") {
        const allowance = (await pc!.readContract({ address: USDT, abi: erc20Abi, functionName: "allowance", args: [address!, PROOF] })) as bigint;
        if (allowance < amt) {
          const h = await w({ address: USDT, abi: erc20Abi, functionName: "approve", args: [PROOF, amt] });
          await pc!.waitForTransactionReceipt({ hash: h });
        }
      }
      return w({
        address: PROOF, abi: proofAbi, functionName: "createCircle",
        args: [desc.trim(), threshold, max, deadline, token, amt], value: kind === "bnb" ? amt : 0n,
      });
    });
    if (ok) onCreated();
  }

  return (
    <div className="relative max-w-2xl border border-grid/20 bg-paper p-8">
      <Corners />
      <div className="space-y-6">
        {!canAct && <p className="border border-grid/20 bg-white p-4 text-sm text-grid/80">Connect a wallet holding an Agent ID on the right network to create a circle.</p>}
        <div>
          <Label>What should the circle prove</Label>
          <textarea className="input min-h-24" maxLength={280} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Example: Is the new bridge route live and under 2 minutes?" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Threshold</Label><input type="number" min={2} className="input" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} /></div>
          <div><Label>Max members</Label><input type="number" min={2} max={50} className="input" value={max} onChange={(e) => setMax(Number(e.target.value))} /></div>
          <div><Label>Hours open</Label><input type="number" min={1} className="input" value={hours} onChange={(e) => setHours(Number(e.target.value))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Reward</Label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as any)}>
              <option value="none">None</option><option value="bnb">BNB</option><option value="usdt">USDT</option>
            </select>
          </div>
          {kind !== "none" && (
            <div><Label>Total amount</Label><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.1" /></div>
          )}
        </div>
        {kind !== "none" && <p className="text-xs text-grid/70">The reward is split equally between contributors when the proof is sealed. If the circle fails, you can cancel and reclaim it.</p>}
        <button className="btn btn-solid" disabled={!canAct || !valid || tx.busy} onClick={submit}>{tx.busy ? "Confirm in wallet" : "Create circle"}</button>
        {tx.error && <p className="font-mono text-[11px] text-coral">{tx.error}</p>}
      </div>
    </div>
  );
}
