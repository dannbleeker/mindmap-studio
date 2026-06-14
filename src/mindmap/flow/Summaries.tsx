import { ViewportPortal, useNodes } from "@xyflow/react";
import type { CSSProperties } from "react";
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

export function Summaries({
  summaries,
  onRename,
}: {
  summaries: Summary[];
  onRename: (id: string) => void;
}) {
  const nodes = useNodes();
  if (summaries.length === 0) return null;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rootNode = nodes.find((n) => (n.data as { isRoot?: boolean })?.isRoot);
  const rootCenterX = rootNode ? rootNode.position.x + (rootNode.measured?.width ?? 0) / 2 : 0;

  return (
    <ViewportPortal>
      {summaries.map((s) => {
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
        if (found === 0) return null;
        // Left-side branch → bracket opens right ("["); right-side → bracket opens left ("]").
        const onLeft = (minX + maxX) / 2 < rootCenterX;
        const top = minY - SUMMARY_PAD;
        const height = maxY - minY + 2 * SUMMARY_PAD;
        const bracketLeft = onLeft ? minX - SUMMARY_GAP - SUMMARY_BRACKET_W : maxX + SUMMARY_GAP;
        return (
          <div key={s.id} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
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
              }}
            />
            <button
              type="button"
              className="nodrag nopan"
              title="Double-click to rename this summary"
              onDoubleClick={() => onRename(s.id)}
              style={{
                ...labelChip,
                top: top + height / 2 - 11,
                left: onLeft ? bracketLeft - 6 : bracketLeft + SUMMARY_BRACKET_W + 6,
                transform: onLeft ? "translateX(-100%)" : undefined,
              }}
            >
              {summaryLabel(s.label)}
            </button>
          </div>
        );
      })}
    </ViewportPortal>
  );
}
