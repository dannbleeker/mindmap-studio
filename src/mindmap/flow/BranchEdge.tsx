import { type EdgeProps, useInternalNode } from "@xyflow/react";
import { memo } from "react";
import {
  attachSideFor,
  branchEndpoints,
  branchWidths,
  childrenAxis,
  nodeBox,
  taperedRibbonPath,
} from "./floating";
import type { FlowEdge } from "./types";

// Organic, tapered branch (the MindManager "trunk that fans" look): all of a parent's children spring
// from ONE point on the side they sit, leave straight out (so the fan never crosses), enter each child
// at its near end, overlap both boxes (always touch), and taper from a chunky trunk to a fine tip. The
// shared side is computed per parent in FlowMindMap.sync() and carried on `data.attachSide`; when it
// hasn't arrived yet (the first frame) we fall back to this edge's own parent→child direction. The
// geometry lives in flow/floating.ts so the SVG exporter reuses it byte-for-byte (canvas == export).

// Memoised: React Flow re-renders every edge when the edge array changes. The geometry tracks live
// node movement through `useInternalNode` (a store subscription memo never blocks), so memo only
// skips the redundant re-renders driven by unrelated parent state.
function BranchEdgeImpl({ source, target, data }: EdgeProps<FlowEdge>) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;
  const parent = nodeBox(s);
  const child = nodeBox(t);
  const side = data?.attachSide ?? attachSideFor(parent, child, childrenAxis(parent, [child]));
  const { sx, sy, tx, ty } = branchEndpoints(parent, child, side);
  const { trunk, tip } = branchWidths(data?.depth ?? 1);
  return (
    <path
      d={taperedRibbonPath(sx, sy, tx, ty, side, trunk, tip)}
      fill={data?.branchColor ?? "#999"}
      stroke="none"
      opacity={data?.dimmed ? 0.12 : 1}
    />
  );
}

export const BranchEdge = memo(BranchEdgeImpl);
