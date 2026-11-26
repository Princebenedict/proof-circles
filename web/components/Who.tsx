"use client";
import { short } from "@/lib/format";
import { useAgent } from "@/lib/hooks";

/** Shows the .ai name when it can be resolved, otherwise a shortened address. */
export default function Who({ address }: { address: `0x${string}` }) {
  const { data } = useAgent(address);
  return (
    <span title={address} className={`font-mono text-[0.92em] ${data?.name ? "text-forest underline decoration-forest/30 underline-offset-2" : ""}`}>
      {data?.name ?? short(address)}
    </span>
  );
}
