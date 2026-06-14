import { Handle, type NodeProps, Position } from "@xyflow/react";
import { type CSSProperties, useEffect, useMemo, useRef } from "react";
import { sanitizeRich } from "../../io/richText";
import { useEditing } from "./editing";
import type { TopicNode as TopicNodeT } from "./types";

// Custom topic node: a rounded box honouring the model's NodeStyle, with marker emoji, the
// topic text (inline-editable via contenteditable), an optional image, note/link affordances,
// tag chips, and a collapse toggle. Four hidden handles let branches connect on any side.

const HANDLE: CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: "none",
  background: "transparent",
};

const chipStyle: CSSProperties = {
  fontSize: 11,
  padding: "0 6px",
  borderRadius: 6,
  background: "rgba(0,0,0,0.06)",
  color: "inherit",
};

export function TopicNode({ id, data }: NodeProps<TopicNodeT>) {
  const {
    topic,
    topicRich,
    icons,
    tags,
    style,
    image,
    note,
    hyperlink,
    isRoot,
    branchColor,
    collapsed,
    hasChildren,
  } = data;
  const editing = useEditing();
  const isEditing = editing?.editingId === id;
  const editRef = useRef<HTMLDivElement>(null);
  // Re-sanitise on render too (defence-in-depth: a topicRich could arrive via an imported .json).
  const richHtml = useMemo(() => (topicRich ? sanitizeRich(topicRich) : null), [topicRich]);

  // On entering edit mode: seed the text, focus, and select all (uncontrolled — React must
  // not re-render over the user's keystrokes, so the text is set imperatively, once).
  useEffect(() => {
    if (!isEditing || !editRef.current) return;
    const el = editRef.current;
    // Seed with the rich HTML so existing formatting stays editable; else plain text.
    if (richHtml) el.innerHTML = richHtml;
    else el.textContent = topic;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [isEditing, topic, richHtml]);

  const box: CSSProperties = isRoot
    ? {
        background: "var(--mm-root-bg, #26215c)",
        color: "var(--mm-root-color, #ffffff)",
        borderRadius: 26,
        padding: "8px 18px",
        fontWeight: 700,
        border: "none",
      }
    : {
        background: style?.background ?? "var(--mm-node-bg, #faf9f5)",
        color: style?.color ?? "var(--mm-color, #2c2c2a)",
        border: style?.border ?? `2px solid ${branchColor}`,
        borderRadius: style?.borderRadius ?? "16px",
        padding: "6px 12px",
        fontSize: style?.fontSize,
        fontWeight: style?.fontWeight,
        fontFamily: style?.fontFamily,
        textDecoration: style?.textDecoration,
      };

  return (
    <div
      style={{
        ...box,
        position: "relative",
        boxSizing: "border-box",
        maxWidth: 320,
        lineHeight: 1.35,
        boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        editing?.beginEdit(id);
      }}
    >
      <Handle type="target" id="tl" position={Position.Left} style={HANDLE} />
      <Handle type="target" id="tr" position={Position.Right} style={HANDLE} />
      <Handle type="source" id="sl" position={Position.Left} style={HANDLE} />
      <Handle type="source" id="sr" position={Position.Right} style={HANDLE} />
      {image ? (
        <img
          src={image.url}
          alt=""
          style={{
            display: "block",
            maxWidth: 200,
            maxHeight: 140,
            borderRadius: 4,
            marginBottom: 4,
          }}
        />
      ) : null}
      <span style={{ whiteSpace: "pre-wrap" }}>
        {icons?.length ? <span style={{ marginRight: 4 }}>{icons.join(" ")}</span> : null}
        {isEditing ? (
          <span
            ref={editRef}
            contentEditable
            suppressContentEditableWarning
            className="nodrag nopan"
            style={{ outline: "none", display: "inline-block", minWidth: 16 }}
            onKeyDown={(e) => {
              // Inline formatting: Ctrl/Cmd + B / I / U (execCommand works in contenteditable).
              if ((e.ctrlKey || e.metaKey) && /^[biu]$/i.test(e.key)) {
                e.preventDefault();
                const k = e.key.toLowerCase();
                document.execCommand(k === "b" ? "bold" : k === "i" ? "italic" : "underline");
                return;
              }
              const html = editRef.current?.innerHTML ?? "";
              if (e.key === "Enter") {
                e.preventDefault();
                editing?.commitAndAdd(id, html, "sibling");
              } else if (e.key === "Tab") {
                e.preventDefault();
                editing?.commitAndAdd(id, html, "child");
              } else if (e.key === "Escape") {
                e.preventDefault();
                editing?.cancelEdit();
              }
            }}
            onBlur={() => editing?.commitEdit(id, editRef.current?.innerHTML ?? "")}
          />
        ) : richHtml ? (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: richHtml is sanitised in io/richText
          <span dangerouslySetInnerHTML={{ __html: richHtml }} />
        ) : (
          topic
        )}
        {hyperlink ? (
          <span title={hyperlink} style={{ marginLeft: 4 }}>
            🔗
          </span>
        ) : null}
        {note ? (
          <span title="Has a note" style={{ marginLeft: 4, opacity: 0.55 }}>
            📝
          </span>
        ) : null}
      </span>
      {tags?.length ? (
        <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
          {tags.map((t) => (
            <span key={t} style={chipStyle}>
              {t}
            </span>
          ))}
        </div>
      ) : null}
      {hasChildren ? (
        <button
          type="button"
          className="nodrag nopan"
          title={collapsed ? "Expand" : "Collapse"}
          onClick={(e) => {
            e.stopPropagation();
            editing?.toggleCollapse(id);
          }}
          style={{
            position: "absolute",
            right: -9,
            bottom: -9,
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: `1px solid ${branchColor}`,
            background: "var(--mm-node-bg, #fff)",
            color: branchColor,
            fontSize: 11,
            lineHeight: "16px",
            padding: 0,
            cursor: "pointer",
          }}
        >
          {collapsed ? "+" : "−"}
        </button>
      ) : null}
    </div>
  );
}
