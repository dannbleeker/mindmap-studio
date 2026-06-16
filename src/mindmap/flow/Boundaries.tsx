import { ViewportPortal, useNodes } from "@xyflow/react";
import { type CSSProperties, memo, useMemo } from "react";
import type { Boundary } from "../../model/types";
import {
  BOUNDARY_FILL,
  BOUNDARY_LABEL_BG,
  BOUNDARY_LABEL_BORDER,
  BOUNDARY_LABEL_COLOR,
  BOUNDARY_PAD,
  BOUNDARY_RADIUS,
  BOUNDARY_STROKE,
  boundaryLabel,
} from "./style";

// Filled boundary boxes, rendered in the flow coordinate space via ViewportPortal so they
// pan/zoom with the map. Each box is the padded bbox of its member nodes (read from their
// live measured rects), with a label chip — a MindManager-style enclosure. Geometry +
// colours come from ./style so the SVG export draws an identical box.

const chip: CSSProperties = {
  position: "absolute",
  top: -11,
  left: 12,
  padding: "1px 8px",
  background: BOUNDARY_LABEL_BG,
  color: BOUNDARY_LABEL_COLOR,
  border: `1px solid ${BOUNDARY_LABEL_BORDER}`,
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

/** One boundary box, resolved to its padded bbox in flow space. */
interface BoundaryBox {
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

function Boundaries({ boundaries }: { boundaries: readonly Boundary[] }) {
  const nodes = useNodes();
  // Resolve each boundary's bbox once per node/boundary change instead of on every parent re-render
  // (panning, selection, menus, …). `nodes` gets a fresh reference whenever a member moves, so the
  // boxes still track drags live — same output, just not recomputed when nothing geometric changed.
  const boxes = useMemo<BoundaryBox[]>(() => {
    if (boundaries.length === 0) return [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const out: BoundaryBox[] = [];
    for (const b of boundaries) {
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      let found = 0;
      for (const id of b.nodeIds) {
        const n = byId.get(id);
        if (!n) continue;
        const w = n.measured?.width ?? 0;
        const h = n.measured?.height ?? 0;
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + w);
        maxY = Math.max(maxY, n.position.y + h);
        found += 1;
      }
      if (found === 0) continue;
      out.push({
        id: b.id,
        label: boundaryLabel(b.label),
        left: minX - BOUNDARY_PAD,
        top: minY - BOUNDARY_PAD,
        width: maxX - minX + 2 * BOUNDARY_PAD,
        height: maxY - minY + 2 * BOUNDARY_PAD,
      });
    }
    return out;
  }, [nodes, boundaries]);

  if (boxes.length === 0) return null;

  return (
    <ViewportPortal>
      {boxes.map((b) => (
        <div
          key={b.id}
          style={{
            position: "absolute",
            left: b.left,
            top: b.top,
            width: b.width,
            height: b.height,
            boxSizing: "border-box",
            border: `1.5px solid ${BOUNDARY_STROKE}`,
            background: BOUNDARY_FILL,
            borderRadius: BOUNDARY_RADIUS,
            pointerEvents: "none",
          }}
        >
          {b.label ? <div style={chip}>{b.label}</div> : null}
        </div>
      ))}
    </ViewportPortal>
  );
}

const MemoBoundaries = memo(Boundaries);
export { MemoBoundaries as Boundaries };
