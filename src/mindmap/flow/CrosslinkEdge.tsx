import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  useEdges,
  useInternalNode,
  useNodes,
} from "@xyflow/react";
import { arrowHeadPath } from "./arrowhead";
import { type Box, floatingPoints, getFloatingPoints } from "./floating";
import { type HopSegment, hopPath } from "./lineJumps";
import { CROSSLINK_COLOR, CROSSLINK_DASH, CROSSLINK_WIDTH } from "./style";
import type { EdgeData, FlowEdge } from "./types";

/** A live React Flow node's on-screen box (top-left + size → centre + size). This app has no
 *  sub-flow parenting, so `position` is already absolute — matching the exporter's rects. */
function boxOfNode(n: {
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
}): Box {
  const w = n.measured?.width ?? 0;
  const h = n.measured?.height ?? 0;
  return { cx: n.position.x + w / 2, cy: n.position.y + h / 2, w, h };
}

/**
 * Build the chord segments for EVERY relationship on the canvas, from the live node positions —
 * the same endpoint geometry (floatingPoints over node rects) the SVG exporter uses, so the hop
 * crossings match on screen and in exports. `order` is the edge's array index, so the hopper choice
 * (higher order hops) is stable + identical to the exporter, which walks edges in the same order.
 */
function collectSegments(
  crosslinks: { id: string; source: string; target: string }[],
  nodeBox: Map<string, Box>,
): HopSegment[] {
  const segs: HopSegment[] = [];
  crosslinks.forEach((e, i) => {
    const s = nodeBox.get(e.source);
    const t = nodeBox.get(e.target);
    if (!s || !t) return;
    const { sx, sy, tx, ty } = floatingPoints(s, t);
    segs.push({ id: e.id, order: i, sx, sy, tx, ty, fromId: e.source, toId: e.target });
  });
  return segs;
}

// Cross-link / relationship: a dashed floating bezier with a directional arrowhead and an optional
// label chip. Floating (border-to-border) so it routes sensibly in any layout, unlike a fixed-handle
// edge. Rendered via BaseEdge so it carries a wide invisible hit-area — the thin dashed line is easy
// to double-click (rename) or right-click (delete).
//
// LINE-JUMPS: when meta.lineJumps is on (carried as data.lineJumps), the visible line is drawn as
// the straight CHORD with a semicircular hop cut in wherever it crosses another relationship — from
// the shared pure helper (lineJumps.ts) that the SVG exporter also uses, so canvas == export. The
// wide bezier hit-area + arrowhead + label are unchanged (the gentle curve keeps the hit-area within
// reach of the chord), so rename/delete still work.

export function CrosslinkEdge({ id, source, target, label, data }: EdgeProps<FlowEdge>) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  // Subscribe to all nodes + edges so the hops re-compute live as ANY node moves or a relationship
  // is added/removed (not just when THIS edge's own endpoints move).
  const nodes = useNodes();
  const edges = useEdges<FlowEdge>();
  if (!s || !t) return null;
  const { sx, sy, tx, ty } = getFloatingPoints(s, t);
  // The bezier carries the wide invisible hit-area (and is the visible line when line-jumps is off).
  const [bezier, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });
  const color = data?.branchColor ?? CROSSLINK_COLOR;
  const dimOpacity = data?.dimmed ? 0.12 : 1;

  let visiblePath = bezier;
  if (data?.lineJumps) {
    const nodeBox = new Map<string, Box>();
    for (const n of nodes) nodeBox.set(n.id, boxOfNode(n));
    const crosslinks = edges.filter((e) => (e.data as EdgeData | undefined)?.crosslink);
    const segs = collectSegments(crosslinks, nodeBox);
    const self = segs.find((seg) => seg.id === id);
    if (self) visiblePath = hopPath(self, segs);
  }

  return (
    <>
      <BaseEdge
        path={visiblePath}
        interactionWidth={20}
        style={{
          stroke: color,
          strokeWidth: CROSSLINK_WIDTH,
          strokeDasharray: CROSSLINK_DASH,
          opacity: dimOpacity,
        }}
      />
      <path d={arrowHeadPath(tx, ty, sx, sy)} fill={color} style={{ opacity: dimOpacity }} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: 12,
              color,
              background: "var(--mm-node-bg, #ffffff)",
              padding: "0 4px",
              borderRadius: 4,
              pointerEvents: "none",
              opacity: dimOpacity,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
