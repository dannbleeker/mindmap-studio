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

/** Inline contextual popover — quick structural actions above the selected node (Rename / Collapse /
 *  Delete). Node-tracked via React Flow's NodeToolbar so it stays put through pan/zoom; hidden while the
 *  node is being inline-edited, and Delete is suppressed on the root. Canvas-only (never exported). The
 *  handlers are the same internal ops the keyboard + right-click menu use. */
export function NodePopover({
  selectedId,
  editingId,
  doc,
  onRename,
  onToggleCollapse,
  onDelete,
}: {
  selectedId: string | null;
  editingId: string | null;
  doc: MindMapDoc;
  onRename: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!selectedId || editingId === selectedId) return null;
  const sid = selectedId;
  const sel = findAnyNode(doc, sid);
  const isRoot = sid === doc.root.id;
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
        {/* Add child / sibling are re-homed onto the node as the hover ＋ affordances (#1); this
            popover keeps the rest of the quick actions. */}
        <PopBtn icon="text" label="Rename" onClick={() => onRename(sid)} />
        {hasKids ? (
          <PopBtn icon="minus" label="Collapse / expand" onClick={() => onToggleCollapse(sid)} />
        ) : null}
        {!isRoot ? (
          <PopBtn icon="trash" label="Delete" danger onClick={() => onDelete(sid)} />
        ) : null}
      </div>
    </NodeToolbar>
  );
}
