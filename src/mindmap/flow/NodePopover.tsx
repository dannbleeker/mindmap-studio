import { NodeToolbar, Position } from "@xyflow/react";
import { EditorIcon, type EditorIconName } from "../../components/EditorIcons";
import { colors } from "../../design/tokens";
import type { MindMapDoc } from "../../model/types";
import { findAnyNode } from "./ops";

/** One button in the inline node popover (the on-selection quick-action toolbar). */
function PopBtn({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: EditorIconName;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="nodrag nopan"
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: danger ? "#b23b3a" : colors.muted,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <EditorIcon name={icon} size={16} />
    </button>
  );
}

/** Inline contextual popover — quick actions above the selected node: Collapse / expand (when the node
 *  has children) and "More…", which opens the full right-click menu at the node so Rename / Delete / Add
 *  callout / roll-up etc. are all one click away without right-clicking (C6 — friendlier on trackpad +
 *  touch). Node-tracked via React Flow's NodeToolbar so it stays put through pan/zoom; hidden while the
 *  node is being inline-edited. Canvas-only (never exported). */
export function NodePopover({
  selectedId,
  editingId,
  doc,
  onToggleCollapse,
  onMore,
}: {
  selectedId: string | null;
  editingId: string | null;
  doc: MindMapDoc;
  onToggleCollapse: (id: string) => void;
  onMore: (id: string) => void;
}) {
  if (!selectedId || editingId === selectedId) return null;
  const sid = selectedId;
  const sel = findAnyNode(doc, sid);
  const hasKids = (sel?.children?.length ?? 0) > 0;
  return (
    <NodeToolbar nodeId={sid} isVisible position={Position.Top} offset={10}>
      <div
        className="nodrag nopan"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          background: colors.white,
          border: `1px solid ${colors.border}`,
          borderRadius: 11,
          padding: 4,
          boxShadow: "0 10px 30px rgba(40,30,16,0.18)",
        }}
      >
        {/* Add child / sibling are re-homed onto the node as the hover ＋ affordances (#1); Rename +
            Delete moved into the "More…" menu (C6) — this popover keeps Collapse + the menu opener. */}
        {hasKids ? (
          <PopBtn icon="minus" label="Collapse / expand" onClick={() => onToggleCollapse(sid)} />
        ) : null}
        <PopBtn icon="dots" label="More actions" onClick={() => onMore(sid)} />
      </div>
    </NodeToolbar>
  );
}
