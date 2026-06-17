import { ViewportPortal, useNodes } from "@xyflow/react";
import { type CSSProperties, memo, useMemo } from "react";
import type { Summary } from "../../model/types";
import {
  SUMMARY_BRACKET_W,
  SUMMARY_GAP,
  SUMMARY_LABEL_BG,
  SUMMARY_LABEL_BORDER,
  SUMMARY_LABEL_COLOR,
  SUMMARY_PAD,
  SUMMARY_STROKE,
  summaryLabel,
} from "./style";

// Summary brackets: a labelled bracket drawn to one side of a node's subtree, in flow space via
// ViewportPortal (so it pans/zooms with the map). Side follows the range's position relative to the
// root — a right-side branch gets a "]" on its right; a left-side branch gets a "[" on its left.
// Double-click the label to rename. Geometry + colours come from ./style so the SVG export matches.

const labelChip: CSSProperties = {
  position: "absolute",
  padding: "1px 8px",
  background: SUMMARY_LABEL_BG,
  color: SUMMARY_LABEL_COLOR,
  border: `1px solid ${SUMMARY_LABEL_BORDER}`,
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
  cursor: "text",
  pointerEvents: "auto",
};

/** A summary bracket resolved to its drawn geometry from the live node rects. */
interface PlacedSummary {
  id: string;
  label: string;
  onLeft: boolean;
  top: number;
  height: number;
  bracketLeft: number;
}

function Summaries({
  summaries,
  onRename,
  selectedId,
  onSelect,
}: {
  summaries: readonly Summary[];
  onRename: (id: string) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const nodes = useNodes();
  // Resolve each bracket's geometry once per node/summary change rather than on every parent
  // re-render. `nodes` is a fresh reference whenever a member moves, so brackets still track drags
  // live — identical geometry, just not recomputed needlessly.
  const placed = useMemo<PlacedSummary[]>(() => {
    if (summaries.length === 0) return [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const rootNode = nodes.find((n) => (n.data as { isRoot?: boolean })?.isRoot);
    const rootCenterX = rootNode ? rootNode.position.x + (rootNode.measured?.width ?? 0) / 2 : 0;
    const out: PlacedSummary[] = [];
    for (const s of summaries) {
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      let found = 0;
      for (const id of s.nodeIds) {
        const n = byId.get(id);
        if (!n) continue;
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + (n.measured?.width ?? 0));
        maxY = Math.max(maxY, n.position.y + (n.measured?.height ?? 0));
        found += 1;
      }
      if (found === 0) continue;
      // Left-side branch → bracket opens right ("["); right-side → bracket opens left ("]").
      const onLeft = (minX + maxX) / 2 < rootCenterX;
      const top = minY - SUMMARY_PAD;
      const height = maxY - minY + 2 * SUMMARY_PAD;
      const bracketLeft = onLeft ? minX - SUMMARY_GAP - SUMMARY_BRACKET_W : maxX + SUMMARY_GAP;
      out.push({ id: s.id, label: summaryLabel(s.label), onLeft, top, height, bracketLeft });
    }
    return out;
  }, [nodes, summaries]);

  if (placed.length === 0) return null;

  return (
    <ViewportPortal>
      {placed.map(({ id, label, onLeft, top, height, bracketLeft }) => {
        const selected = id === selectedId;
        return (
          <div key={id} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
            <div
              style={{
                position: "absolute",
                left: bracketLeft,
                top,
                width: SUMMARY_BRACKET_W,
                height,
                boxSizing: "border-box",
                borderTop: `2px solid ${SUMMARY_STROKE}`,
                borderBottom: `2px solid ${SUMMARY_STROKE}`,
                borderLeft: onLeft ? `2px solid ${SUMMARY_STROKE}` : undefined,
                borderRight: onLeft ? undefined : `2px solid ${SUMMARY_STROKE}`,
                pointerEvents: "none",
                // Selection halo (view-only, additive — not exported).
                filter: selected ? `drop-shadow(0 0 4px ${SUMMARY_STROKE})` : undefined,
              }}
            />
            <button
              type="button"
              className="nodrag nopan"
              title="Click to select · double-click to rename this summary"
              onClick={() => onSelect?.(id)}
              onDoubleClick={() => onRename(id)}
              style={{
                ...labelChip,
                top: top + height / 2 - 11,
                left: onLeft ? bracketLeft - 6 : bracketLeft + SUMMARY_BRACKET_W + 6,
                transform: onLeft ? "translateX(-100%)" : undefined,
                cursor: "pointer",
                boxShadow: selected ? `0 0 0 2px ${SUMMARY_STROKE}` : undefined,
              }}
            >
              {label}
            </button>
          </div>
        );
      })}
    </ViewportPortal>
  );
}

const MemoSummaries = memo(Summaries);
export { MemoSummaries as Summaries };
