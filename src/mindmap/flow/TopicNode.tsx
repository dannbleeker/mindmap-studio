import { Handle, type NodeProps, Position } from "@xyflow/react";
import { type CSSProperties, memo, useEffect, useMemo, useRef } from "react";
import { Chip, DateChip } from "../../Chip";
import { ProgressPie } from "../../ProgressPie";
import { sanitizeRich } from "../../io/richText";
import { PRIORITY_COLOR, PRIORITY_LABEL } from "../../priority";
import type { ProgressInfo } from "../../progress";
import { toPercent } from "../../progress";
import { isOverdue, todayISO } from "../../taskDate";
import { useEditing } from "./editing";
import { isGeometric, shapeInset, shapeOverlayPath, shapePath } from "./shapes";
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

/** A small task-completion pie on the node (MindManager-style); the exact figure lives in the
 *  tooltip + the Info panel, so the canvas stays uncluttered. When `onCycle` is given (a leaf task,
 *  not a rolled-up parent) the pie is a button that steps the completion on click. */
function ProgressBadge({ info, onCycle }: { info: ProgressInfo; onCycle?: () => void }) {
  const pct = toPercent(info.progress);
  const pie = (
    <ProgressPie
      fraction={info.progress}
      size={16}
      title={
        info.derived
          ? `${info.done} of ${info.total} sub-tasks complete (${pct}%)`
          : `Task ${pct}% — click to change`
      }
    />
  );
  if (!onCycle) return pie;
  return (
    <button
      type="button"
      className="nodrag nopan"
      onClick={(e) => {
        e.stopPropagation();
        onCycle();
      }}
      style={{
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "block",
        lineHeight: 0,
      }}
    >
      {pie}
    </button>
  );
}

// Memoised: React Flow re-renders every visible node whenever the node array changes (e.g. an
// unrelated node moves or selection shifts). The producer (project/sync in FlowMindMap) only mints
// a fresh `data` object when this node's content actually changes — selection, Power-Filter dimming,
// topic/style/progress edits — so the default shallow compare re-renders exactly when needed and
// skips the rest. Inline-edit + collapse arrive via the `useEditing()` context, which memo never
// blocks, so editing state still re-renders correctly.
function TopicNodeImpl({ id, data, selected }: NodeProps<TopicNodeT>) {
  const {
    topic,
    topicRich,
    number,
    icons,
    tags,
    style: ownStyle,
    condStyle,
    image,
    note,
    hyperlink,
    isRoot,
    branchColor,
    collapsed,
    hasChildren,
    progress,
    due,
    priority,
    attachmentCount,
    dimmed,
  } = data;
  // Conditional-formatting style sits *under* the node's own style (manual styling wins).
  const style = condStyle ? { ...condStyle, ...ownStyle } : ownStyle;
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
    // A freshly-CREATED node is briefly `visibility:hidden` while React Flow measures it, so the
    // first focus() is a no-op (focus can't land on a hidden element) — that left a new node in edit
    // mode but unfocused, so you couldn't type into it. Retry across a few frames until focus lands
    // (an existing node, e.g. via F2, is already visible so it succeeds on the first try).
    let raf = 0;
    let tries = 0;
    const place = () => {
      el.focus();
      if (document.activeElement === el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        return;
      }
      if (tries++ < 10 && typeof requestAnimationFrame === "function") {
        raf = requestAnimationFrame(place);
      }
    };
    place();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isEditing, topic, richHtml]);

  // Geometric shapes (diamond/ellipse/…) are painted by an SVG backdrop; the box itself goes
  // transparent and the text gets extra padding so it stays inside the narrowing outline.
  const shape = isRoot ? undefined : style?.shape;
  const geom = isGeometric(shape);
  const ins = geom ? shapeInset(shape) : null;
  const shapeFill = style?.background ?? "var(--mm-node-bg, #faf9f5)";
  const shapeStroke = style?.border?.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/i)?.[0] ?? branchColor;
  const shapeStrokeW = style?.border ? Number.parseFloat(style.border) || 2 : 2;

  const box: CSSProperties = isRoot
    ? {
        background: "var(--mm-root-bg, #1b8a5e)",
        color: "var(--mm-root-color, #ffffff)",
        borderRadius: 14,
        padding: "8px 18px",
        fontWeight: 700,
        border: "none",
      }
    : geom && ins
      ? {
          background: "transparent",
          color: style?.color ?? "var(--mm-color, #2c2c2a)",
          border: "none",
          padding: `${6 + ins.top}px ${12 + ins.right}px ${6 + ins.bottom}px ${12 + ins.left}px`,
          fontSize: style?.fontSize,
          fontWeight: style?.fontWeight,
          fontFamily: style?.fontFamily,
          textDecoration: style?.textDecoration,
        }
      : {
          background: style?.background ?? "var(--mm-node-bg, #ffffff)",
          color: style?.color ?? "var(--mm-color, #23211c)",
          border: style?.border ?? `1.5px solid ${branchColor}`,
          borderRadius: style?.borderRadius ?? "11px",
          padding: "6px 12px",
          fontSize: style?.fontSize,
          fontWeight: style?.fontWeight,
          fontFamily: style?.fontFamily,
          textDecoration: style?.textDecoration,
        };

  // Selection-ring colour: the node's branch colour, emerald for the root.
  const ringColor = isRoot ? "#1b8a5e" : branchColor;

  return (
    <div
      style={{
        ...box,
        position: "relative",
        boxSizing: "border-box",
        maxWidth: 320,
        lineHeight: 1.35,
        // Selected: a branded ring (node's branch colour, emerald for the root) + soft glow — the
        // redesign's selection treatment, replacing React Flow's faint default. Canvas-only (exports
        // never render selection), so it carries no canvas==export risk.
        boxShadow: selected
          ? `0 0 0 2px ${ringColor}, 0 0 0 6px ${ringColor}33, 0 8px 22px rgba(40,30,16,0.16)`
          : geom
            ? "none"
            : isRoot
              ? "0 6px 18px rgba(27,138,94,0.30)"
              : "0 2px 8px rgba(40,30,16,0.10)",
        // Read-only Power Filter: fade nodes that aren't on a path to a match.
        opacity: dimmed ? 0.22 : 1,
        transition: "opacity 0.15s ease",
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
      {geom && shape ? (
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, overflow: "visible", zIndex: 0 }}
        >
          <path
            d={shapePath(shape, 0, 0, 100, 100)}
            fill={shapeFill}
            stroke={shapeStroke}
            strokeWidth={shapeStrokeW}
            vectorEffect="non-scaling-stroke"
          />
          {shapeOverlayPath(shape, 0, 0, 100, 100) ? (
            <path
              d={shapeOverlayPath(shape, 0, 0, 100, 100) ?? ""}
              fill="none"
              stroke={shapeStroke}
              strokeWidth={shapeStrokeW}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
      ) : null}
      <div style={{ position: "relative", zIndex: 1 }}>
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
          {number ? (
            <span style={{ marginRight: 5, opacity: 0.55, fontVariantNumeric: "tabular-nums" }}>
              {number}
            </span>
          ) : null}
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
            <button
              type="button"
              className="nodrag nopan"
              title={`Follow link: ${hyperlink}`}
              onClick={(e) => {
                e.stopPropagation();
                editing?.openLink(hyperlink);
              }}
              style={{
                marginLeft: 4,
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                font: "inherit",
              }}
            >
              🔗
            </button>
          ) : null}
          {note?.trim() ? (
            <button
              type="button"
              className="nodrag nopan"
              title="Show note"
              aria-label="Show note"
              onClick={(e) => {
                e.stopPropagation();
                editing?.openNote(id);
              }}
              style={{
                marginLeft: 4,
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                font: "inherit",
                opacity: 0.55,
              }}
            >
              📝
            </button>
          ) : null}
        </span>
        {progress || due || attachmentCount || priority ? (
          <div
            style={{
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            {priority ? (
              <Chip
                title={`${PRIORITY_LABEL[priority] ?? ""} priority`}
                bg={PRIORITY_COLOR[priority] ?? "#888"}
                color="#fff"
                fontWeight={600}
              >
                {PRIORITY_LABEL[priority] ?? "?"}
              </Chip>
            ) : null}
            {progress ? (
              <ProgressBadge
                info={progress}
                onCycle={progress.derived ? undefined : () => editing?.cycleProgress(id)}
              />
            ) : null}
            {due ? (
              <DateChip due={due} overdue={isOverdue(due, progress?.progress ?? 0, todayISO())} />
            ) : null}
            {attachmentCount ? (
              <Chip title={`${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`}>
                📎 {attachmentCount}
              </Chip>
            ) : null}
          </div>
        ) : null}
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
            zIndex: 1,
          }}
        >
          {collapsed ? "+" : "−"}
        </button>
      ) : null}
    </div>
  );
}

export const TopicNode = memo(TopicNodeImpl);
