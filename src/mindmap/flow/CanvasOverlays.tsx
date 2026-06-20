import { MiniMap, NodeToolbar, Panel, Position } from "@xyflow/react";
import { colors } from "../../design/tokens";
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
