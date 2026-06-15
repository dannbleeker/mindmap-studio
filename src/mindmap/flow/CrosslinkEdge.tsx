import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  useInternalNode,
} from "@xyflow/react";
import { getFloatingPoints } from "./floating";
import { r2 } from "./geometry";
import { CROSSLINK_COLOR, CROSSLINK_DASH, CROSSLINK_WIDTH } from "./style";
import type { FlowEdge } from "./types";

/** A filled triangle arrowhead with its tip at (tipX,tipY), pointing away from (fromX,fromY).
 *  Shared by the canvas edge and the SVG exporter so a relationship reads directionally in both
 *  — the flowchart / concept-map connector. Returns an SVG path `d`. */
export function arrowHeadPath(
  tipX: number,
  tipY: number,
  fromX: number,
  fromY: number,
  size = 9,
): string {
  const dx = tipX - fromX;
  const dy = tipY - fromY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const bx = tipX - ux * size; // base centre, `size` back from the tip
  const by = tipY - uy * size;
  const px = -uy; // perpendicular
  const py = ux;
  const w = size * 0.55;
  return `M ${r2(tipX)} ${r2(tipY)} L ${r2(bx + px * w)} ${r2(by + py * w)} L ${r2(bx - px * w)} ${r2(by - py * w)} Z`;
}

// Cross-link / relationship: a dashed floating bezier with a directional arrowhead and an optional
// label chip. Floating (border-to-border) so it routes sensibly in any layout, unlike a fixed-handle
// edge. Rendered via BaseEdge so it carries a wide invisible hit-area — the thin dashed line is easy
// to double-click (rename) or right-click (delete).

export function CrosslinkEdge({ source, target, label, data }: EdgeProps<FlowEdge>) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;
  const { sx, sy, tx, ty } = getFloatingPoints(s, t);
  const [path, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });
  const color = data?.branchColor ?? CROSSLINK_COLOR;
  const dimOpacity = data?.dimmed ? 0.12 : 1;
  return (
    <>
      <BaseEdge
        path={path}
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
