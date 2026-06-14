import { EdgeLabelRenderer, type EdgeProps, getBezierPath, useInternalNode } from "@xyflow/react";
import { getFloatingPoints } from "./floating";
import type { FlowEdge } from "./types";

// Cross-link / relationship: a dashed floating bezier with an optional label chip. Floating
// (border-to-border) so it routes sensibly in any layout, unlike a fixed-handle edge.

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
  const color = data?.branchColor ?? "#8b87e0";
  return (
    <>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="6 4" />
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
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
