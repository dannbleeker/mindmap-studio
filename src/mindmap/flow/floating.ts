import type { InternalNode } from "@xyflow/react";

// Floating-edge geometry: connect a node's border to another's, on the ray between their
// centres — so edges route correctly in ANY layout (side, org-chart, radial, fishbone, …)
// without per-layout connection handles. Standard React Flow "floating edges" technique.

interface Pt {
  x: number;
  y: number;
}

function rect(node: InternalNode) {
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  const x = node.internals.positionAbsolute.x;
  const y = node.internals.positionAbsolute.y;
  return { cx: x + w / 2, cy: y + h / 2, w, h };
}

/** The point on `node`'s border along the ray toward `other`'s centre. */
function borderPoint(node: InternalNode, other: InternalNode): Pt {
  const a = rect(node);
  const b = rect(other);
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  if (dx === 0 && dy === 0) return { x: a.cx, y: a.cy };
  const w2 = a.w / 2 || 1;
  const h2 = a.h / 2 || 1;
  const scale = Math.min(w2 / (Math.abs(dx) || 1e-6), h2 / (Math.abs(dy) || 1e-6));
  return { x: a.cx + dx * scale, y: a.cy + dy * scale };
}

export interface FloatingPoints {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

export function getFloatingPoints(source: InternalNode, target: InternalNode): FloatingPoints {
  const s = borderPoint(source, target);
  const t = borderPoint(target, source);
  return { sx: s.x, sy: s.y, tx: t.x, ty: t.y };
}
