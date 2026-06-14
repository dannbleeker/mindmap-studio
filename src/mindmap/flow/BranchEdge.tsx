import type { EdgeProps } from "@xyflow/react";
import type { FlowEdge } from "./types";

// Organic, tapered branch: a filled bezier ribbon that's thick near the parent and thins
// toward the child (the MindManager branch look) — an SVG stroke can't taper, so we draw a
// closed shape from two offset cubic curves. The path-builder is kept pure so Phase F's SVG
// exporter can reuse the exact same geometry (canvas == export).

function halfThickness(depth: number): number {
  return Math.max(7 - depth * 1.1, 2.5) / 2;
}

/** Build the filled tapered-ribbon path between two points. Exported for the SVG exporter. */
export function taperedRibbonPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  depth: number,
): string {
  const wS = halfThickness(Math.max(0, depth - 1)); // half-width at the parent
  const wT = halfThickness(depth); // thinner at the child
  const dir = Math.sign(tx - sx) || 1;
  const dx = Math.max(Math.abs(tx - sx) * 0.5, 24) * dir;
  const c1x = sx + dx;
  const c2x = tx - dx;
  return [
    `M ${sx} ${sy - wS}`,
    `C ${c1x} ${sy - wS} ${c2x} ${ty - wT} ${tx} ${ty - wT}`,
    `L ${tx} ${ty + wT}`,
    `C ${c2x} ${ty + wT} ${c1x} ${sy + wS} ${sx} ${sy + wS}`,
    "Z",
  ].join(" ");
}

export function BranchEdge({ sourceX, sourceY, targetX, targetY, data }: EdgeProps<FlowEdge>) {
  const color = data?.branchColor ?? "#999";
  const depth = data?.depth ?? 1;
  const d = taperedRibbonPath(sourceX, sourceY, targetX, targetY, depth);
  return <path d={d} fill={color} stroke="none" />;
}
