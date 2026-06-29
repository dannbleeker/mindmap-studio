import { MiniMap, NodeToolbar, Panel, Position, useStore } from "@xyflow/react";
import type { CSSProperties } from "react";
import { colors } from "../../design/tokens";
import { markerImage } from "../../icons";
import { buildLegend } from "../../legend";
import type { MindMapDoc } from "../../model/types";
import { findAnyNode } from "./ops";
import type { TopicNode } from "./types";

// Small canvas-only presentational overlays carved out of FlowMindMap's render. None are authored into
// the SVG export, so exports stay unchanged. All take plain props (doc passed in, not via docRef).

/** Empty-map coachmark — anchored under the root via NodeToolbar so it tracks pan/zoom. */
export function CoachMark({ show, rootId }: { show: boolean; rootId: string }) {
  if (!show) return null;
  return (
    <NodeToolbar nodeId={rootId} isVisible position={Position.Bottom} offset={18}>
      <div className="mm-coachmark nodrag nopan">
        <strong>Start your map</strong>
        <span>
          Press <kbd>Tab</kbd> for a child · <kbd>Enter</kbd> for a sibling · double-click to rename
        </span>
        <span>
          <kbd>Shift</kbd>-drag the canvas to select several topics
        </span>
      </div>
    </NodeToolbar>
  );
}

/** Drag-to-reparent label (#11): names the topic the dragged node will become a child of, anchored on
 *  the highlighted drop target. */
export function DropLabel({ dropTargetId, doc }: { dropTargetId: string | null; doc: MindMapDoc }) {
  if (!dropTargetId) return null;
  const t = findAnyNode(doc, dropTargetId);
  return (
    <NodeToolbar nodeId={dropTargetId} isVisible position={Position.Top} offset={8}>
      <div className="mm-drop-label nodrag nopan">
        ↳ Make child of “{t?.topic?.trim() || "topic"}”
      </div>
    </NodeToolbar>
  );
}

/** A slim bottom status bar — visible topic count, current selection size, and live zoom % (read from
 *  the React Flow store, so it tracks pan/zoom). Canvas-only, like the minimap. */
// A text-as-button inside the status bar (the clickable zoom % / selection-count) — no chrome, just a
// pointer cursor so the read-out doubles as an action.
const statBtn: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
  padding: 0,
};

export function StatusBar({
  topics,
  selected,
  onResetZoom,
  onFitSelection,
}: {
  topics: number;
  selected: number;
  /** Click the zoom % → reset to 100%. */
  onResetZoom?: () => void;
  /** Click the selection count → zoom to fit the selection. */
  onFitSelection?: () => void;
}) {
  const zoom = useStore((s) => s.transform[2]);
  return (
    <Panel position="bottom-center">
      <div
        className="nodrag nopan"
        style={{
          display: "flex",
          gap: 12,
          font: "11px system-ui, sans-serif",
          padding: "2px 10px",
          borderRadius: 6,
          border: `1px solid ${colors.menu.border}`,
          background: `var(--mm-node-bg, ${colors.menu.fallbackBg})`,
          color: `var(--mm-color, ${colors.menu.fallbackColor})`,
          opacity: 0.9,
          boxShadow: "0 1px 3px #0002",
        }}
      >
        <span>
          {topics} topic{topics === 1 ? "" : "s"}
        </span>
        {selected > 0 ? (
          onFitSelection ? (
            <button
              type="button"
              style={statBtn}
              title="Zoom to fit the selection"
              onClick={onFitSelection}
            >
              {selected} selected
            </button>
          ) : (
            <span>{selected} selected</span>
          )
        ) : null}
        {onResetZoom ? (
          <button type="button" style={statBtn} title="Reset zoom to 100%" onClick={onResetZoom}>
            {Math.round(zoom * 100)}%
          </button>
        ) : (
          <span>{Math.round(zoom * 100)}%</span>
        )}
      </div>
    </Panel>
  );
}

/** The map legend (top-left) — every marker / tag / conditional rule in use with its meaning. Shown
 *  when meta.legend is on; the SVG export draws the same rows (from the shared buildLegend). */
export function LegendPanel({ doc }: { doc: MindMapDoc }) {
  const entries = buildLegend(doc);
  if (entries.length === 0) return null;
  return (
    <Panel position="top-left">
      <div
        className="nodrag nopan"
        style={{
          font: "11px system-ui, sans-serif",
          padding: "6px 9px",
          borderRadius: 6,
          border: `1px solid ${colors.menu.border}`,
          background: `var(--mm-node-bg, ${colors.menu.fallbackBg})`,
          color: `var(--mm-color, ${colors.menu.fallbackColor})`,
          maxWidth: 220,
          boxShadow: "0 1px 3px #0002",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4, opacity: 0.7 }}>Legend</div>
        {entries.map((e, i) => (
          <div
            key={`${e.kind}:${e.label}:${i}`}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "1px 0" }}
          >
            {e.kind === "marker" && e.icon ? (
              markerImage(e.icon) ? (
                <img src={markerImage(e.icon) as string} alt="" width={13} height={13} />
              ) : (
                <span style={{ width: 13, textAlign: "center" }}>{e.icon}</span>
              )
            ) : (
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: e.kind === "tag" ? 6 : 2,
                  background: e.color ?? colors.accent,
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.label}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** The minimap (when open) + the bottom-right show/hide toggle. */
export function MinimapPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <>
      {open ? (
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => (node.data as TopicNode["data"])?.branchColor ?? "#bbb"}
          nodeStrokeWidth={3}
          style={{ marginBottom: 30 }}
        />
      ) : null}
      <Panel position="bottom-right">
        <button
          type="button"
          onClick={onToggle}
          title={open ? "Hide minimap" : "Show minimap"}
          style={{
            font: "12px system-ui, sans-serif",
            padding: "2px 8px",
            borderRadius: 6,
            border: `1px solid ${colors.menu.border}`,
            background: `var(--mm-node-bg, ${colors.menu.fallbackBg})`,
            color: `var(--mm-color, ${colors.menu.fallbackColor})`,
            cursor: "pointer",
            boxShadow: "0 1px 3px #0002",
          }}
        >
          {open ? "Minimap ▾" : "Minimap ▴"}
        </button>
      </Panel>
    </>
  );
}
