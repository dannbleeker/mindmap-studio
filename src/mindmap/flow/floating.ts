import type { InternalNode } from "@xyflow/react";

// Floating-edge geometry: connect a node's border to another's, on the ray between their
// centres — so edges route correctly in ANY layout (side, org-chart, radial, fishbone, …)
// without per-layout handles. The rect-based core (`floatingPoints`) is pure, so the SVG
// exporter reuses the exact same geometry as the live canvas (canvas == export).

export interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface FloatingPoints {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

/** The point on box `a`'s border along the ray toward box `b`'s centre. */
function borderPoint(a: Box, b: Box): { x: number; y: number } {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  if (dx === 0 && dy === 0) return { x: a.cx, y: a.cy };
  const w2 = a.w / 2 || 1;
  const h2 = a.h / 2 || 1;
  const scale = Math.min(w2 / (Math.abs(dx) || 1e-6), h2 / (Math.abs(dy) || 1e-6));
  return { x: a.cx + dx * scale, y: a.cy + dy * scale };
}

/** Border-to-border connection points between two boxes. Pure. */
export function floatingPoints(s: Box, t: Box): FloatingPoints {
  const a = borderPoint(s, t);
  const b = borderPoint(t, s);
  return { sx: a.x, sy: a.y, tx: b.x, ty: b.y };
}

function box(node: InternalNode): Box {
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  const x = node.internals.positionAbsolute.x;
  const y = node.internals.positionAbsolute.y;
  return { cx: x + w / 2, cy: y + h / 2, w, h };
}

export function getFloatingPoints(source: InternalNode, target: InternalNode): FloatingPoints {
  return floatingPoints(box(source), box(target));
}
