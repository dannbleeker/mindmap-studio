import { type EdgeProps, useInternalNode } from "@xyflow/react";
import { getFloatingPoints } from "./floating";
import type { FlowEdge } from "./types";

// Organic, tapered branch: a filled bezier ribbon, thick near the parent and thinner toward
// the child (the MindManager branch look — an SVG stroke can't taper, so we fill a closed
// shape from two offset curves). It's a *floating* edge (connection points computed from the
// node borders), so it routes correctly in every layout. The path-builder is pure so Phase
// F's SVG exporter can reuse the exact geometry (canvas == export).

function halfThickness(depth: number): number {
  return Math.max(7 - depth * 1.1, 2.5) / 2;
}

/** Filled tapered-ribbon path between two points, curving along the dominant axis. Pure. */
export function taperedRibbonPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  depth: number,
): string {
  const wS = halfThickness(Math.max(0, depth - 1)); // half-width at the parent
  const wT = halfThickness(depth); // thinner at the child
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len; // unit perpendicular
  const py = dx / len;
  // Curve along whichever axis dominates, so horizontal and vertical layouts both look right.
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const c1x = horizontal ? sx + dx * 0.5 : sx;
  const c1y = horizontal ? sy : sy + dy * 0.5;
  const c2x = horizontal ? tx - dx * 0.5 : tx;
  const c2y = horizontal ? ty : ty - dy * 0.5;
  return [
    `M ${sx + px * wS} ${sy + py * wS}`,
    `C ${c1x + px * wS} ${c1y + py * wS} ${c2x + px * wT} ${c2y + py * wT} ${tx + px * wT} ${ty + py * wT}`,
    `L ${tx - px * wT} ${ty - py * wT}`,
    `C ${c2x - px * wT} ${c2y - py * wT} ${c1x - px * wS} ${c1y - py * wS} ${sx - px * wS} ${sy - py * wS}`,
    "Z",
  ].join(" ");
}

export function BranchEdge({ source, target, data }: EdgeProps<FlowEdge>) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;
  const { sx, sy, tx, ty } = getFloatingPoints(s, t);
  const color = data?.branchColor ?? "#999";
  const depth = data?.depth ?? 1;
  return (
    <path
      d={taperedRibbonPath(sx, sy, tx, ty, depth)}
      fill={color}
      stroke="none"
      opacity={data?.dimmed ? 0.12 : 1}
    />
  );
}
