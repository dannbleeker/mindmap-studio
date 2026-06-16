import { ViewportPortal, useNodes } from "@xyflow/react";
import { type CSSProperties, memo, useMemo, useState } from "react";
import type { Callout } from "../../model/types";
import { CALLOUT_BG, CALLOUT_STROKE, CALLOUT_TEXT } from "./style";

// Anchored callout bubbles (MindManager-style sticky annotations), rendered in flow space via
// ViewportPortal so they pan/zoom with the map. Each bubble sits at its node's right edge plus
// the callout's (dx,dy) offset, joined by a short dashed connector. Text is inline-editable
// (double-click); a × removes it. Model-first: edits call back to FlowInner, which runs the
// pure callout ops — so the bubbles also travel into the SVG export and the .json.

export interface CalloutAnchor {
  nodeId: string;
  callout: Callout;
}

const BUBBLE: CSSProperties = {
  position: "absolute",
  maxWidth: 180,
  minWidth: 36,
  padding: "3px 8px",
  background: CALLOUT_BG,
  color: CALLOUT_TEXT,
  border: `1px solid ${CALLOUT_STROKE}`,
  borderRadius: 8,
  fontSize: 12,
  lineHeight: 1.3,
  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
  whiteSpace: "pre-wrap",
};

/** A callout resolved to its anchored position in flow space. */
interface PlacedCallout {
  nodeId: string;
  callout: Callout;
  left: number;
  top: number;
}

function Callouts({
  items,
  onCommit,
  onDelete,
}: {
  items: CalloutAnchor[];
  onCommit: (nodeId: string, calloutId: string, text: string) => void;
  onDelete: (nodeId: string, calloutId: string) => void;
}) {
  const nodes = useNodes();
  const [editingId, setEditingId] = useState<string | null>(null);
  // Resolve each callout's anchor once per node/item change, not on every parent re-render (and not
  // when only `editingId` flips). `nodes` is a fresh reference whenever an anchor node moves, so the
  // bubbles still follow drags live — identical placement, just no redundant per-render math.
  const placed = useMemo<PlacedCallout[]>(() => {
    if (items.length === 0) return [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const out: PlacedCallout[] = [];
    for (const { nodeId, callout } of items) {
      const n = byId.get(nodeId);
      if (!n) continue;
      const w = n.measured?.width ?? 0;
      const h = n.measured?.height ?? 0;
      out.push({
        nodeId,
        callout,
        left: n.position.x + w + callout.dx,
        top: n.position.y + h / 2 + callout.dy,
      });
    }
    return out;
  }, [nodes, items]);

  if (placed.length === 0) return null;

  return (
    <ViewportPortal>
      {placed.map(({ nodeId, callout, left, top }) => {
        const editing = editingId === callout.id;
        return (
          <div
            key={callout.id}
            className="nodrag nopan"
            style={{ position: "absolute", left, top }}
          >
            {/* dashed connector from the node's right-centre to the bubble */}
            {/* biome-ignore lint/a11y/noSvgWithoutTitle: purely decorative connector (aria-hidden) */}
            <svg
              width="1"
              height="1"
              style={{ position: "absolute", overflow: "visible", pointerEvents: "none" }}
              aria-hidden
            >
              <line
                x1={-callout.dx}
                y1={-callout.dy}
                x2={0}
                y2={10}
                stroke={CALLOUT_STROKE}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            </svg>
            <div style={BUBBLE}>
              {editing ? (
                <textarea
                  // biome-ignore lint/a11y/noAutofocus: focus the bubble the user just opened to edit
                  autoFocus
                  defaultValue={callout.text}
                  rows={2}
                  style={{
                    width: 150,
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    resize: "none",
                    font: "inherit",
                    color: "inherit",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onCommit(nodeId, callout.id, (e.target as HTMLTextAreaElement).value);
                      setEditingId(null);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingId(null);
                    }
                  }}
                  onBlur={(e) => {
                    onCommit(nodeId, callout.id, e.target.value);
                    setEditingId(null);
                  }}
                />
              ) : (
                <>
                  <button
                    type="button"
                    title="Delete callout"
                    onClick={() => onDelete(nodeId, callout.id)}
                    style={{
                      float: "right",
                      marginLeft: 6,
                      border: "none",
                      background: "transparent",
                      color: "#8a6d00",
                      cursor: "pointer",
                      lineHeight: 1,
                      padding: 0,
                      fontSize: 13,
                    }}
                  >
                    ×
                  </button>
                  <span onDoubleClick={() => setEditingId(callout.id)}>{callout.text || "…"}</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </ViewportPortal>
  );
}

const MemoCallouts = memo(Callouts);
export { MemoCallouts as Callouts };
