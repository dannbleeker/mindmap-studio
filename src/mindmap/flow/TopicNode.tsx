import { Handle, type NodeProps, Position } from "@xyflow/react";
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Chip, DateChip } from "../../Chip";
import { ProgressPie } from "../../ProgressPie";
import { markerImage } from "../../icons";
import { sanitizeRich } from "../../io/richText";
import { priorityColor, priorityLabel } from "../../priority";
import type { ProgressInfo } from "../../progress";
import { toPercent } from "../../progress";
import { isOverdue, taskInfoLine, todayISO } from "../../taskDate";
import { MARKER_DND_TYPE } from "../contract";
import { useEditing } from "./editing";
import { matchBorderColor } from "./geometry";
import { isGeometric, shapeInset, shapeOverlayPath, shapePath } from "./shapes";
import { levelFontSize, readableTextOn, resolveLevelBox, resolveTopicFill } from "./style";
import type { TopicNode as TopicNodeT } from "./types";

// Custom topic node: a rounded box honouring the model's NodeStyle, with marker emoji, the
// topic text (inline-editable via contenteditable), an optional image, note/link affordances,
// tag chips, and a collapse toggle. Four hidden handles let branches connect on any side.

// The "double-click to edit" microcopy (#5) is shown on hover until the user edits a topic for the
// first time, then never again (best-effort persisted, like the theme + panel prefs). Module-level so
// every node shares the one flag without re-projecting node data.
let editHintSeen = (() => {
  try {
    return localStorage.getItem("mindmap-edit-hint") === "seen";
  } catch {
    return false;
  }
})();
function markEditHintSeen() {
  if (editHintSeen) return;
  editHintSeen = true;
  try {
    localStorage.setItem("mindmap-edit-hint", "seen");
  } catch {
    // best-effort — the hint just shows again next session
  }
}

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

// Text colours offered by the inline rich-text mini-toolbar (red / green / blue / amber / ink).
const RICH_COLORS = ["#e23b3b", "#1b8a5e", "#3f6fb0", "#b5852a", "#111827"];

/** The floating bold/italic/underline + colour bar shown above a topic while it's being edited
 *  (MindManager's inline format bar). Buttons preventDefault on mousedown so clicking them keeps the
 *  contentEditable's selection + focus (no blur/commit); execCommand mirrors the Ctrl+B/I/U path. */
function RichEditToolbar() {
  const stop = (e: ReactMouseEvent) => e.preventDefault();
  const fmt = (cmd: string, value?: string) => document.execCommand(cmd, false, value);
  const btn: CSSProperties = {
    width: 22,
    height: 22,
    border: "none",
    borderRadius: 5,
    background: "transparent",
    cursor: "pointer",
    font: "inherit",
    color: "#1f2933",
  };
  return (
    <div
      className="nodrag nopan"
      style={{
        position: "absolute",
        top: -34,
        left: 0,
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: 3,
        borderRadius: 7,
        background: "#fff",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        zIndex: 6,
      }}
    >
      <button
        type="button"
        title="Bold (Ctrl/⌘+B)"
        onMouseDown={stop}
        onClick={() => fmt("bold")}
        style={{ ...btn, fontWeight: 800 }}
      >
        B
      </button>
      <button
        type="button"
        title="Italic (Ctrl/⌘+I)"
        onMouseDown={stop}
        onClick={() => fmt("italic")}
        style={{ ...btn, fontStyle: "italic" }}
      >
        I
      </button>
      <button
        type="button"
        title="Underline (Ctrl/⌘+U)"
        onMouseDown={stop}
        onClick={() => fmt("underline")}
        style={{ ...btn, textDecoration: "underline" }}
      >
        U
      </button>
      <span style={{ width: 1, alignSelf: "stretch", background: "#e4e4e7", margin: "0 2px" }} />
      {RICH_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          title={`Text colour ${c}`}
          aria-label={`Text colour ${c}`}
          onMouseDown={stop}
          onClick={() => fmt("foreColor", c)}
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "1px solid rgba(0,0,0,0.15)",
            background: c,
            cursor: "pointer",
            padding: 0,
          }}
        />
      ))}
    </div>
  );
}

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
    depth,
    branchColor,
    collapsed,
    hasChildren,
    hiddenCount,
    progress,
    due,
    start,
    durationDays,
    resources,
    priority,
    attachmentCount,
    attachmentNames,
    dimmed,
    matched,
    dropTarget,
    locked,
  } = data;
  // Conditional-formatting style sits *under* the node's own style (manual styling wins).
  const style = condStyle ? { ...condStyle, ...ownStyle } : ownStyle;
  const editing = useEditing();
  const isEditing = editing?.editingId === id;
  // Type-to-edit: when edit was started by typing a character on the selected node, seed the editor
  // with that character (caret at the end) instead of the existing topic + select-all.
  const seed = isEditing ? (editing?.seed ?? null) : null;
  const editRef = useRef<HTMLDivElement>(null);
  // Hover state drives the lift/shadow (#5) and reveals the ＋ add affordances (#1).
  const [hovered, setHovered] = useState(false);
  // Hover-peek: show the note's text in a small card when the 📝 indicator is hovered (read it
  // without opening the inspector). Canvas-only.
  const [peekNote, setPeekNote] = useState(false);
  // True while a marker is being dragged over this node (drag-and-drop marker application) — drives a
  // drop-highlight ring.
  const [markerDragOver, setMarkerDragOver] = useState(false);
  // Re-sanitise on render too (defence-in-depth: a topicRich could arrive via an imported .json).
  const richHtml = useMemo(() => (topicRich ? sanitizeRich(topicRich) : null), [topicRich]);

  // On entering edit mode: seed the text, focus, and select all (uncontrolled — React must
  // not re-render over the user's keystrokes, so the text is set imperatively, once).
  useEffect(() => {
    if (!isEditing || !editRef.current) return;
    const el = editRef.current;
    // Type-to-edit seeds with the typed character (plain text); otherwise seed with the rich HTML so
    // existing formatting stays editable, else the plain topic.
    if (seed !== null) el.textContent = seed;
    else if (richHtml) el.innerHTML = richHtml;
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
        // Type-to-edit: caret at the end (keep the just-typed char). Normal edit: select all.
        if (seed !== null) range.collapse(false);
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
  }, [isEditing, topic, richHtml, seed]);

  // The first real edit retires the "double-click to edit" microcopy for good.
  useEffect(() => {
    if (isEditing) markEditHintSeen();
  }, [isEditing]);

  // Geometric shapes (diamond/ellipse/…) are painted by an SVG backdrop; the box itself goes
  // transparent and the text gets extra padding so it stays inside the narrowing outline.
  const shape = isRoot ? undefined : style?.shape;
  const geom = isGeometric(shape);
  const ins = geom ? shapeInset(shape) : null;
  // Branch-derived fill (tint/gradient); null when no fill mode is set → keep the flat-fill path.
  const topicFill = isRoot
    ? null
    : resolveTopicFill({ mode: style?.fill, background: style?.background, branchColor });
  const shapeFill = topicFill?.solid ?? style?.background ?? "var(--mm-node-bg, #faf9f5)";
  const shapeStroke = matchBorderColor(style?.border) ?? branchColor;
  const shapeStrokeW = style?.border ? Number.parseFloat(style.border) || 2 : 2;

  // Level-based topic styling (MindManager reads its hierarchy from shape alone): depth-1 mains are
  // FILLED with the branch colour; depth-2 keep the bordered white card; depth-3+ leaves drop the box
  // for a short branch-colour underline under the text. A manual NodeStyle key always wins — set a
  // background or border and the node reverts to a normal card.
  const { filledMain, underlineLeaf } = resolveLevelBox({ isRoot, geom, depth, style });

  const box: CSSProperties = isRoot
    ? {
        // The central topic dominates: larger bold type + a slightly bigger capsule, text centred.
        background: "var(--mm-root-bg, #1b8a5e)",
        color: "var(--mm-root-color, #ffffff)",
        borderRadius: 16,
        padding: "9px 20px",
        fontWeight: 700,
        fontSize: 20,
        textAlign: "center",
        border: "none",
      }
    : geom && ins
      ? {
          background: "transparent",
          color: style?.color ?? "var(--mm-color, #2c2c2a)",
          border: "none",
          padding: `${6 + ins.top}px ${12 + ins.right}px ${6 + ins.bottom}px ${12 + ins.left}px`,
          fontSize: style?.fontSize ?? levelFontSize(depth),
          fontWeight: style?.fontWeight,
          fontFamily: style?.fontFamily,
          textDecoration: style?.textDecoration,
          textAlign: "center",
        }
      : {
          background: style?.fillImage
            ? `center/cover no-repeat url("${style.fillImage}")`
            : (topicFill?.css ??
              style?.background ??
              (filledMain
                ? branchColor
                : underlineLeaf
                  ? "transparent"
                  : "var(--mm-node-bg, #ffffff)")),
          // An image fill needs a readable text colour + scrim regardless of the picture beneath it.
          color: style?.fillImage
            ? (style?.color ?? "#ffffff")
            : (style?.color ??
              topicFill?.text ??
              (filledMain ? readableTextOn(branchColor) : "var(--mm-color, #23211c)")),
          textShadow: style?.fillImage ? "0 1px 3px rgba(0,0,0,0.85)" : undefined,
          // Underline leaves carry only a bottom rule — set border-bottom alone (no `border`
          // shorthand) so React doesn't warn about mixing shorthand + longhand.
          border:
            style?.border ??
            (underlineLeaf ? undefined : filledMain ? "none" : `1.5px solid ${branchColor}`),
          borderBottom: !style?.border && underlineLeaf ? `2px solid ${branchColor}` : undefined,
          borderRadius: style?.borderRadius ?? (underlineLeaf ? 0 : "11px"),
          padding: underlineLeaf ? "3px 8px 4px" : "6px 12px",
          // Per-topic wrap width: a long label wraps to this width instead of stretching.
          maxWidth: style?.maxWidth,
          overflowWrap: style?.maxWidth ? "anywhere" : undefined,
          fontSize: style?.fontSize ?? levelFontSize(depth),
          fontWeight: style?.fontWeight ?? (filledMain ? 600 : undefined),
          fontFamily: style?.fontFamily,
          textDecoration: style?.textDecoration,
          textAlign: "center",
        };

  // Selection-ring colour: the node's branch colour, emerald for the root.
  const ringColor = isRoot ? "#1b8a5e" : branchColor;

  // Inline task-info line (MindManager schedule/assignment row): start ▸ duration ▸ resources. The
  // priority / progress / due chips render above; this surfaces the remaining task fields the canvas
  // used to drop. Mirrored in the exporter (canvas == export).
  const taskInfo = taskInfoLine({ start, durationDays, resources });

  return (
    <div
      style={{
        ...box,
        position: "relative",
        boxSizing: "border-box",
        maxWidth: 320,
        lineHeight: 1.35,
        // Selected: a branded ring (node's branch colour, emerald for the root) + soft glow — the
        // redesign's selection treatment, replacing React Flow's faint default. Hover gets a softer
        // lift so the node reads as interactive (#5). Canvas-only (exports never render selection or
        // hover), so it carries no canvas==export risk.
        boxShadow: dropTarget
          ? // Drag-to-reparent target: a bold emerald ring so the drop destination is unmistakable.
            "0 0 0 3px #1b8a5e, 0 0 0 8px rgba(27,138,94,0.25), 0 8px 22px rgba(40,30,16,0.18)"
          : selected
            ? `0 0 0 2px ${ringColor}, 0 0 0 6px ${ringColor}33, 0 8px 22px rgba(40,30,16,0.16)`
            : hovered
              ? isRoot
                ? "0 10px 26px rgba(27,138,94,0.40)"
                : underlineLeaf
                  ? "none"
                  : "0 6px 18px rgba(40,30,16,0.20)"
              : // At rest the cards are flat (no shadow) — matches the export, which has no shadow.
                // Hover + selection + drop still lift (interaction affordances, screen-only).
                "none",
        // Hover lift + a pointer cursor signal "you can click/edit me" (#5); selection keeps the ring.
        transform: hovered && !selected && !isEditing ? "translateY(-1px)" : undefined,
        cursor: isEditing ? "text" : "pointer",
        // Read-only Power Filter: fade nodes that aren't on a path to a match.
        opacity: dimmed ? 0.22 : 1,
        // Drag-a-marker drop target highlight, else a Find-result highlight ring.
        outline: markerDragOver ? "2px dashed #1b8a5e" : matched ? "2px solid #f5a623" : undefined,
        outlineOffset: 2,
        transition: "opacity 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        editing?.beginEdit(id);
      }}
      // Accept a marker dragged from the palette (#3): highlight on drag-over, toggle on drop.
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(MARKER_DND_TYPE)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          if (!markerDragOver) setMarkerDragOver(true);
        }
      }}
      onDragLeave={() => markerDragOver && setMarkerDragOver(false)}
      onDrop={(e) => {
        const marker = e.dataTransfer.getData(MARKER_DND_TYPE);
        if (!marker) return;
        e.preventDefault();
        e.stopPropagation();
        setMarkerDragOver(false);
        editing?.dropMarker(id, marker);
      }}
    >
      <Handle type="target" id="tl" position={Position.Left} style={HANDLE} />
      <Handle type="target" id="tr" position={Position.Right} style={HANDLE} />
      <Handle type="source" id="sl" position={Position.Left} style={HANDLE} />
      <Handle type="source" id="sr" position={Position.Right} style={HANDLE} />
      {/* Drag-to-relate grip — a visible dot on hover; pull it onto another topic to draw a
          cross-link. Not on the root/floating chrome differences; loose mode lets it drop anywhere. */}
      {!isRoot && (
        <Handle
          type="source"
          id="relate"
          position={Position.Right}
          className="mm-relate-handle nodrag"
          title="Drag onto another topic to link them"
          style={{
            width: 11,
            height: 11,
            right: -6,
            border: "2px solid #fff",
            background: branchColor,
            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        />
      )}
      {/* Quick task toggle — a hover checkbox on the left edge: cycle not-a-task → to-do → done.
          Hidden on the root and on aggregate (rolled-up) progress; the pie handles fine steps. */}
      {!isRoot && !progress?.derived && (
        <button
          type="button"
          className="mm-task-check nodrag nopan"
          aria-label="Toggle task"
          aria-pressed={(progress?.progress ?? 0) >= 1}
          title="Mark as task / done (cycle)"
          onClick={(e) => {
            e.stopPropagation();
            editing?.cycleTask(id);
          }}
        >
          {(progress?.progress ?? 0) >= 1 ? "☑" : "☐"}
        </button>
      )}
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
              // Honour the stored dimensions (clamped) so the image is the same size on screen and in
              // the export, which also reads image.width/height (canvas == export). Fall back to the
              // SAME 120px default the export uses when a dimension is missing, and `contain` to match
              // the export's preserveAspectRatio="meet" (no stretch) — so the two never diverge.
              width: Math.min(image.width ?? 120, 200),
              height: Math.min(image.height ?? 120, 140),
              maxWidth: 200,
              maxHeight: 140,
              objectFit: "contain",
              borderRadius: 4,
              marginBottom: 4,
            }}
          />
        ) : null}
        {icons?.length ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
              marginBottom: 2,
            }}
          >
            {icons.map((ic) => {
              const url = markerImage(ic);
              return url ? (
                <img
                  key={ic}
                  src={url}
                  alt=""
                  width={14}
                  height={14}
                  style={{ display: "block" }}
                />
              ) : (
                <span key={ic} style={{ fontSize: 13 }}>
                  {ic}
                </span>
              );
            })}
          </div>
        ) : null}
        <span style={{ whiteSpace: "pre-wrap" }}>
          {number ? (
            <span style={{ marginRight: 5, opacity: 0.55, fontVariantNumeric: "tabular-nums" }}>
              {number}
            </span>
          ) : null}
          {isEditing ? <RichEditToolbar /> : null}
          {isEditing ? (
            <span
              ref={editRef}
              contentEditable
              suppressContentEditableWarning
              spellCheck={editing?.spellcheck ?? false}
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
              onMouseEnter={() => setPeekNote(true)}
              onMouseLeave={() => setPeekNote(false)}
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
          {locked ? (
            <span
              title="Position locked — right-click to unlock"
              aria-label="Position locked"
              style={{ marginLeft: 4, opacity: 0.55, fontSize: "0.85em" }}
            >
              🔒
            </span>
          ) : null}
        </span>
        {peekNote && note?.trim() ? (
          // Hover-peek: read the note without opening the inspector. Clamped + scrollable for long notes.
          <output
            className="nodrag nopan"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 6,
              maxWidth: 280,
              maxHeight: 160,
              overflow: "auto",
              padding: "8px 10px",
              borderRadius: 8,
              background: "#fffef7",
              border: "1px solid #e7dca8",
              boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
              fontSize: 12,
              lineHeight: 1.45,
              color: "#3a3320",
              whiteSpace: "pre-wrap",
              zIndex: 7,
            }}
          >
            {note.trim().slice(0, 600)}
            {note.trim().length > 600 ? "…" : ""}
          </output>
        ) : null}
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
                title={`${priorityLabel(priority)} priority`}
                bg={priorityColor(priority)}
                color="#fff"
                fontWeight={600}
              >
                {priorityLabel(priority)}
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
              <Chip
                title={
                  attachmentNames?.length
                    ? `Attachments:\n${attachmentNames.join("\n")}`
                    : `${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`
                }
              >
                📎 {attachmentCount}
              </Chip>
            ) : null}
          </div>
        ) : null}
        {taskInfo ? (
          <div style={{ marginTop: 3, fontSize: 11, opacity: 0.65, whiteSpace: "pre-wrap" }}>
            {taskInfo}
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
          {collapsed ? (hiddenCount ?? "+") : "−"}
        </button>
      ) : null}
      {/* On-node ＋ add affordances (#1): child on the right edge, sibling below. Shown on hover or
          selection; ≥24px desktop / ≥44px touch (see .mm-node-add). nodrag nopan so dragging from
          them never moves the node. Canvas-only — not authored into exports. */}
      {(hovered || selected) && !isEditing ? (
        <>
          <button
            type="button"
            className="mm-node-add nodrag nopan"
            title="Add child"
            aria-label="Add child"
            onClick={(e) => {
              e.stopPropagation();
              editing?.addChild(id);
            }}
            style={
              {
                right: -13,
                top: "50%",
                transform: "translateY(-50%)",
                "--mm-add-color": ringColor,
              } as CSSProperties
            }
          >
            +
          </button>
          {!isRoot ? (
            <button
              type="button"
              className="mm-node-add nodrag nopan"
              title="Add sibling"
              aria-label="Add sibling"
              onClick={(e) => {
                e.stopPropagation();
                editing?.addSibling(id);
              }}
              style={
                {
                  left: "50%",
                  bottom: -13,
                  transform: "translateX(-50%)",
                  "--mm-add-color": ringColor,
                } as CSSProperties
              }
            >
              +
            </button>
          ) : null}
        </>
      ) : null}
      {hovered && !isEditing && !editHintSeen ? (
        <span className="mm-node-hint nodrag nopan">Double-click to edit</span>
      ) : null}
    </div>
  );
}

export const TopicNode = memo(TopicNodeImpl);
