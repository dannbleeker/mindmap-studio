import { ViewportPortal, useNodes } from "@xyflow/react";
import type { CSSProperties } from "react";
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
// live measured rects), with a label chip — the same MindManager-style enclosure the
// mind-elixir overlay drew, now a first-class part of the React Flow canvas. Geometry +
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

export function Boundaries({ boundaries }: { boundaries: Boundary[] }) {
  const nodes = useNodes();
  if (boundaries.length === 0) return null;
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <ViewportPortal>
      {boundaries.map((b) => {
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
        if (found === 0) return null;
        const label = boundaryLabel(b.label);
        return (
          <div
            key={b.id}
            style={{
              position: "absolute",
              left: minX - BOUNDARY_PAD,
              top: minY - BOUNDARY_PAD,
              width: maxX - minX + 2 * BOUNDARY_PAD,
              height: maxY - minY + 2 * BOUNDARY_PAD,
              boxSizing: "border-box",
              border: `1.5px solid ${BOUNDARY_STROKE}`,
              background: BOUNDARY_FILL,
              borderRadius: BOUNDARY_RADIUS,
              pointerEvents: "none",
            }}
          >
            {label ? <div style={chip}>{label}</div> : null}
          </div>
        );
      })}
    </ViewportPortal>
  );
}
