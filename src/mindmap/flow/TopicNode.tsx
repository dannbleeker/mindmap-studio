import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { CSSProperties } from "react";
import type { TopicNode as TopicNodeT } from "./types";

// Custom topic node: a rounded box honouring the model's NodeStyle, with marker emoji, the
// topic text, an optional image, note/link affordances, and tag chips. Four hidden handles
// (left/right × source/target) so branches connect cleanly on either side. Phase D adds
// inline editing + the collapse toggle.

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

export function TopicNode({ data }: NodeProps<TopicNodeT>) {
  const { topic, icons, tags, style, image, note, hyperlink, isRoot, branchColor } = data;

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
        boxSizing: "border-box",
        maxWidth: 320,
        lineHeight: 1.35,
        boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
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
        {topic}
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
    </div>
  );
}
