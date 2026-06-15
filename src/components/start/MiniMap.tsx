// A small schematic radial-map thumbnail (SVG), deterministic from a seed string so each map /
// template gets a stable little glyph. Branch colours use the canvas palette identity; the central
// node uses currentColor so it stays visible on light + dark cards.

const PALETTE = ["#E8593C", "#3B8BD4", "#27852f", "#BA7517", "#7a3fb0", "#0C447C", "#993C1D"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function MiniMap({ seed }: { seed: string }) {
  const h = hash(seed);
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const n = 4 + (h % 3); // 4..6 branches
  const start = ((h >> 4) % 360) * (Math.PI / 180);
  const nodes = Array.from({ length: n }, (_, i) => {
    const ang = start + (i / n) * Math.PI * 2;
    const r = 30 + ((h >> (i * 3)) & 7) * 3;
    return {
      x: cx + Math.cos(ang) * r,
      y: cy + Math.sin(ang) * r,
      c: PALETTE[(h + i) % PALETTE.length],
    };
  });
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" aria-hidden="true">
      {nodes.map((p) => (
        <line
          key={`l${Math.round(p.x)}-${Math.round(p.y)}`}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke={p.c}
          strokeWidth="2"
          opacity="0.5"
        />
      ))}
      {nodes.map((p) => (
        <circle
          key={`c${Math.round(p.x)}-${Math.round(p.y)}`}
          cx={p.x}
          cy={p.y}
          r="5.5"
          fill={p.c}
        />
      ))}
      <circle cx={cx} cy={cy} r="10" fill="currentColor" />
    </svg>
  );
}
