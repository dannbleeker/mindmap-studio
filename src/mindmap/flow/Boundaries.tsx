import { ViewportPortal, useNodes } from "@xyflow/react";
import { type CSSProperties, memo, useMemo } from "react";
import type { Boundary } from "../../model/types";
import {
  BOUNDARY_PAD,
  BOUNDARY_RADIUS,
  type ResolvedBoundaryStyle,
  boundaryLabel,
  resolveBoundaryStyle,
} from "./style";

// Filled boundary boxes, rendered in the flow coordinate space via ViewportPortal so they
// pan/zoom with the map. Each box is the padded bbox of its member nodes (read from their
// live measured rects), with a label chip — a MindManager-style enclosure. Geometry +
// colours come from ./style so the SVG export draws an identical box.

// Label-chip layout (the colours come per-box from the resolved style, so a recoloured boundary
// re-tints its chip too).
const chipBase: CSSProperties = {
  position: "absolute",
  top: -11,
  left: 12,
  padding: "1px 8px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

/** One boundary box, resolved to its padded bbox in flow space + its resolved colours. */
interface BoundaryBox {
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  style: ResolvedBoundaryStyle;
}

// The clickable border rim (px). The box interior stays pointer-transparent (so enclosed nodes still
// drag + the marquee still works); only this thin frame + the label chip select the boundary.
const RIM = 6;
const RIM_SIDES = [
  { side: "top", style: { top: 0, left: 0, right: 0, height: RIM } },
  { side: "bottom", style: { bottom: 0, left: 0, right: 0, height: RIM } },
  { side: "left", style: { top: 0, bottom: 0, left: 0, width: RIM } },
  { side: "right", style: { top: 0, bottom: 0, right: 0, width: RIM } },
] as const;

function Boundaries({
  boundaries,
  selectedId,
  onSelect,
}: {
  boundaries: readonly Boundary[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
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
        style: resolveBoundaryStyle(b.color),
      });
    }
    return out;
  }, [nodes, boundaries]);

  if (boxes.length === 0) return null;

  return (
    <ViewportPortal>
      {boxes.map((b) => {
        const selected = b.id === selectedId;
        const chip: CSSProperties = {
          ...chipBase,
          background: b.style.labelBg,
          color: b.style.labelColor,
          border: `1px solid ${b.style.labelBorder}`,
        };
        return (
          <div
            key={b.id}
            style={{
              position: "absolute",
              left: b.left,
              top: b.top,
              width: b.width,
              height: b.height,
              boxSizing: "border-box",
              border: `1.5px solid ${b.style.stroke}`,
              background: b.style.fill,
              borderRadius: BOUNDARY_RADIUS,
              // The box itself never blocks pointer events — enclosed nodes keep dragging and the
              // marquee keeps working. The rim strips + chip below opt back in to catch selection.
              pointerEvents: "none",
              // Selection halo (view-only, additive — never exported, so canvas == export holds).
              boxShadow: selected
                ? `0 0 0 2px ${b.style.stroke}, 0 0 8px ${b.style.stroke}`
                : undefined,
            }}
          >
            {b.label ? (
              onSelect ? (
                <button
                  type="button"
                  className="nodrag nopan"
                  onClick={() => onSelect(b.id)}
                  title={`Select boundary "${b.label}"`}
                  style={{ ...chip, cursor: "pointer", pointerEvents: "auto" }}
                >
                  {b.label}
                </button>
              ) : (
                <div style={chip}>{b.label}</div>
              )
            ) : null}
            {onSelect
              ? RIM_SIDES.map(({ side, style }) => (
                  <button
                    key={side}
                    type="button"
                    className="nodrag nopan"
                    aria-label={`Select boundary${b.label ? ` "${b.label}"` : ""}`}
                    onClick={() => onSelect(b.id)}
                    style={{
                      position: "absolute",
                      ...style,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      pointerEvents: "auto",
                      cursor: "pointer",
                    }}
                  />
                ))
              : null}
          </div>
        );
      })}
    </ViewportPortal>
  );
}

const MemoBoundaries = memo(Boundaries);
export { MemoBoundaries as Boundaries };
