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

export function nodeBox(node: InternalNode): Box {
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  const x = node.internals.positionAbsolute.x;
  const y = node.internals.positionAbsolute.y;
  return { cx: x + w / 2, cy: y + h / 2, w, h };
}

export function getFloatingPoints(source: InternalNode, target: InternalNode): FloatingPoints {
  return floatingPoints(nodeBox(source), nodeBox(target));
}

// ── Organic branch connectors (the MindManager "trunk that fans" look) ───────────────────────────
// A parent's child branches all spring from ONE point on the side its children sit, leave straight
// out (so the fan never crosses), enter each child at its near end, overlap both boxes (always touch),
// and taper from a chunky trunk to a fine tip. All pure → the live canvas (BranchEdge) and the SVG
// exporter share this exact geometry (canvas == export).

export type AttachSide = "left" | "right" | "top" | "bottom";

/** Which axis a parent's children predominantly spread along. Picked per parent so every sibling
 *  resolves to a consistent side (one shared origin per side → no crossed fan); a two-sided centre
 *  topic naturally splits into a left group and a right group. */
export function childrenAxis(parent: Box, children: Box[]): "h" | "v" {
  let sx = 0;
  let sy = 0;
  for (const c of children) {
    sx += Math.abs(c.cx - parent.cx);
    sy += Math.abs(c.cy - parent.cy);
  }
  return sx >= sy ? "h" : "v";
}

/** The side of the parent a child sits on, along the parent's dominant axis. */
export function attachSideFor(parent: Box, child: Box, axis: "h" | "v"): AttachSide {
  if (axis === "h") return child.cx >= parent.cx ? "right" : "left";
  return child.cy >= parent.cy ? "bottom" : "top";
}

/** Chunky-trunk → fine-tip half-widths by the child's depth (MindManager weight: mains thick, subs
 *  progressively thinner). */
export function branchWidths(depth: number): { trunk: number; tip: number } {
  return { trunk: Math.max(7.5 - depth * 1.2, 3), tip: Math.max(2.4 - depth * 0.3, 0.9) };
}

/** The single origin on the parent's `side` + the child's near-end entry, both tucked INTO the boxes
 *  (by `overlap`) so the branch always touches and the chunky bases merge into one trunk. The child
 *  entry slides toward the origin's level ("enter from the near end"): the top child connects at its
 *  lower end, the bottom child at its upper end, a level child at its mid. */
export function branchEndpoints(
  parent: Box,
  child: Box,
  side: AttachSide,
  overlap = 7,
  endInset = 9,
): FloatingPoints {
  const ov = Math.min(overlap, parent.w / 2, parent.h / 2, child.w / 2, child.h / 2);
  const pl = parent.cx - parent.w / 2;
  const pr = parent.cx + parent.w / 2;
  const pt = parent.cy - parent.h / 2;
  const pb = parent.cy + parent.h / 2;
  const cl = child.cx - child.w / 2;
  const cr = child.cx + child.w / 2;
  const ct = child.cy - child.h / 2;
  const cb = child.cy + child.h / 2;
  // Clamp the entry to the child's near edge, leaving a small inset so it lands on the rounded end.
  const slide = (lo: number, hi: number, v: number): number => {
    const pad = Math.min(endInset, (hi - lo) / 2);
    return Math.max(lo + pad, Math.min(hi - pad, v));
  };
  if (side === "right")
    return { sx: pr - ov, sy: parent.cy, tx: cl + ov, ty: slide(ct, cb, parent.cy) };
  if (side === "left")
    return { sx: pl + ov, sy: parent.cy, tx: cr - ov, ty: slide(ct, cb, parent.cy) };
  if (side === "bottom")
    return { sx: parent.cx, sy: pb - ov, tx: slide(cl, cr, parent.cx), ty: ct + ov };
  return { sx: parent.cx, sy: pt + ov, tx: slide(cl, cr, parent.cx), ty: cb - ov };
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Filled tapered-ribbon path: leaves the origin straight out along `side` (so a single-origin fan
 *  stays monotonic — never crosses), eases into the child's near edge, and tapers trunk→tip with the
 *  width offset ⟂ the LOCAL tangent (even ribbon, trunk aligned to the branch). Pure. */
export function taperedRibbonPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  side: AttachSide,
  trunkHW: number,
  tipHW: number,
): string {
  const horizontal = side === "left" || side === "right";
  const dx = tx - sx;
  const dy = ty - sy;
  // Straight-out departure along the side; ease in along the child's near-edge normal.
  const c1x = horizontal ? sx + dx * 0.5 : sx;
  const c1y = horizontal ? sy : sy + dy * 0.5;
  const c2x = horizontal ? tx - dx * 0.5 : tx;
  const c2y = horizontal ? ty : ty - dy * 0.5;
  // Offset perpendicular to the local tangent at each end, not the chord — even taper.
  const sl = Math.hypot(c1x - sx, c1y - sy) || 1;
  const spx = -(c1y - sy) / sl;
  const spy = (c1x - sx) / sl;
  const tl = Math.hypot(tx - c2x, ty - c2y) || 1;
  const tpx = -(ty - c2y) / tl;
  const tpy = (tx - c2x) / tl;
  return [
    `M ${r2(sx + spx * trunkHW)} ${r2(sy + spy * trunkHW)}`,
    `C ${r2(c1x + spx * trunkHW)} ${r2(c1y + spy * trunkHW)} ${r2(c2x + tpx * tipHW)} ${r2(c2y + tpy * tipHW)} ${r2(tx + tpx * tipHW)} ${r2(ty + tpy * tipHW)}`,
    `L ${r2(tx - tpx * tipHW)} ${r2(ty - tpy * tipHW)}`,
    `C ${r2(c2x - tpx * tipHW)} ${r2(c2y - tpy * tipHW)} ${r2(c1x - spx * trunkHW)} ${r2(c1y - spy * trunkHW)} ${r2(sx - spx * trunkHW)} ${r2(sy - spy * trunkHW)}`,
    "Z",
  ].join(" ");
}

/** The relationship (cross-link) curve: a cubic that bows along the X axis, with both control points
 *  pinned to the horizontal midpoint. Shared by the live canvas edge (BranchEdge's sibling
 *  CrosslinkEdge) AND the SVG exporter so a relationship bows the SAME way on screen and in every
 *  export — canvas == export. Without this the canvas used React Flow's default bottom/top handles
 *  (a vertical bow) while the exporter drew this horizontal S, so the two disagreed. The label sits at
 *  the curve's geometric midpoint. */
export function crosslinkBezier(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): { path: string; labelX: number; labelY: number } {
  const mx = (sx + tx) / 2;
  const path = `M ${r2(sx)} ${r2(sy)} C ${r2(mx)} ${r2(sy)} ${r2(mx)} ${r2(ty)} ${r2(tx)} ${r2(ty)}`;
  return { path, labelX: (sx + tx) / 2, labelY: (sy + ty) / 2 };
}
