import type { ReactNode } from "react";

export function Logo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <circle cx="8" cy="8" r="6.5" />
      <rect x="6" y="6" width="4" height="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 border border-forest/20 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-forest">
      <span className="h-2 w-2 bg-forest" />
      {children}
    </span>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-grid/70">{children}</span>;
}

const tones = {
  mint: "bg-mint text-forest border-mint",
  gold: "bg-gold text-forest border-gold",
  coral: "bg-coral text-forest border-coral",
  line: "border-grid/30 text-grid/70",
};

export function Chip({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${tones[tone]}`}>{children}</span>;
}

/** Four L-shaped corner markers. Parent must be position: relative. */
export function Corners() {
  const c = "pointer-events-none absolute h-2.5 w-2.5 border-forest";
  return (
    <>
      <span className={`${c} -left-px -top-px border-l-2 border-t-2`} />
      <span className={`${c} -right-px -top-px border-r-2 border-t-2`} />
      <span className={`${c} -bottom-px -left-px border-b-2 border-l-2`} />
      <span className={`${c} -bottom-px -right-px border-b-2 border-r-2`} />
    </>
  );
}

/** Abstract graph: agents orbiting a single sealed attestation. */
export function Topology() {
  const nodes = [
    { x: 225, y: 85, c: "#FF8C69" },
    { x: 346.2, y: 295, c: "#9EFFBF" },
    { x: 103.8, y: 295, c: "#F4D35E" },
  ];
  return (
    <svg viewBox="0 0 450 450" className="mx-auto w-full max-w-[450px]" role="img" aria-label="Agents orbiting one sealed attestation">
      <circle cx="225" cy="225" r="224" fill="none" stroke="#3A3A38" strokeOpacity="0.2" />
      <circle cx="225" cy="225" r="140" fill="none" stroke="#3A3A38" strokeOpacity="0.4" strokeDasharray="4 4" />
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 225 225" to="360 225 225" dur="20s" repeatCount="indefinite" />
        {nodes.map((n, i) => (
          <g key={i}>
            <line x1="225" y1="225" x2={n.x} y2={n.y} stroke="#3A3A38" strokeOpacity="0.2" />
            <rect x={n.x - 7} y={n.y - 7} width="14" height="14" fill={n.c} stroke="#1A3C2B" strokeWidth="1" />
          </g>
        ))}
      </g>
      <rect x="217" y="217" width="16" height="16" fill="#1A3C2B" />
    </svg>
  );
}
