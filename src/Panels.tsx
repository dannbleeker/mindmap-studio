import {
  type CSSProperties,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ProgressPie } from "./ProgressPie";
import { type AgendaItem, agendaBuckets, agendaIsEmpty } from "./agenda";
import { InspectorResizer } from "./components/InspectorResizer";
import { editorPrompt } from "./components/editorDialogs";
import {
  Button,
  Chip,
  Input,
  Panel,
  PanelSection,
  Select,
  type TabItem,
  Tabs,
  tabId,
  tabPanelId,
} from "./design/primitives";
import { colors, fontSize, fontWeight, radius, space } from "./design/tokens";
import {
  type CompletionMode,
  type DueMode,
  type FilterCriteria,
  type RelDir,
  type SavedFilter,
  describeCriteria,
} from "./filter";
import { markerImage, searchMarkers } from "./icons";
import { formatBytes } from "./io/attachment";
import { suggestNewMarkers } from "./markerSuggest";
import {
  MARKER_DND_TYPE,
  type MarkerTagSummary,
  type SelectedNode,
  type SelectionFields,
  buildMapLink,
} from "./mindmap";
import { shapeOverlayPath, shapePath } from "./mindmap/flow/shapes";
import type {
  ConditionalRule,
  MapNode,
  MindMapDoc,
  NodeShape,
  NodeStyle,
  NumberStyle,
  RuleCondition,
  RuleConditionKind,
  SlideRef,
} from "./model/types";
import { htmlToNote, renderNote } from "./noteFormat";
import {
  type Backlink,
  type CrossMapBacklink,
  type IndexEntry,
  type IndexHit,
  type MapLink,
  type OutgoingLink,
  mapLinks,
  markerTagIndex,
  outlineDropWhere,
  outlineNumbers,
  outlineRows,
} from "./outline";
import { addSlide, removeSlide, reorderSlides, setSlideNote } from "./present/deckEdit";
import { OVERVIEW_SLIDE_ID } from "./present/slides";
import { PRIORITY_COLOR, PRIORITY_LABEL, PRIORITY_LEVELS, priorityLabel } from "./priority";
import { hasTaskDescendants, nodeProgress, toPercent } from "./progress";
import { describeRule, describeRuleActions } from "./rules";
import { mapStats } from "./stats";
import { type Sticker, searchStickers, stickerCategories, stickerDataUrl } from "./stickers";
import { MAX_VERSIONS, type VersionMeta } from "./store/mapStore";
import { formatDateShort, parseNaturalDate, todayISO } from "./taskDate";
import { controlStyle, inputStyle, timeAgo } from "./ui";
import {
  WRAP_MAX,
  WRAP_MIN,
  WRAP_PRESETS,
  snapWrapWidth,
  styleToWrapWidth,
  wrapWidthLabel,
  wrapWidthToStyle,
} from "./wrapWidth";

// The per-topic fill/border swatch palettes live in the design tokens now (shared with the rest of
// the chrome). Aliased here so the StyleBar + StylesPanel call-sites read unchanged.
const FILL_SWATCHES = colors.fillSwatches;
const BORDER_SWATCHES = colors.borderSwatches;

// Small icon-button look for the StyleBar shape/font controls (a compact white control). One-off to
// this bar, but its values come from the tokens so it stays in step with the rest of the chrome.
const styleBtn = {
  border: "1px solid var(--ed-border)",
  background: "var(--ed-card)",
  borderRadius: radius.md,
  cursor: "pointer",
  fontSize: fontSize.lg,
  lineHeight: 1,
  padding: `${space.xxs}px ${space.md}px`,
  color: "var(--ed-ink)",
} as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// A Start/Due date field that also accepts natural language (A5): type "today", "+7d", "next fri",
// etc. and it resolves to an ISO date on blur / Enter (see parseNaturalDate). Unparseable text is left
// unchanged with a brief red hint. The native calendar picker stays available via the 📅 button
// (showPicker on a visually-hidden <input type="date">). Callers key it by node id + mixed flag so the
// text resets when the selection or bulk mixed-ness changes. Exported for unit testing.
export function NaturalDateInput({
  value,
  mixed = false,
  onSet,
  ariaLabel,
}: {
  /** The current ISO value ("YYYY-MM-DD"), or "" when unset. */
  value: string;
  /** Bulk mode where the selected topics disagree — show empty, don't pre-fill the anchor's date. */
  mixed?: boolean;
  /** Commit a resolved ISO date (or "" to clear). */
  onSet: (iso: string) => void;
  ariaLabel: string;
}) {
  const [text, setText] = useState(mixed ? "" : value);
  const [err, setErr] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const iso = parseNaturalDate(text, todayISO());
    if (iso === null) {
      setErr(true);
      setText(mixed ? "" : value); // couldn't read it — leave the date unchanged
      return;
    }
    setErr(false);
    setText(iso);
    onSet(iso);
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, position: "relative" }}>
      <input
        type="text"
        className="mm-prim-input"
        value={text}
        placeholder="e.g. next fri, +7d"
        onChange={(e) => {
          setText(e.target.value);
          if (err) setErr(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        aria-label={ariaLabel}
        aria-invalid={err || undefined}
        title={err ? "Couldn't read that date — try “today”, “+7d”, or “next fri”." : undefined}
        style={{
          ...inputStyle,
          width: 104,
          padding: "2px 4px",
          // Override the whole `border` shorthand (not just borderColor) so we never mix shorthand +
          // longhand for the same property across rerenders (React warns on that).
          ...(err ? { border: "1px solid var(--ed-danger)" } : {}),
        }}
      />
      <button
        type="button"
        aria-label={`${ariaLabel}: pick from calendar`}
        title="Pick from calendar"
        onClick={() => {
          try {
            dateRef.current?.showPicker?.();
          } catch {
            // showPicker throws if unsupported / not user-activated — the text field still works.
          }
        }}
        style={{ ...styleBtn, fontSize: fontSize.sm, padding: "2px 4px", lineHeight: 1 }}
      >
        📅
      </button>
      {/* Visually hidden but rendered (showPicker needs a laid-out element); commits ISO directly. */}
      <input
        ref={dateRef}
        type="date"
        value={ISO_DATE.test(text) ? text : ""}
        onChange={(e) => {
          setText(e.target.value);
          setErr(false);
          onSet(e.target.value);
        }}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "absolute", left: 0, bottom: 0, width: 1, height: 1, opacity: 0 }}
      />
    </span>
  );
}

// A clickable list row inside the rail panels (outline rows, index jump targets, saved-filter +
// named-style rows): a full-width, left-aligned, single-line-ellipsised transparent button. Callers
// add their own padding (depth indent / variant). One object so the rows stay visually identical.
const listRow: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: fontSize.md,
  color: colors.text,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

// The horizontal control strip at the top of the Info panel (the StyleBar + MarkerBar): a wrapping
// flex row on a faint lilac surface with a divider below. Shared so both bars sit identically.
const barRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: space.xs,
  flexWrap: "wrap",
  padding: `${space.md}px ${space.xxxl}px`,
  background: "var(--ed-page)",
  borderBottom: "1px solid var(--ed-divider)",
};

// The bold ink title at the top of a rail panel (Markers & tags / Power Filter / Styles). The
// History + Info panels use a flex variant of this (title + a Close button) inline.
const panelTitle: CSSProperties = {
  padding: `${space.lg}px ${space.xl}px ${space.sm}px`,
  fontSize: fontSize.md,
  fontWeight: fontWeight.semibold,
  color: colors.text,
};

// A compact label-left / control-right row for single-value Info-panel fields (denser than a
// full-width section header + a stacked control block). Controls wrap under the label if tight.
function PropRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: space.lg,
        flexWrap: "wrap",
        padding: `${space.xs}px ${space.xl}px`,
      }}
    >
      <span
        style={{
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          color: "var(--ed-faint)",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}

// A Details-tab section whose body collapses behind a small-caps disclosure header (P3). Starts
// collapsed when it holds nothing yet (count === 0) so empty Attachments / Links / Linked-from don't
// pad the panel; expands to reveal — or add — content. Mirrors the PanelSection look as a button.
// Callers key it by node id so the open/closed state resets per selected topic.
export function CollapsibleSection({
  label,
  count = 0,
  defaultOpen,
  children,
}: {
  label: string;
  count?: number;
  /** Force the initial open state; defaults to "open when it holds something" (count > 0). */
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? count > 0);
  return (
    <>
      <button
        type="button"
        className="mm-prim-section"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: space.xs,
          width: "100%",
          padding: `${space.lg}px ${space.xl}px ${space.xxs}px`,
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          color: "var(--ed-faint)",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: "0.85em", opacity: 0.7 }}>
          {open ? "▾" : "▸"}
        </span>
        {label}
        {count > 0 ? <span style={{ opacity: 0.6 }}>({count})</span> : null}
      </button>
      {open ? children : null}
    </>
  );
}

// Per-topic styling bar: shape, fill, border, bold — applied to the selected node.
// Native <input type="color"> only round-trips 6-digit hex; seed it from the live value when that's a
// hex string, else fall back to a sensible default so the picker opens somewhere reasonable.
const hexOr = (v: string | undefined, fallback: string) =>
  v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;

export function StyleBar({
  onStyle,
  onBranchColor,
  namedStyles = [],
  wrapWidth,
  textColor,
  fillColor,
  branchColor,
  style,
}: {
  onStyle: (patch: Partial<NodeStyle>) => void;
  /** Set the per-node branch/connector colour (separate from NodeStyle); enables the Branch picker. */
  onBranchColor?: (color: string) => void;
  /** Saved presets surfaced as a quick-apply swatch gallery (#15); empty = no Presets row. */
  namedStyles?: NamedStyle[];
  /** The selected node's current `style.maxWidth` — seeds the Wrap slider so it reflects the selection. */
  wrapWidth?: string;
  /** Current text / fill / branch colours — seed the native colour pickers so they open on the live value. */
  textColor?: string;
  fillColor?: string;
  branchColor?: string;
  /** The selected node's full style (single-select only) — the bar highlights the controls that match it,
   *  so it reflects current values (MindManager's context toolbar) instead of being write-only. Undefined
   *  in bulk mode (a mixed selection has no single "active" state to show). */
  style?: NodeStyle;
}) {
  // The Wrap slider is the one StyleBar control that reflects current state (the rest are write-only); seed
  // it from the selection and re-seed when the selected node changes.
  const [wrapPx, setWrapPx] = useState(() => styleToWrapWidth(wrapWidth));
  useEffect(() => setWrapPx(styleToWrapWidth(wrapWidth)), [wrapWidth]);
  // Coarse pointers (touch) get larger tap targets than the 18px desktop icons.
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const swSize = coarse ? 26 : 18;
  const touchPad: CSSProperties | null = coarse
    ? { padding: `${space.xs}px ${space.lg}px`, fontSize: fontSize.xl }
    : null;
  // Active-control look (mirrors the design system's ACTIVE_CONTROL): the ink fills the button, the label
  // inverts. Themes drive both vars, so it inverts cleanly in light + dark mode.
  const ACTIVE: CSSProperties = {
    background: "var(--ed-ink)",
    color: "var(--ed-page)",
    borderColor: "var(--ed-ink)",
  };
  const btn = (active: boolean): CSSProperties => ({
    ...styleBtn,
    ...touchPad,
    ...(active ? ACTIVE : null),
  });
  // Reflect current values only for a single selection; a bulk/mixed selection shows no active state.
  const reflect = !!style;
  const swatch = (color: string, onClick: () => void, title: string, active = false) => (
    <button
      key={title}
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      style={{
        width: swSize,
        height: swSize,
        borderRadius: radius.xs,
        border: `1px solid ${colors.controlBorder}`,
        background: color,
        cursor: "pointer",
        padding: 0,
        ...(active ? { outline: "2px solid var(--ed-ink)", outlineOffset: 1 } : null),
      }}
    />
  );
  const divider = (
    <span
      aria-hidden="true"
      style={{ width: 1, alignSelf: "stretch", background: "var(--ed-divider)", margin: "0 4px" }}
    />
  );
  const label = (text: string) => (
    <span style={{ fontSize: fontSize.sm, color: "var(--ed-muted)", margin: "0 2px 0 6px" }}>
      {text}
    </span>
  );
  // A free colour picker (native swatch) — the arbitrary-colour complement to the FILL/BORDER preset rows.
  const colorCtl = (
    value: string | undefined,
    fallback: string,
    onPick: (c: string) => void,
    title: string,
    aria: string,
  ) => (
    <input
      type="color"
      value={hexOr(value, fallback)}
      onChange={(e) => onPick(e.target.value)}
      title={title}
      aria-label={aria}
      style={{
        width: 22,
        height: 18,
        padding: 0,
        border: `1px solid ${colors.controlBorder}`,
        borderRadius: radius.xs,
        background: "none",
        cursor: "pointer",
      }}
    />
  );
  // A mini preview of each geometric shape, drawn from the very same path builder the canvas and
  // exporter use — so the picker icon always matches what lands on the node.
  const shapeIcon = (shape: NodeShape) => {
    const overlay = shapeOverlayPath(shape, 5, 5, 90, 60);
    return (
      <svg
        width={18}
        height={13}
        viewBox="0 0 100 70"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={shapePath(shape, 5, 5, 90, 60)}
          fill="none"
          stroke="currentColor"
          strokeWidth={7}
        />
        {overlay ? <path d={overlay} fill="none" stroke="currentColor" strokeWidth={7} /> : null}
      </svg>
    );
  };
  const geomShapes: { shape: NodeShape; title: string }[] = [
    { shape: "diamond", title: "Diamond (decision)" },
    { shape: "ellipse", title: "Oval (start / end)" },
    { shape: "parallelogram", title: "Parallelogram (input / output)" },
    { shape: "hexagon", title: "Hexagon (preparation)" },
    { shape: "cylinder", title: "Cylinder (data store)" },
    { shape: "trapezoid", title: "Trapezoid (manual operation)" },
    { shape: "octagon", title: "Octagon (stop / limit)" },
    { shape: "document", title: "Document (report / output)" },
    { shape: "callout", title: "Callout (speech / annotation)" },
    { shape: "star", title: "Star (highlight)" },
    { shape: "cloud", title: "Cloud (idea / external system)" },
  ];
  // Which controls match the current single selection (so the bar reflects state, not just writes it).
  const s = style;
  const isBox = reflect && !s?.shape && s?.borderRadius === "4px";
  const isRounded = reflect && !s?.shape && s?.borderRadius === "14px";
  const isPill = reflect && !s?.shape && s?.borderRadius === "999px";
  const noFill = reflect && !s?.background && !s?.fill;
  const isTint = reflect && s?.fill === "tint";
  const isGradient = reflect && s?.fill === "gradient";
  const noBorder = reflect && !s?.border;
  const isBold = reflect && s?.fontWeight === "bold";
  const isRaised = reflect && s?.shadow === true;
  const isFlat = reflect && !s?.shadow;
  const fillEq = (c: string) => reflect && (s?.background ?? "").toLowerCase() === c.toLowerCase();
  const borderEq = (c: string) => reflect && s?.border === `2px solid ${c}`;
  return (
    <div style={barRow}>
      {label("Shape")}
      <button
        type="button"
        style={btn(isBox)}
        aria-pressed={isBox}
        title="Box"
        onClick={() => onStyle({ borderRadius: "4px", shape: undefined })}
      >
        ▭
      </button>
      <button
        type="button"
        style={btn(isRounded)}
        aria-pressed={isRounded}
        title="Rounded"
        onClick={() => onStyle({ borderRadius: "14px", shape: undefined })}
      >
        ▢
      </button>
      <button
        type="button"
        style={btn(isPill)}
        aria-pressed={isPill}
        title="Pill"
        onClick={() => onStyle({ borderRadius: "999px", shape: undefined })}
      >
        ⬭
      </button>
      {geomShapes.map(({ shape, title }) => (
        <button
          key={shape}
          type="button"
          style={{ ...btn(reflect && s?.shape === shape), padding: coarse ? "5px 7px" : "3px 5px" }}
          aria-pressed={reflect && s?.shape === shape}
          title={title}
          onClick={() => onStyle({ shape })}
        >
          {shapeIcon(shape)}
        </button>
      ))}
      {divider}
      {label("Fill")}
      {FILL_SWATCHES.map((c) =>
        swatch(c, () => onStyle({ background: c }), `Fill ${c}`, fillEq(c)),
      )}
      <button
        type="button"
        style={btn(noFill)}
        aria-pressed={noFill}
        title="No fill"
        onClick={() => onStyle({ background: "", fill: undefined })}
      >
        ✕
      </button>
      <button
        type="button"
        style={btn(isTint)}
        aria-pressed={isTint}
        title="Branch-colour tint"
        onClick={() => onStyle({ fill: "tint" })}
      >
        ◧
      </button>
      <button
        type="button"
        style={btn(isGradient)}
        aria-pressed={isGradient}
        title="Gradient fill"
        onClick={() => onStyle({ fill: "gradient" })}
      >
        ◨
      </button>
      {divider}
      {label("Border")}
      {BORDER_SWATCHES.map((c) =>
        swatch(c, () => onStyle({ border: `2px solid ${c}` }), `Border ${c}`, borderEq(c)),
      )}
      <button
        type="button"
        style={btn(noBorder)}
        aria-pressed={noBorder}
        title="No border"
        onClick={() => onStyle({ border: "" })}
      >
        ✕
      </button>
      {divider}
      {label("Colour")}
      {colorCtl(textColor, "#2b2a26", (c) => onStyle({ color: c }), "Text colour", "Text colour")}
      {colorCtl(
        fillColor,
        "#ffffff",
        (c) => onStyle({ background: c }),
        "Fill colour",
        "Fill colour",
      )}
      {onBranchColor
        ? colorCtl(
            branchColor,
            "#4f46e5",
            onBranchColor,
            "Branch (connector) colour",
            "Branch colour",
          )
        : null}
      <button
        type="button"
        style={btn(isBold)}
        aria-pressed={isBold}
        title="Bold"
        onClick={() => onStyle({ fontWeight: isBold ? "" : "bold" })}
      >
        <b>B</b>
      </button>
      <button
        type="button"
        style={btn(isRaised)}
        aria-pressed={isRaised}
        title="Raised (drop shadow)"
        onClick={() => onStyle({ shadow: true })}
      >
        ◰
      </button>
      <button
        type="button"
        style={btn(isFlat)}
        aria-pressed={isFlat}
        title="Flat (no shadow)"
        onClick={() => onStyle({ shadow: undefined })}
      >
        ◳
      </button>
      {divider}
      {label("Font")}
      <select
        value={s?.fontFamily ?? ""}
        onChange={(e) => {
          if (e.target.value) onStyle({ fontFamily: e.target.value });
        }}
        title="Topic font family"
        style={{ ...btn(false), padding: coarse ? "4px 6px" : "2px 4px", fontSize: 12 }}
      >
        <option value="">Font…</option>
        <option value="sans-serif">Sans</option>
        <option value="serif">Serif</option>
        <option value="monospace">Mono</option>
      </select>
      {divider}
      {label("Wrap")}
      {/* Continuous wrap width (10b layer 1): drag for any width, snapping to the Narrow/Medium/Wide ticks;
          the far end = None (no cap). Reflects + re-wraps the selection live via onStyle({ maxWidth }). */}
      <input
        type="range"
        min={WRAP_MIN}
        max={WRAP_MAX}
        step={4}
        value={wrapPx}
        list="mm-wrap-ticks"
        aria-label="Topic wrap width"
        title="Drag to set the topic wrap width (snaps to Narrow / Medium / Wide; far end = None)"
        onChange={(e) => {
          const px = snapWrapWidth(Number(e.target.value));
          setWrapPx(px);
          onStyle({ maxWidth: wrapWidthToStyle(px) });
        }}
        style={{ width: 92, verticalAlign: "middle", cursor: "ew-resize" }}
      />
      <datalist id="mm-wrap-ticks">
        {WRAP_PRESETS.map((p) => (
          <option key={p.px} value={p.px} />
        ))}
      </datalist>
      <span
        aria-hidden="true"
        style={{
          fontSize: fontSize.sm,
          color: "var(--ed-muted)",
          minWidth: 46,
          display: "inline-block",
        }}
      >
        {wrapWidthLabel(wrapPx)}
      </span>
      {namedStyles.length > 0 ? (
        <>
          {label("Presets")}
          {namedStyles.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStyle(s.style)}
              title={`Apply "${s.name}"`}
              aria-label={`Apply preset ${s.name}`}
              style={{
                width: 18,
                height: 18,
                borderRadius: radius.xs,
                border: s.style.border ?? `1px solid ${colors.controlBorder}`,
                background: s.style.background ?? colors.white,
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </>
      ) : null}
      <button
        type="button"
        style={{ ...styleBtn, fontSize: 12 }}
        title="Reset style"
        onClick={() =>
          onStyle({
            background: "",
            border: "",
            borderRadius: "",
            shape: undefined,
            fill: undefined,
            color: "",
            fontWeight: "",
            fontFamily: "",
            textDecoration: "",
            fillImage: "",
            maxWidth: "",
            shadow: undefined,
          })
        }
      >
        Reset
      </button>
    </div>
  );
}

// Presentational panels for the canvas chrome. State lives in App; these just
// render it and call back. Kept out of App so the component reads as orchestration.

export function OutlinePanel({
  root,
  filter,
  numbered,
  numberStyle,
  onFilterChange,
  onPick,
  onRename,
  onIndent,
  onMove,
  onAddChild,
  onAddSibling,
  selectedId,
}: {
  root: MapNode;
  filter: string;
  numbered?: boolean;
  /** Outline-numbering scheme (decimal / outline); matches the canvas. */
  numberStyle?: NumberStyle;
  onFilterChange: (value: string) => void;
  onPick: (id: string) => void;
  /** Commit an inline rename of a topic (double-click a row to edit). */
  onRename?: (id: string, topic: string) => void;
  /** Promote (out) / demote (in) a topic — the ◂ ▸ controls. */
  onIndent?: (id: string, dir: "in" | "out") => void;
  /** Drag-reorder: drop `dragId` before/after `targetId`, or nest it as a child. */
  onMove?: (dragId: string, targetId: string, where: "before" | "child" | "after") => void;
  /** Rapid keyboard entry: add a child / sibling and return the new node's id (so the inline editor
   *  hops to it). Tab = child, Enter = sibling while editing a row. */
  onAddChild?: (id: string) => string | null;
  onAddSibling?: (id: string) => string | null;
  /** The currently selected canvas node — drives aria-selected + roving focus so the outline tree
   *  stays in sync with the canvas. */
  selectedId?: string | null;
}) {
  const editable = !!(onRename && onIndent && onMove);
  const q = filter.trim().toLowerCase();
  const rows = outlineRows(root).filter((row) => !q || row.topic.toLowerCase().includes(q));
  const numbers = numbered ? outlineNumbers(root, numberStyle) : undefined;
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // The current drag's target + intent, for the drop indicator (cleared on drop / leave).
  const [drop, setDrop] = useState<{ id: string; where: "before" | "child" | "after" } | null>(
    null,
  );
  const dragId = useRef<string | null>(null);

  // Touch drag-reorder (A6): HTML5 drag events don't fire on touch, so on a coarse pointer we run our
  // own long-press → drag. Press and hold a row (~350ms without moving) to pick it up, then slide over
  // other rows to reorder (the same before/child/after zones as the mouse path), and lift to drop.
  // Mouse keeps the native HTML5 `draggable` path above (onPointerDown bails on pointerType "mouse").
  const touchDrag = useRef<{
    id: string;
    pointerId: number;
    dragging: boolean;
    drop: { id: string; where: "before" | "child" | "after" } | null;
  } | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelTouchDrag = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
    touchDrag.current = null;
    setDrop(null);
  };
  const onRowPointerDown = (e: ReactPointerEvent<HTMLDivElement>, id: string, canDrag: boolean) => {
    if (e.pointerType === "mouse" || !canDrag) return; // mouse uses the HTML5 drag path
    const el = e.currentTarget;
    const pointerId = e.pointerId;
    touchDrag.current = { id, pointerId, dragging: false, drop: null };
    pressTimer.current = setTimeout(() => {
      const td = touchDrag.current;
      if (!td) return;
      td.dragging = true; // long-press held still → we own the gesture now
      try {
        el.setPointerCapture(pointerId);
      } catch {
        // capture can fail if the pointer already went up; the up handler still cleans up
      }
    }, 350);
  };
  const onRowPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const td = touchDrag.current;
    if (!td) return;
    if (!td.dragging) {
      // Moved before the long-press fired → it's a scroll, not a drag: let the list scroll.
      cancelTouchDrag();
      return;
    }
    e.preventDefault(); // captured pointer — suppress the scroll while dragging
    const row = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest(
      "[data-outline-id]",
    );
    const targetId = row?.getAttribute("data-outline-id");
    if (!row || !targetId || targetId === td.id) {
      td.drop = null;
      setDrop(null);
      return;
    }
    const r = row.getBoundingClientRect();
    const next = { id: targetId, where: outlineDropWhere((e.clientY - r.top) / r.height) };
    td.drop = next;
    setDrop(next);
  };
  const onRowPointerUp = () => {
    const td = touchDrag.current;
    if (td?.dragging && td.drop && td.drop.id !== td.id && onMove) {
      onMove(td.id, td.drop.id, td.drop.where);
    }
    cancelTouchDrag();
  };

  const startEdit = (id: string, topic: string) => {
    setEditId(id);
    setDraft(topic);
  };
  const commitEdit = () => {
    if (editId && onRename) onRename(editId, draft.trim());
    setEditId(null);
  };
  // Rapid keyboard entry while editing a row: commit the rename, then add a sibling/child (Enter/Tab)
  // and hop the inline editor to the new node — or outdent the current one (Shift+Tab). Keeps your
  // hands on the keyboard, mirroring the canvas's Enter/Tab/Shift+Tab.
  const commitThen = (action: "sibling" | "child" | "outdent") => {
    const id = editId;
    if (!id) return;
    if (onRename) onRename(id, draft.trim());
    if (action === "outdent") {
      onIndent?.(id, "out"); // the node keeps its id — stay in its editor
      return;
    }
    const newId = action === "child" ? onAddChild?.(id) : onAddSibling?.(id);
    if (newId) startEdit(newId, "");
    else setEditId(null);
  };
  const rapid = !!(onAddChild && onAddSibling);

  // ── Accessible tree (role="tree") keyboard navigation ─────────────────────────────────────────
  // `rows` is a flat depth-first list; a row has children when the next row is deeper, and its parent
  // is the nearest earlier shallower row. The outline shows the whole tree (no per-row collapse), so
  // every parent is aria-expanded. Roving tabindex: exactly one treeitem is tabbable (the active row);
  // arrows move focus, Enter/Space focuses the canvas node. activeId follows the canvas selection so
  // the two views stay in sync. (UI-5)
  const rowIds = rows.map((r) => r.id);
  const hasChildren = (i: number) => i + 1 < rows.length && rows[i + 1].depth > rows[i].depth;
  const parentIndex = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if (rows[j].depth < rows[i].depth) return j;
    return -1;
  };
  // The previous / next row at the SAME depth under the SAME parent (a true sibling) — for keyboard
  // reorder. Stops at the parent boundary (a shallower row) so a move never jumps out of the branch.
  const prevSibling = (i: number) => {
    const d = rows[i].depth;
    for (let j = i - 1; j >= 0; j--) {
      if (rows[j].depth < d) return -1;
      if (rows[j].depth === d) return j;
    }
    return -1;
  };
  const nextSibling = (i: number) => {
    const d = rows[i].depth;
    for (let j = i + 1; j < rows.length; j++) {
      if (rows[j].depth < d) return -1;
      if (rows[j].depth === d) return j;
    }
    return -1;
  };
  const [activeId, setActiveId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement | null>());
  // Follow the canvas selection: when it changes, move the roving focus to that row AND scroll it into
  // view (reveal-in-outline), so selecting a node on the canvas surfaces its row in a long outline.
  // biome-ignore lint/correctness/useExhaustiveDependencies: track selectedId only, not the per-render rowIds array.
  useEffect(() => {
    if (selectedId && rowIds.includes(selectedId)) {
      setActiveId(selectedId);
      rowRefs.current.get(selectedId)?.scrollIntoView?.({ block: "nearest" });
    }
  }, [selectedId]);
  const activeRow = activeId && rowIds.includes(activeId) ? activeId : (rowIds[0] ?? null);
  const focusRow = (id: string | null) => {
    if (!id) return;
    setActiveId(id);
    requestAnimationFrame(() => rowRefs.current.get(id)?.focus());
  };
  const onTreeKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (editId) return; // the inline rename input owns the keyboard
    const i = rows.findIndex((r) => r.id === activeRow);
    if (i < 0) return;
    // Shift+Arrows reorder / re-indent the active row (the keyboard equivalent of the ◂ ▸ drag-only
    // controls), keeping focus on the moved row. Only when the outline is editable (onMove/onIndent set)
    // AND not filtering — the flat filtered view hides structure, so sibling math would reparent across
    // branches (mirrors the drag path's `!q` guard).
    if (e.shiftKey && editable && activeRow && !q) {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const j = e.key === "ArrowUp" ? prevSibling(i) : nextSibling(i);
        if (j >= 0) {
          e.preventDefault();
          onMove?.(activeRow, rows[j].id, e.key === "ArrowUp" ? "before" : "after");
          focusRow(activeRow);
        }
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        onIndent?.(activeRow, e.key === "ArrowLeft" ? "out" : "in");
        focusRow(activeRow);
        return;
      }
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusRow(rows[Math.min(i + 1, rows.length - 1)].id);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusRow(rows[Math.max(i - 1, 0)].id);
        break;
      case "Home":
        e.preventDefault();
        focusRow(rows[0].id);
        break;
      case "End":
        e.preventDefault();
        focusRow(rows[rows.length - 1].id);
        break;
      case "ArrowRight":
        // Expanded-by-default: Right moves into the first child (if any).
        if (hasChildren(i)) {
          e.preventDefault();
          focusRow(rows[i + 1].id);
        }
        break;
      case "ArrowLeft": {
        // Move out to the parent row (the tree is always expanded, so there's nothing to collapse).
        const p = parentIndex(i);
        if (p >= 0) {
          e.preventDefault();
          focusRow(rows[p].id);
        }
        break;
      }
      case "Enter":
      case " ":
        e.preventDefault();
        onPick(activeRow);
        break;
    }
  };

  return (
    <Panel>
      <Input
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        placeholder="Filter outline…"
        aria-label="Filter outline"
        style={{ width: "auto", margin: "8px 10px 4px" }}
      />
      {/* The Outline panel is the screen-reader-primary tree (UI-5). Keyboard nav (arrows/Home/End/
          Enter) is handled here on the container; focus rides the roving treeitem rows below. */}
      <div
        role="tree"
        aria-label="Outline tree"
        onKeyDown={onTreeKeyDown}
        style={{ overflowY: "auto", padding: "4px 0 8px" }}
      >
        {rows.map((row, i) => {
          const isEditing = editId === row.id;
          const dropHere = drop?.id === row.id ? drop.where : null;
          // Dragging is disabled on the root + while filtering (the flat filtered view hides structure).
          const canDrag = editable && row.depth > 0 && !q;
          return (
            <div
              key={row.id}
              ref={(el) => {
                rowRefs.current.set(row.id, el);
              }}
              role="treeitem"
              aria-level={row.depth + 1}
              aria-selected={row.id === selectedId}
              aria-expanded={hasChildren(i) ? true : undefined}
              tabIndex={row.id === activeRow ? 0 : -1}
              className="mm-outline-row"
              data-outline-id={row.id}
              onFocus={() => setActiveId(row.id)}
              style={{
                display: "flex",
                alignItems: "center",
                paddingLeft: row.depth * 14,
                background: dropHere === "child" ? "var(--ed-accent-tint)" : undefined,
                borderTop:
                  dropHere === "before" ? "2px solid var(--ed-accent)" : "2px solid transparent",
                borderBottom:
                  dropHere === "after" ? "2px solid var(--ed-accent)" : "2px solid transparent",
              }}
              draggable={canDrag}
              // Touch drag-reorder (A6) — long-press to pick up, slide, lift to drop (mouse ignores these
              // and uses the HTML5 handlers below).
              onPointerDown={(e) => onRowPointerDown(e, row.id, canDrag)}
              onPointerMove={onRowPointerMove}
              onPointerUp={onRowPointerUp}
              onPointerCancel={cancelTouchDrag}
              onDragStart={(e) => {
                dragId.current = row.id;
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (!editable || !dragId.current || dragId.current === row.id) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                const where = outlineDropWhere((e.clientY - r.top) / r.height);
                setDrop({ id: row.id, where });
              }}
              onDragLeave={() => setDrop((d) => (d?.id === row.id ? null : d))}
              onDrop={(e) => {
                e.preventDefault();
                const src = dragId.current;
                dragId.current = null;
                const d = drop;
                setDrop(null);
                if (src && src !== row.id && onMove) onMove(src, row.id, d?.where ?? "child");
              }}
              onDragEnd={() => {
                dragId.current = null;
                setDrop(null);
              }}
            >
              {isEditing ? (
                <input
                  // biome-ignore lint/a11y/noAutofocus: an inline editor opened by an explicit gesture.
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (rapid) commitThen("sibling");
                      else commitEdit();
                    } else if (e.key === "Tab" && rapid) {
                      e.preventDefault();
                      commitThen(e.shiftKey ? "outdent" : "child");
                    } else if (e.key === "Escape") setEditId(null);
                  }}
                  aria-label="Rename topic"
                  style={{ ...inputStyle, flex: 1, margin: "1px 6px", padding: "2px 6px" }}
                />
              ) : (
                <>
                  <button
                    type="button"
                    // -1: the treeitem row owns the tab stop (roving); this stays mouse-clickable.
                    tabIndex={-1}
                    onClick={() => onPick(row.id)}
                    onDoubleClick={() => editable && startEdit(row.id, row.topic)}
                    title={editable ? `${row.topic} — double-click to rename` : row.topic}
                    style={{ ...listRow, padding: "3px 4px 3px 6px", flex: 1, width: "auto" }}
                  >
                    {row.hasNote ? "📝 " : ""}
                    {numbers?.get(row.id) ? `${numbers.get(row.id)} ` : ""}
                    {row.topic || "(untitled)"}
                    {row.progress !== undefined ? (
                      <span style={{ marginLeft: 6, fontSize: fontSize.xs, color: colors.faint }}>
                        {row.progress}%
                      </span>
                    ) : null}
                  </button>
                  {editable && row.depth > 0 && (
                    <span style={{ display: "inline-flex", gap: 2, paddingRight: 6 }}>
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => onIndent?.(row.id, "out")}
                        title="Promote (outdent)"
                        aria-label="Promote topic"
                        style={{ ...styleBtn, fontSize: 11, padding: "1px 5px" }}
                      >
                        ◂
                      </button>
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => onIndent?.(row.id, "in")}
                        title="Demote (indent)"
                        aria-label="Demote topic"
                        style={{ ...styleBtn, fontSize: 11, padding: "1px 5px" }}
                      >
                        ▸
                      </button>
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// A map-wide index of every marker + tag and the nodes carrying it — click a node to jump there.
// Read-only navigation aid (a companion to the per-node Markers palette); reads the live doc.
// Collection lives in the pure markerTagIndex() so it's unit-tested alongside outlineRows.
export function MarkerTagIndex({
  root,
  floatingTopics,
  onPick,
  onRenameTag,
  onDeleteTag,
  tagColorOf,
  onSetTagColor,
  onFilterBy,
}: {
  root: MapNode;
  floatingTopics?: MapNode[];
  onPick: (id: string) => void;
  /** Quick Filter (item 12): show/hide all topics carrying this marker/tag, from the index row. When
   *  omitted, the index stays a pure navigation aid (no filter buttons). */
  onFilterBy?: (kind: "marker" | "tag", key: string) => void;
  /** Tag manager: rename a tag map-wide (rename to an existing name MERGES). When omitted, the Tags
   *  section stays read-only navigation. */
  onRenameTag?: (from: string, to: string) => void;
  /** Tag manager: delete a tag from every node. */
  onDeleteTag?: (tag: string) => void;
  /** The colour currently mapped to a tag (undefined = none). */
  tagColorOf?: (tag: string) => string | undefined;
  /** Tag manager: map a tag to a colour ("" / undefined clears it). Tints every topic carrying it. */
  onSetTagColor?: (tag: string, color: string | undefined) => void;
}) {
  const { markers, tags } = markerTagIndex(root, floatingTopics);
  const manageTags = !!(onRenameTag && onDeleteTag);
  const [editTag, setEditTag] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");

  const jump = (hit: IndexHit, key: string) => (
    <button
      key={`${key}:${hit.id}`}
      type="button"
      onClick={() => onPick(hit.id)}
      title={hit.topic}
      style={{ ...listRow, padding: "2px 10px 2px 24px" }}
    >
      {hit.topic || "(untitled)"}
    </button>
  );

  const commitTagRename = () => {
    if (editTag && onRenameTag) onRenameTag(editTag, tagDraft.trim());
    setEditTag(null);
  };

  const group = (label: string, entries: IndexEntry[], kind: "marker" | "tag", manage = false) => {
    if (entries.length === 0) return null;
    return (
      <div key={label}>
        <PanelSection>{label}</PanelSection>
        {entries.map(({ key, hits }) => (
          <div key={key}>
            {manage && editTag === key ? (
              <input
                // biome-ignore lint/a11y/noAutofocus: an inline editor opened by an explicit gesture.
                autoFocus
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onBlur={commitTagRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTagRename();
                  else if (e.key === "Escape") setEditTag(null);
                }}
                aria-label={`Rename tag ${key}`}
                style={{ ...inputStyle, margin: "1px 10px", padding: "2px 6px", width: "auto" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 10px",
                  fontSize: fontSize.md,
                  fontWeight: fontWeight.semibold,
                  color: colors.text,
                }}
              >
                <span style={{ flex: 1 }}>
                  {key}{" "}
                  <span style={{ color: colors.faint, fontWeight: fontWeight.normal }}>
                    ({hits.length})
                  </span>
                </span>
                {onFilterBy ? (
                  <button
                    type="button"
                    onClick={() => onFilterBy(kind, key)}
                    title={`Filter the map to topics with ${kind === "marker" ? "marker" : "tag"} "${key}"`}
                    aria-label={`Filter by ${kind} ${key}`}
                    style={{ ...styleBtn, fontSize: 11, padding: "1px 5px" }}
                  >
                    ⧩
                  </button>
                ) : null}
                {manage ? (
                  <>
                    {onSetTagColor ? (
                      <input
                        type="color"
                        value={tagColorOf?.(key) ?? "#3b82f6"}
                        onChange={(e) => onSetTagColor(key, e.target.value)}
                        title={`Colour for "${key}" — tints every topic with this tag`}
                        aria-label={`Colour for tag ${key}`}
                        style={{
                          width: 18,
                          height: 18,
                          padding: 0,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 4,
                          background: "none",
                          cursor: "pointer",
                        }}
                      />
                    ) : null}
                    {onSetTagColor && tagColorOf?.(key) ? (
                      <button
                        type="button"
                        onClick={() => onSetTagColor(key, undefined)}
                        title={`Clear colour for "${key}"`}
                        aria-label={`Clear colour for tag ${key}`}
                        style={{ ...styleBtn, fontSize: 11, padding: "1px 5px" }}
                      >
                        ⊘
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setEditTag(key);
                        setTagDraft(key);
                      }}
                      title={`Rename / merge "${key}" — type an existing tag name to merge`}
                      aria-label={`Rename tag ${key}`}
                      style={{ ...styleBtn, fontSize: 11, padding: "1px 5px" }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTag?.(key)}
                      title={`Delete tag "${key}" from every topic`}
                      aria-label={`Delete tag ${key}`}
                      style={{ ...styleBtn, fontSize: 11, padding: "1px 5px" }}
                    >
                      ✕
                    </button>
                  </>
                ) : null}
              </div>
            )}
            {hits.map((hit) => jump(hit, key))}
          </div>
        ))}
      </div>
    );
  };

  const empty = markers.length === 0 && tags.length === 0;
  return (
    <Panel>
      <div style={panelTitle}>Markers &amp; tags</div>
      <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
        {empty ? (
          <div style={{ padding: "4px 10px", fontSize: fontSize.md, color: colors.faint }}>
            No markers or tags in this map yet.
          </div>
        ) : null}
        {group("Markers", markers, "marker")}
        {group("Tags", tags, "tag", manageTags)}
      </div>
    </Panel>
  );
}

// Map statistics: a read-only at-a-glance summary of the whole map (topics, depth, task health,
// content tallies). Numbers come from the pure mapStats() so they're unit-tested independently.
// The map-wide link layer as a dockable index: every relationship arrow + in-map topic hyperlink,
// each end click-to-jump. The map-level complement to the inspector's per-node "Linked from / Links to".
export function RelationshipsPanel({
  doc,
  onPick,
}: {
  doc: MindMapDoc;
  onPick: (id: string) => void;
}) {
  const links: MapLink[] = useMemo(() => mapLinks(doc), [doc]);
  const linkBtn: CSSProperties = {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: colors.text,
    fontSize: fontSize.sm,
    padding: "1px 2px",
    borderRadius: radius.sm,
    maxWidth: 140,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
  return (
    <Panel>
      <div style={panelTitle}>🔗 Relationships</div>
      {links.length === 0 ? (
        <div style={{ padding: "8px 12px", color: colors.muted, fontSize: fontSize.sm }}>
          No relationships or topic links in this map yet.
        </div>
      ) : (
        <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
          {links.map((l, i) => (
            <div
              key={`${l.kind}:${l.fromId}:${l.toId}:${i}`}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 4,
                padding: "2px 10px",
                fontSize: fontSize.sm,
              }}
            >
              <span
                style={{ color: colors.muted }}
                title={l.kind === "relationship" ? "Relationship" : "Topic link"}
              >
                {l.kind === "relationship" ? "↬" : "↪"}
              </span>
              <button type="button" onClick={() => onPick(l.fromId)} style={linkBtn}>
                {l.fromTopic || "(untitled)"}
              </button>
              <span style={{ color: colors.muted }}>→</span>
              <button type="button" onClick={() => onPick(l.toId)} style={linkBtn}>
                {l.toTopic || "(untitled)"}
              </button>
              {l.label ? (
                <span style={{ color: colors.muted, whiteSpace: "nowrap" }}>· {l.label}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function StatsPanel({ doc }: { doc: MindMapDoc }) {
  const s = mapStats(doc);
  const pct = Math.round(s.completion * 100);
  const row = (label: string, value: string | number, accent?: string) => (
    <div
      key={label}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 8,
        padding: "3px 12px",
        fontSize: fontSize.md,
      }}
    >
      <span style={{ color: colors.muted }}>{label}</span>
      <span style={{ fontWeight: fontWeight.semibold, color: accent ?? colors.text }}>{value}</span>
    </div>
  );
  return (
    <Panel>
      <div style={panelTitle}>📊 Map statistics</div>
      <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
        <PanelSection>Structure</PanelSection>
        {row("Topics", s.topics)}
        {row("Leaves", s.leaves)}
        {row("Max depth", s.maxDepth)}
        {s.floating > 0 ? row("Floating topics", s.floating) : null}
        <PanelSection>Tasks</PanelSection>
        {row("Tasks", s.tasks)}
        {row("Completed", `${s.completed} / ${s.tasks} (${pct}%)`)}
        {row("Overdue", s.overdue, s.overdue > 0 ? "#b23b3a" : undefined)}
        <PanelSection>Content</PanelSection>
        {row("Words", s.words)}
        {row("Reading time", s.readingMinutes <= 1 ? "~1 min" : `~${s.readingMinutes} min`)}
        {row("Notes", s.notes)}
        {row("Attachments", s.attachments)}
        {row("Distinct tags", s.tags)}
        {row("Distinct markers", s.markers)}
        {row("Relationships", s.links)}
        {row("Boundaries", s.boundaries)}
      </div>
    </Panel>
  );
}

// Read-only agenda: every dated, unfinished task bucketed into overdue / today / this week (#9).
// Click a row to jump to that topic. Buckets come from the pure agendaBuckets() so they're unit-
// tested independently; `today` is injected so the panel renders deterministically in tests.
export function AgendaPanel({
  doc,
  today,
  onPick,
}: {
  doc: MindMapDoc;
  /** Injected ISO "YYYY-MM-DD" (the app passes todayISO()) so the buckets stay deterministic. */
  today: string;
  onPick: (id: string) => void;
}) {
  const buckets = agendaBuckets(doc, today);
  const group = (label: string, items: AgendaItem[], accent?: string) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <PanelSection>
          {label} ({items.length})
        </PanelSection>
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onPick(it.id)}
            title={`${it.topic || "(untitled)"} — due ${it.due}`}
            style={{
              ...listRow,
              display: "flex",
              gap: 8,
              alignItems: "baseline",
              padding: "2px 10px",
            }}
          >
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
              {it.topic || "(untitled)"}
            </span>
            <span style={{ flexShrink: 0, fontSize: fontSize.sm, color: accent ?? colors.faint }}>
              {formatDateShort(it.due)}
            </span>
          </button>
        ))}
      </div>
    );
  };
  return (
    <Panel>
      <div style={panelTitle}>🗓 Agenda</div>
      <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
        {agendaIsEmpty(buckets) ? (
          <div style={{ padding: "4px 10px", fontSize: fontSize.md, color: colors.faint }}>
            No overdue or upcoming tasks.
          </div>
        ) : null}
        {group("Overdue", buckets.overdue, "#b23b3a")}
        {group("Today", buckets.today, colors.text)}
        {group("This week", buckets.thisWeek)}
        {group("Later", buckets.later)}
      </div>
    </Panel>
  );
}

// In-editor maps index (#18): a dockable, filterable list of every saved map to switch between
// without leaving the canvas (the top tab strip only shows OPEN maps). Click a row to open it.
export function MapsPanel({
  maps,
  currentId,
  onOpen,
}: {
  maps: readonly { id: string; title: string }[];
  currentId: string;
  onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? maps.filter((m) => (m.title || "").toLowerCase().includes(needle)) : maps;
  return (
    <Panel>
      <div style={panelTitle}>🗂 Maps</div>
      <div style={{ padding: "0 10px 6px" }}>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter maps…"
          aria-label="Filter maps"
          style={{ width: "auto" }}
        />
      </div>
      <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
        {shown.length === 0 ? (
          <div style={{ padding: "4px 10px", fontSize: fontSize.md, color: colors.faint }}>
            No maps match.
          </div>
        ) : (
          shown.map((m) => {
            const current = m.id === currentId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onOpen(m.id)}
                aria-current={current ? "true" : undefined}
                title={m.title || "(untitled)"}
                style={{
                  ...listRow,
                  padding: "3px 10px",
                  fontWeight: current ? fontWeight.semibold : fontWeight.normal,
                  background: current ? "var(--ed-hover, rgba(0,0,0,0.05))" : undefined,
                }}
              >
                {m.title || "(untitled)"}
              </button>
            );
          })
        )}
      </div>
    </Panel>
  );
}

// Quick-capture inbox: a map-independent "Unfiled" bucket. Jot a thought (Enter to capture), then
// file it onto the current map as a floating topic — or discard it. Captures survive across maps and
// reloads (persisted in IndexedDB via useInbox). The list is newest-first.
export function InboxPanel({
  items,
  onCapture,
  onFile,
  onDiscard,
  canFile,
}: {
  items: readonly { id: string; text: string; ts: number }[];
  /** Capture a new snippet (already trimmed by the hook; blank is ignored). */
  onCapture: (text: string) => void;
  /** File a snippet onto the current map (adds it as a floating topic, then removes it here). */
  onFile: (id: string, text: string) => void;
  /** Drop a snippet without filing it. */
  onDiscard: (id: string) => void;
  /** Whether a map is open to file onto (the "→ map" button is disabled otherwise). */
  canFile: boolean;
}) {
  const [draft, setDraft] = useState("");
  const capture = () => {
    if (!draft.trim()) return;
    onCapture(draft);
    setDraft("");
  };
  return (
    <Panel>
      <div style={panelTitle}>📥 Inbox</div>
      <div style={{ padding: "0 10px 6px", display: "flex", gap: 6 }}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              capture();
            }
          }}
          placeholder="Jot a thought…"
          aria-label="Capture to inbox"
          style={{ width: "auto", flex: 1 }}
        />
        <Button onClick={capture} disabled={!draft.trim()} style={{ padding: "2px 8px" }}>
          Add
        </Button>
      </div>
      <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
        {items.length === 0 ? (
          <div style={{ padding: "4px 10px", fontSize: fontSize.md, color: colors.faint }}>
            Nothing unfiled. Jot ideas here, file them onto a map later.
          </div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
              }}
            >
              <span
                title={it.text}
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: fontSize.md,
                }}
              >
                {it.text}
              </span>
              <Button
                onClick={() => onFile(it.id, it.text)}
                disabled={!canFile}
                title={canFile ? "File onto the current map" : "Open a map to file onto"}
                aria-label={`File "${it.text}" onto the map`}
                style={{ padding: "2px 6px", fontSize: fontSize.sm }}
              >
                → map
              </Button>
              <Button
                onClick={() => onDiscard(it.id)}
                title="Discard"
                aria-label={`Discard "${it.text}"`}
                style={{ padding: "2px 6px", fontSize: fontSize.sm }}
              >
                ×
              </Button>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

// Custom slide-deck editor (#3): reorder / add / remove the presentation slides and give each a
// speaker note, overriding the auto walk-through. The deck is seeded from the resolved slides (so it
// starts as today's auto deck), and every edit commits the full explicit deck via onChange — turning
// the map "custom". "Restore default" clears it back to the auto deck. Pure list ops live in deckEdit.
export function SlideDeckEditorPanel({
  deck,
  topics,
  isCustom,
  onChange,
  onRestoreDefault,
}: {
  /** The current deck rows (each ref + a resolved display heading). */
  deck: { ref: SlideRef; heading: string }[];
  /** Every topic in the map, for the "add slide" picker. */
  topics: { id: string; topic: string; depth: number }[];
  /** Whether a custom deck is in effect (enables "Restore default"). */
  isCustom: boolean;
  /** Commit the edited deck (the full explicit slide list). */
  onChange: (slides: SlideRef[]) => void;
  /** Clear the custom deck back to the auto walk-through. */
  onRestoreDefault: () => void;
}) {
  const [addId, setAddId] = useState("");
  const refs = deck.map((d) => d.ref);
  return (
    <Panel>
      <div style={panelTitle}>🎞 Slide deck</div>
      <div style={{ padding: "0 10px 4px", fontSize: fontSize.sm, color: colors.faint }}>
        Choose which topics become slides, reorder them, and add speaker notes. Empty = the
        automatic deck (overview + one slide per top branch).
      </div>
      <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
        {deck.map((row, i) => (
          <div
            key={`${row.ref.nodeId}:${i}`}
            style={{ padding: "4px 10px", borderTop: `1px solid ${colors.border}` }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ flex: 1, fontSize: fontSize.sm, color: colors.text }}>
                {i + 1}. {row.heading}
                {row.ref.nodeId === OVERVIEW_SLIDE_ID ? " (overview)" : ""}
              </span>
              <Button
                onClick={() => onChange(reorderSlides(refs, i, i - 1))}
                disabled={i === 0}
                title="Move up"
                aria-label={`Move ${row.heading} up`}
                style={{ padding: "0 6px", fontSize: fontSize.sm }}
              >
                ↑
              </Button>
              <Button
                onClick={() => onChange(reorderSlides(refs, i, i + 1))}
                disabled={i === deck.length - 1}
                title="Move down"
                aria-label={`Move ${row.heading} down`}
                style={{ padding: "0 6px", fontSize: fontSize.sm }}
              >
                ↓
              </Button>
              <Button
                onClick={() => onChange(removeSlide(refs, i))}
                title="Remove slide"
                aria-label={`Remove ${row.heading}`}
                style={{ padding: "0 6px", fontSize: fontSize.sm }}
              >
                ✕
              </Button>
            </div>
            <textarea
              value={row.ref.note ?? ""}
              onChange={(e) => onChange(setSlideNote(refs, i, e.target.value))}
              placeholder="Speaker note…"
              aria-label={`Speaker note for ${row.heading}`}
              rows={2}
              style={{ ...inputStyle, width: "100%", marginTop: 3, resize: "vertical" }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, padding: "6px 10px", alignItems: "center" }}>
        <Select
          value={addId}
          onChange={(e) => setAddId(e.target.value)}
          aria-label="Add a slide"
          style={{ width: "auto", flex: 1 }}
        >
          <option value="">Add a slide…</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {`${"  ".repeat(t.depth)}${t.topic}`}
            </option>
          ))}
        </Select>
        <Button
          onClick={() => {
            if (!addId) return;
            onChange(addSlide(refs, addId));
            setAddId("");
          }}
          style={{ fontSize: fontSize.sm }}
        >
          + Add
        </Button>
      </div>
      {isCustom ? (
        <Button onClick={onRestoreDefault} style={{ margin: "0 10px 8px", fontSize: fontSize.sm }}>
          Restore default deck
        </Button>
      ) : null}
    </Panel>
  );
}

// Read-only Power Filter: a free-text box plus toggle chips for every marker/tag in the map.
// Matching topics (and the paths to them) stay lit on the canvas; everything else dims. Nothing
// is deleted — closing the panel (or Clear) restores the full map.
export function FilterPanel({
  root,
  floatingTopics,
  text,
  markers,
  tags,
  due,
  priority,
  completion,
  relDir,
  relType,
  matchCount,
  savedFilters,
  onText,
  onToggleMarker,
  onToggleTag,
  onDue,
  onPriority,
  onCompletion,
  onRelDir,
  onRelType,
  hide = false,
  onHide,
  onExtract,
  onClear,
  onSaveFilter,
  onApplyFilter,
  onDeleteFilter,
}: {
  root: MapNode;
  floatingTopics?: MapNode[];
  text: string;
  markers: string[];
  tags: string[];
  due: DueMode;
  priority: number;
  completion: CompletionMode;
  relDir: RelDir | "";
  relType: string;
  matchCount: number;
  savedFilters: SavedFilter[];
  onText: (value: string) => void;
  onToggleMarker: (marker: string) => void;
  onToggleTag: (tag: string) => void;
  onDue: (mode: DueMode) => void;
  onPriority: (priority: number) => void;
  onCompletion: (mode: CompletionMode) => void;
  onRelDir: (dir: RelDir | "") => void;
  onRelType: (type: string) => void;
  /** "Hide non-matches" mode (vs the default fade). */
  hide?: boolean;
  onHide?: (on: boolean) => void;
  /** Extract the current matches (+ their ancestors) into a new library map. */
  onExtract?: () => void;
  onClear: () => void;
  onSaveFilter: (name: string) => void;
  onApplyFilter: (criteria: FilterCriteria) => void;
  onDeleteFilter: (id: string) => void;
}) {
  const { markers: markerEntries, tags: tagEntries } = markerTagIndex(root, floatingTopics);
  const active =
    text.trim().length > 0 ||
    markers.length > 0 ||
    tags.length > 0 ||
    due !== "" ||
    priority > 0 ||
    completion !== "" ||
    relDir !== "";
  const [saveName, setSaveName] = useState("");
  const chip = (key: string, selected: boolean, onClick: () => void) => (
    <Chip key={key} selected={selected} onClick={onClick}>
      {key}
    </Chip>
  );
  return (
    <Panel>
      <div style={panelTitle}>🎚 Power Filter</div>
      <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
        <Input
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Filter by text…"
          aria-label="Filter by text"
          style={{ width: "auto", margin: "4px 10px" }}
        />
        <PanelSection>Due date</PanelSection>
        <Select
          value={due}
          onChange={(e) => onDue(e.target.value as DueMode)}
          aria-label="Filter by due date"
          style={{ width: "auto", margin: "0 10px 4px" }}
        >
          <option value="">Any</option>
          <option value="dated">Has a date</option>
          <option value="overdue">Overdue</option>
          <option value="soon">Due ≤ 7 days</option>
        </Select>
        <PanelSection>Priority</PanelSection>
        <Select
          value={priority}
          onChange={(e) => onPriority(Number(e.target.value))}
          aria-label="Filter by priority"
          style={{ width: "auto", margin: "0 10px 4px" }}
        >
          <option value={0}>Any</option>
          {PRIORITY_LEVELS.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p] ? `${p} — ${PRIORITY_LABEL[p]}` : String(p)}
            </option>
          ))}
        </Select>
        <PanelSection>Completion</PanelSection>
        <Select
          value={completion}
          onChange={(e) => onCompletion(e.target.value as CompletionMode)}
          aria-label="Filter by completion"
          style={{ width: "auto", margin: "0 10px 4px" }}
        >
          <option value="">Any</option>
          <option value="complete">Done</option>
          <option value="in-progress">In progress</option>
          <option value="incomplete">Not done</option>
        </Select>
        <PanelSection>Has relationship</PanelSection>
        <div style={{ display: "flex", gap: 4, padding: "0 10px 4px" }}>
          <Select
            value={relDir}
            onChange={(e) => onRelDir(e.target.value as RelDir | "")}
            aria-label="Filter by relationship direction"
            style={{ width: "auto", flex: 1 }}
          >
            <option value="">Any / off</option>
            <option value="out">Outgoing →</option>
            <option value="in">Incoming ←</option>
            <option value="either">Either ↔</option>
          </Select>
          <Select
            value={relType}
            onChange={(e) => onRelType(e.target.value)}
            aria-label="Filter by relationship type"
            disabled={relDir === ""}
            style={{ width: "auto", flex: 1 }}
          >
            <option value="">Any type</option>
            <option value="relates-to">relates-to</option>
            <option value="depends-on">depends-on</option>
            <option value="causes">causes</option>
            <option value="supports">supports</option>
            <option value="blocks">blocks</option>
          </Select>
        </div>
        {markerEntries.length > 0 ? (
          <>
            <PanelSection>Markers</PanelSection>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 10px" }}>
              {markerEntries.map((e) =>
                chip(e.key, markers.includes(e.key), () => onToggleMarker(e.key)),
              )}
            </div>
          </>
        ) : null}
        {tagEntries.length > 0 ? (
          <>
            <PanelSection>Tags</PanelSection>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 10px" }}>
              {tagEntries.map((e) => chip(e.key, tags.includes(e.key), () => onToggleTag(e.key)))}
            </div>
          </>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            padding: "10px 10px 2px",
            fontSize: fontSize.sm,
            color: colors.muted,
          }}
        >
          <span>
            {active ? `${matchCount} match${matchCount === 1 ? "" : "es"}` : "Showing all"}
          </span>
          {active ? (
            <Button onClick={onClear} style={{ padding: "2px 8px" }}>
              Clear
            </Button>
          ) : null}
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 10px",
            fontSize: fontSize.sm,
            color: colors.text,
            cursor: "pointer",
          }}
        >
          <input type="checkbox" checked={hide} onChange={(e) => onHide?.(e.target.checked)} />
          Hide non-matches (instead of fading)
        </label>
        {active && onExtract ? (
          <div style={{ padding: "2px 10px 4px" }}>
            <Button onClick={onExtract} style={{ padding: "2px 8px", fontSize: fontSize.sm }}>
              Extract matches to a new map
            </Button>
          </div>
        ) : null}
        <div style={{ padding: "6px 10px", fontSize: fontSize.xs, color: colors.faint }}>
          Read-only: non-matching topics are {hide ? "hidden" : "dimmed"}, the map itself is
          unchanged.
        </div>

        <PanelSection>Saved filters</PanelSection>
        {savedFilters.length === 0 ? (
          <div style={{ padding: "0 10px 4px", fontSize: fontSize.sm, color: colors.faint }}>
            Save a filter to reuse it across maps.
          </div>
        ) : (
          savedFilters.map((f) => (
            <div
              key={f.id}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "1px 10px" }}
            >
              <button
                type="button"
                onClick={() => onApplyFilter(f.criteria)}
                title={describeCriteria(f.criteria)}
                style={{
                  flex: 1,
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: fontSize.md,
                  color: colors.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  padding: "2px 0",
                }}
              >
                {f.name}
              </button>
              <button
                type="button"
                onClick={() => onDeleteFilter(f.id)}
                title={`Delete "${f.name}"`}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: colors.faint,
                  fontSize: fontSize.sm,
                }}
              >
                ✕
              </button>
            </div>
          ))
        )}
        {active ? (
          <div style={{ display: "flex", gap: 4, padding: "4px 10px 8px" }}>
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && saveName.trim()) {
                  onSaveFilter(saveName.trim());
                  setSaveName("");
                }
              }}
              placeholder="Name this filter…"
              aria-label="Save filter name"
              style={{ width: "auto", flex: 1 }}
            />
            <Button
              disabled={!saveName.trim()}
              onClick={() => {
                onSaveFilter(saveName.trim());
                setSaveName("");
              }}
              style={{ padding: "2px 8px", fontSize: fontSize.sm }}
            >
              Save
            </Button>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

// Per-map version history: a list of past snapshots (newest first) with a one-click restore, plus
// an on-demand "Save version now". Snapshots are captured automatically while editing (throttled)
// and on demand; restoring loads a snapshot back in place (the current state is checkpointed first).
export function HistoryPanel({
  versions,
  onSaveNow,
  onPlay,
  onRestore,
  onClose,
}: {
  versions: VersionMeta[];
  onSaveNow: () => void;
  onPlay: () => void;
  onRestore: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Panel>
      <div
        style={{
          ...panelTitle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>🕔 History</span>
        <Button onClick={onClose} style={{ padding: "2px 8px", fontSize: fontSize.sm }}>
          Close
        </Button>
      </div>
      <Button
        onClick={onSaveNow}
        style={{ margin: "0 10px 6px", padding: "4px 8px", fontSize: fontSize.sm }}
      >
        ＋ Save version now
      </Button>
      <Button
        onClick={onPlay}
        disabled={versions.length < 2}
        title={
          versions.length < 2
            ? "Save at least two versions to play the timeline"
            : "Play the map's history as a timeline"
        }
        style={{ margin: "0 10px 8px", padding: "4px 8px", fontSize: fontSize.sm }}
      >
        ▶ Play timeline
      </Button>
      {/* Be honest that auto-history is finite + throttled, so a user doesn't expect to roll back to
          an arbitrary point on a busy map (snapshots coalesce to ~3 min; the last MAX_VERSIONS kept). */}
      <div style={{ padding: "0 10px 8px", fontSize: fontSize.xs, color: colors.faint }}>
        Auto-saves are throttled (~3 min); the last {MAX_VERSIONS} are kept. Use “Save version now”
        to pin an important state.
      </div>
      <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
        {versions.length === 0 ? (
          <div style={{ padding: "4px 10px", fontSize: fontSize.md, color: colors.faint }}>
            No saved versions yet. Snapshots are captured automatically as you edit.
          </div>
        ) : (
          versions.map((v) => (
            <div
              key={v.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
              }}
            >
              <span
                style={{
                  fontSize: fontSize.md,
                  color: colors.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={new Date(v.ts).toLocaleString()}
              >
                {timeAgo(v.ts)} <span style={{ color: colors.faint }}>· {v.nodeCount} topics</span>
              </span>
              <Button
                onClick={() => onRestore(v.id)}
                style={{ padding: "1px 8px", fontSize: fontSize.sm }}
              >
                Restore
              </Button>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

/** The bottom overlay controls for version-history timeline playback (state lives in App). */
export function PlaybackBar({
  index,
  count,
  playing,
  label,
  onPlayPause,
  onStep,
  onSeek,
  onRestore,
  onExit,
}: {
  index: number;
  count: number;
  playing: boolean;
  label: string;
  onPlayPause: () => void;
  onStep: (delta: number) => void;
  onSeek: (index: number) => void;
  onRestore: () => void;
  onExit: () => void;
}) {
  const btn: CSSProperties = { padding: "2px 9px", fontSize: fontSize.md };
  return (
    <div
      role="toolbar"
      aria-label="History playback"
      style={{
        position: "absolute",
        left: "50%",
        bottom: 16,
        transform: "translateX(-50%)",
        zIndex: 11,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        background: "var(--ed-card, rgba(255,255,255,0.95))",
        border: `1px solid ${colors.playbackBorder}`,
        borderRadius: radius.xl,
        boxShadow: "var(--ed-shadow-pop, 0 6px 24px rgba(31,27,77,0.18))",
        maxWidth: "min(560px, calc(100% - 24px))",
      }}
    >
      <Button
        onClick={() => onStep(-1)}
        disabled={index <= 0}
        style={btn}
        title="Previous version"
        aria-label="Previous version"
      >
        ⏮
      </Button>
      <Button onClick={onPlayPause} style={btn} aria-label={playing ? "Pause" : "Play"}>
        {playing ? "⏸" : "▶"}
      </Button>
      <Button
        onClick={() => onStep(1)}
        disabled={index >= count - 1}
        style={btn}
        title="Next version"
        aria-label="Next version"
      >
        ⏭
      </Button>
      <input
        type="range"
        min={0}
        max={Math.max(0, count - 1)}
        value={index}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Version timeline"
        style={{ flex: 1, minWidth: 90, accentColor: colors.accentSlider }}
      />
      <span style={{ fontSize: fontSize.sm, color: colors.muted, whiteSpace: "nowrap" }}>
        {label}
      </span>
      <Button onClick={onRestore} style={btn} title="Restore this version">
        Restore this
      </Button>
      <Button onClick={onExit} style={btn} title="Exit playback (Esc)">
        Exit
      </Button>
    </div>
  );
}

/** The guided-walk bar — step through topics one at a time with a spotlight + speaker notes (the
 *  presentation tour). State (current index, the ordered topic list) lives in App. */
export function WalkBar({
  index,
  total,
  topic,
  note,
  onPrev,
  onNext,
  onExit,
  cinematic,
  onToggleCinematic,
}: {
  index: number;
  total: number;
  topic: string;
  note?: string;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  /** Cinematic framing on? (zoom to each branch vs centre the topic). */
  cinematic?: boolean;
  onToggleCinematic?: () => void;
}) {
  const btn: CSSProperties = { padding: "2px 9px", fontSize: fontSize.md };
  return (
    <div
      role="toolbar"
      aria-label="Guided walk"
      style={{
        position: "absolute",
        left: "50%",
        bottom: 16,
        transform: "translateX(-50%)",
        zIndex: 11,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px 12px",
        background: "rgba(255,255,255,0.97)",
        border: `1px solid ${colors.playbackBorder}`,
        borderRadius: radius.xl,
        boxShadow: "0 6px 24px rgba(31,27,77,0.18)",
        maxWidth: "min(620px, calc(100% - 24px))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button onClick={onPrev} disabled={index <= 0} style={btn} aria-label="Previous topic">
          ◀
        </Button>
        <span
          style={{
            flex: 1,
            minWidth: 120,
            textAlign: "center",
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
            color: colors.text,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {topic || "(untitled)"}
        </span>
        <Button onClick={onNext} disabled={index >= total - 1} style={btn} aria-label="Next topic">
          ▶
        </Button>
        <span style={{ fontSize: fontSize.sm, color: colors.muted, whiteSpace: "nowrap" }}>
          {index + 1} / {total}
        </span>
        {onToggleCinematic ? (
          <Button
            onClick={onToggleCinematic}
            aria-pressed={!!cinematic}
            style={{
              ...btn,
              ...(cinematic ? { background: colors.accent, color: colors.white } : {}),
            }}
            title={
              cinematic
                ? "Cinematic zoom on — frames each branch (click for flat 100%)"
                : "Cinematic zoom off — centres each topic (click to zoom each branch)"
            }
          >
            🎬
          </Button>
        ) : null}
        <Button onClick={onExit} style={btn} title="Exit walk (Esc)">
          Exit
        </Button>
      </div>
      {note?.trim() ? (
        <div
          style={{
            maxHeight: 96,
            overflowY: "auto",
            fontSize: fontSize.sm,
            color: colors.muted,
            whiteSpace: "pre-wrap",
            borderTop: `1px solid ${colors.border}`,
            paddingTop: 5,
          }}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
}

/** A reusable, named per-node style (the "styles organizer"); persisted app-wide. */
export interface NamedStyle {
  id: string;
  name: string;
  style: NodeStyle;
}

// Conditional formatting + a styles organizer. Map-wide rules style topics by tag/marker/completion
// (view-only; matching in src/rules.ts, applied in projection); named styles capture a node's look
// to reuse across nodes + maps. Both live in this one left-rail panel.
export function StylesPanel({
  rules,
  markers,
  namedStyles,
  onAddRule,
  onDeleteRule,
  onSaveStyle,
  onApplyStyle,
  onDeleteStyle,
}: {
  rules: ConditionalRule[];
  markers: readonly string[];
  namedStyles: NamedStyle[];
  onAddRule: (rule: ConditionalRule) => void;
  onDeleteRule: (id: string) => void;
  onSaveStyle: (name: string) => void;
  onApplyStyle: (style: NodeStyle) => void;
  onDeleteStyle: (id: string) => void;
}) {
  const [styleName, setStyleName] = useState("");
  const [kind, setKind] = useState<RuleConditionKind>("tag");
  const [value, setValue] = useState("");
  const [negate, setNegate] = useState(false);
  // Extra AND-ed clauses (each independently negatable); "+ AND condition" appends a blank row. Each
  // carries a client-only `_key` (stripped before onAddRule) so React keys survive reordering/removal
  // without relying on the array index.
  const [also, setAlso] = useState<(RuleCondition & { _key: string })[]>([]);
  const [fill, setFill] = useState("");
  const [border, setBorder] = useState("");
  // Actions (in addition to a style): a marker to auto-apply + a branch colour for the subtree.
  const [actionIcon, setActionIcon] = useState("");
  const [actionColor, setActionColor] = useState("");
  // tag / marker / priority / textContains carry a value; completed / overdue / dueSoon / hasAttachment don't.
  const conditionNeedsValue = (k: RuleConditionKind) =>
    k === "tag" || k === "marker" || k === "priority" || k === "textContains";
  const needsValue = conditionNeedsValue(kind);
  const add = () => {
    if (needsValue && !value.trim()) return;
    if (also.some((c) => conditionNeedsValue(c.kind) && !c.value?.trim())) return;
    // A rule needs at least one effect — a style swatch OR an action (marker / branch colour).
    if (!fill && !border && !actionIcon && !actionColor) return;
    const style: NodeStyle = {};
    if (fill) style.background = fill;
    if (border) style.border = `2px solid ${border}`;
    onAddRule({
      id: crypto.randomUUID(),
      kind,
      value: needsValue ? value.trim() : undefined,
      negate: negate || undefined,
      also: also.length
        ? also.map((c) => ({
            kind: c.kind,
            value: conditionNeedsValue(c.kind) ? c.value?.trim() : undefined,
            negate: c.negate || undefined,
          }))
        : undefined,
      style,
      icons: actionIcon ? [actionIcon] : undefined,
      branchColor: actionColor || undefined,
    });
    setValue("");
    setNegate(false);
    setAlso([]);
    setFill("");
    setBorder("");
    setActionIcon("");
    setActionColor("");
  };
  const updateAlso = (i: number, patch: Partial<RuleCondition>) =>
    setAlso((rows) => rows.map((r, ri) => (ri === i ? { ...r, ...patch } : r)));
  // One condition's kind-dependent value input, reused for the primary condition and every AND row.
  const conditionValueField = (
    k: RuleConditionKind,
    v: string,
    onChange: (v: string) => void,
    label: string,
  ) => {
    if (k === "tag")
      return (
        <Input
          value={v}
          onChange={(e) => onChange(e.target.value)}
          placeholder="tag name"
          aria-label={label}
          style={{ width: "auto", margin: "0 10px 4px" }}
        />
      );
    if (k === "marker")
      return (
        <Select
          value={v}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          style={{ width: "auto", margin: "0 10px 4px" }}
        >
          <option value="">Pick a marker…</option>
          {markers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      );
    if (k === "priority")
      return (
        <Select
          value={v}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          style={{ width: "auto", margin: "0 10px 4px" }}
        >
          <option value="">Pick a priority…</option>
          {PRIORITY_LEVELS.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p] ? `${p} — ${PRIORITY_LABEL[p]} & up` : `${p} & up`}
            </option>
          ))}
        </Select>
      );
    if (k === "textContains")
      return (
        <Input
          value={v}
          onChange={(e) => onChange(e.target.value)}
          placeholder="topic contains…"
          aria-label={label}
          style={{ width: "auto", margin: "0 10px 4px" }}
        />
      );
    if (k === "relationshipType")
      return (
        <Select
          value={v}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          style={{ width: "auto", margin: "0 10px 4px" }}
        >
          <option value="">any relationship</option>
          <option value="relates-to">relates-to</option>
          <option value="depends-on">depends-on</option>
          <option value="causes">causes</option>
          <option value="supports">supports</option>
          <option value="blocks">blocks</option>
        </Select>
      );
    return null; // completed / overdue / dueSoon / hasAttachment need no value
  };
  const conditionKindOptions = (
    <>
      <option value="tag">has tag</option>
      <option value="marker">has marker</option>
      <option value="completed">is completed</option>
      <option value="overdue">is overdue</option>
      <option value="dueSoon">is due soon</option>
      <option value="priority">priority ≤</option>
      <option value="textContains">text contains</option>
      <option value="hasAttachment">has attachment</option>
      <option value="relationshipType">has relationship</option>
    </>
  );
  const swatchRow = (
    swatches: readonly string[],
    selected: string,
    onPick: (c: string) => void,
    label: string,
  ) => (
    <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "0 10px 4px" }}>
      <span style={{ fontSize: fontSize.sm, color: colors.muted, width: 44 }}>{label}</span>
      {swatches.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(selected === c ? "" : c)}
          title={c}
          style={{
            width: 18,
            height: 18,
            borderRadius: radius.xs,
            border:
              selected === c ? `2px solid ${colors.text}` : `1px solid ${colors.controlBorder}`,
            background: c,
            cursor: "pointer",
            padding: 0,
          }}
        />
      ))}
    </div>
  );
  // The small colour preview shown beside each rule / named style (the fill+border chip).
  const previewSwatch = (style: NodeStyle): CSSProperties => ({
    width: 16,
    height: 16,
    borderRadius: radius.xs,
    flexShrink: 0,
    background: style.background ?? colors.white,
    border: style.border ?? `1px solid ${colors.controlBorder}`,
  });
  return (
    <Panel>
      <div style={panelTitle}>🎨 Styles</div>
      <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
        <PanelSection>Conditional formatting</PanelSection>
        <div style={{ padding: "0 10px 4px", fontSize: fontSize.sm, color: colors.faint }}>
          Auto-style topics by tag, marker, completion, due date, priority, text, or attachment —
          and optionally auto-apply a marker or branch colour. Manual styling still wins.
        </div>
        {rules.map((r) => (
          <div
            key={r.id}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 10px" }}
          >
            <span style={previewSwatch(r.style)} />
            <span style={{ flex: 1, fontSize: fontSize.sm, color: colors.text }}>
              {describeRule(r)}
              {describeRuleActions(r)}
            </span>
            <Button
              onClick={() => onDeleteRule(r.id)}
              title="Remove rule"
              style={{ padding: "0 6px", fontSize: fontSize.sm }}
            >
              ✕
            </Button>
          </div>
        ))}
        <div
          style={{ borderTop: `1px solid ${colors.border}`, margin: "6px 10px", paddingTop: 6 }}
        />
        <div style={{ display: "flex", gap: 4, padding: "0 10px 4px", alignItems: "center" }}>
          <span style={{ fontSize: fontSize.sm, color: colors.muted, width: 44 }}>When</span>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontSize: fontSize.sm,
              color: colors.muted,
            }}
            title="Invert this condition"
          >
            <input type="checkbox" checked={negate} onChange={(e) => setNegate(e.target.checked)} />
            NOT
          </label>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as RuleConditionKind)}
            aria-label="Rule condition"
            style={{ width: "auto", flex: 1 }}
          >
            {conditionKindOptions}
          </Select>
        </div>
        {conditionValueField(kind, value, setValue, "Rule value")}
        {also.map((c, i) => (
          <div key={c._key}>
            <div style={{ display: "flex", gap: 4, padding: "0 10px 4px", alignItems: "center" }}>
              <span style={{ fontSize: fontSize.sm, color: colors.muted, width: 44 }}>AND</span>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: fontSize.sm,
                  color: colors.muted,
                }}
                title="Invert this condition"
              >
                <input
                  type="checkbox"
                  checked={!!c.negate}
                  onChange={(e) => updateAlso(i, { negate: e.target.checked })}
                />
                NOT
              </label>
              <Select
                value={c.kind}
                onChange={(e) =>
                  updateAlso(i, { kind: e.target.value as RuleConditionKind, value: "" })
                }
                aria-label="AND condition"
                style={{ width: "auto", flex: 1 }}
              >
                {conditionKindOptions}
              </Select>
              <Button
                onClick={() => setAlso((rows) => rows.filter((_, ri) => ri !== i))}
                title="Remove this AND condition"
                style={{ padding: "0 6px", fontSize: fontSize.sm }}
              >
                ✕
              </Button>
            </div>
            {conditionValueField(
              c.kind,
              c.value ?? "",
              (v) => updateAlso(i, { value: v }),
              "AND condition value",
            )}
          </div>
        ))}
        <Button
          onClick={() =>
            setAlso((rows) => [...rows, { kind: "tag", value: "", _key: crypto.randomUUID() }])
          }
          style={{ margin: "0 10px 4px", fontSize: fontSize.sm }}
        >
          + AND condition
        </Button>
        {swatchRow(FILL_SWATCHES, fill, setFill, "Fill")}
        {swatchRow(BORDER_SWATCHES, border, setBorder, "Border")}
        <div style={{ display: "flex", gap: 4, padding: "2px 10px 4px", alignItems: "center" }}>
          <span style={{ fontSize: fontSize.sm, color: colors.muted, width: 44 }}>Marker</span>
          <Select
            value={actionIcon}
            onChange={(e) => setActionIcon(e.target.value)}
            aria-label="Rule action marker"
            style={{ width: "auto", flex: 1 }}
          >
            <option value="">No marker</option>
            {markers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
        {swatchRow(BORDER_SWATCHES, actionColor, setActionColor, "Branch")}
        <Button onClick={add} style={{ margin: "4px 10px", fontSize: fontSize.sm }}>
          + Add rule
        </Button>

        <PanelSection>Named styles</PanelSection>
        <div style={{ padding: "0 10px 4px", fontSize: fontSize.sm, color: colors.faint }}>
          Save the selected topic's look, then reuse it on others.
        </div>
        {namedStyles.map((s) => (
          <div
            key={s.id}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 10px" }}
          >
            <span style={previewSwatch(s.style)} />
            <button
              type="button"
              onClick={() => onApplyStyle(s.style)}
              title={`Apply "${s.name}" to the selected topic`}
              style={{
                flex: 1,
                textAlign: "left",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: fontSize.sm,
                color: colors.text,
              }}
            >
              {s.name}
            </button>
            <Button
              onClick={() => onDeleteStyle(s.id)}
              title="Remove named style"
              style={{ padding: "0 6px", fontSize: fontSize.sm }}
            >
              ✕
            </Button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 4, padding: "2px 10px" }}>
          <Input
            value={styleName}
            onChange={(e) => setStyleName(e.target.value)}
            placeholder="Name this style…"
            aria-label="Name this style"
            style={{ width: "auto", flex: 1 }}
          />
          <Button
            onClick={() => {
              if (styleName.trim()) {
                onSaveStyle(styleName.trim());
                setStyleName("");
              }
            }}
            style={{ fontSize: fontSize.sm }}
          >
            Save
          </Button>
        </div>
      </div>
    </Panel>
  );
}

// Unified per-node "topic info" panel: one side rail consolidating everything you can set on the
// selected node — note, markers, tags, style, and links (web / another map / another topic) —
// replacing the separate Notes / Markers / Style bars and the Link / Jump toolbar selects.
// The Info panel groups a topic's editors into three tabs: Details (tags/markers/progress/dates/
// priority/attachments/links), Style (shape & fill bar + stickers), and Notes (the markdown editor).
type InfoTab = "details" | "notes" | "style";
// Details holds markers/tags/task/links; the note editor gets its own roomy Notes tab (P3) so Details
// isn't one long scroll. Style stays the trailing tab.
const INFO_TABS: readonly TabItem[] = [
  {
    id: "details",
    label: "Details",
    title: "Markers, tags, progress, dates, priority, attachments & links",
  },
  { id: "notes", label: "Notes", title: "The selected topic's rich-text note" },
  { id: "style", label: "Style", title: "Shape, colour, font & stickers" },
];

export function InfoPanel({
  selected,
  selectedCount,
  fields,
  openNoteNonce,
  node,
  noteDraft,
  onNoteChange,
  onNoteBlur,
  onOpenLink,
  onExpandNote,
  markers,
  onToggleMarker,
  bulkMarkers,
  bulkTags,
  onBulkToggleMarker,
  onBulkToggleTag,
  onPickSticker,
  onStyle,
  onBranchColor,
  namedStyles,
  onAddTag,
  onRemoveTag,
  allTags,
  onSetProgress,
  onSetDue,
  onSetStart,
  onSetPriority,
  onAddAttachment,
  onRemoveAttachment,
  onSetHyperlink,
  onAddHyperlink,
  onRemoveHyperlink,
  maps,
  onLinkMap,
  jumpTargets,
  onJump,
  crossLinkMapId,
  crossLinkTopics,
  backlinks,
  outgoingLinks,
  onFollowBacklink,
  crossMapBacklinks,
  onFollowCrossMapBacklink,
  onMinimize,
  onSetFillImage,
  onClearFillImage,
  spellCheck,
  width,
  onResize,
  breadcrumb,
  facts,
  times,
}: {
  selected: SelectedNode | null;
  /** Number of nodes selected on the canvas; >1 puts the panel in bulk-edit mode. */
  selectedCount?: number;
  /** Per-field "mixed" summary of the selection (bulk mode) — a field whose selected topics disagree
   *  renders blank + a "Mixed" hint instead of the anchor's value. Ignored for a single selection. */
  fields?: SelectionFields | null;
  /** Bumped when a node's 📝 indicator is clicked — switches the panel to its Notes tab. */
  openNoteNonce?: number;
  /** Persisted inspector width (px) + the drag-resize callback. */
  width: number;
  onResize: (next: number) => void;
  /** Ancestor path (Root › Branch …) for the header; empty for root/floating. */
  breadcrumb?: string;
  /** Quick-facts line (outline no · depth · children · note size). */
  facts?: string;
  /** Second facts line: created / modified times (only when the node carries them). */
  times?: string;
  node: MapNode | null;
  noteDraft: string;
  onNoteChange: (value: string) => void;
  onNoteBlur: () => void;
  /** Follow an in-app note link (`#node=…` / `#map=…`) through the canvas. */
  onOpenLink?: (url: string) => void;
  /** Open the dockable note editor — the Notes tab's "expand for more room" target (P6). */
  onExpandNote?: () => void;
  markers: readonly string[];
  onToggleMarker: (marker: string) => void;
  /** Bulk mode: markers/tags on ALL vs SOME of the selection (tri-state chips). */
  bulkMarkers?: MarkerTagSummary;
  bulkTags?: MarkerTagSummary;
  /** Bulk mode: tri-state toggle a marker/tag across the whole selection (add-to-all / remove-from-all). */
  onBulkToggleMarker?: (marker: string) => void;
  onBulkToggleTag?: (tag: string) => void;
  onPickSticker: (sticker: Sticker) => void;
  onStyle: (patch: Partial<NodeStyle>) => void;
  /** Set the selected node's branch/connector colour (drives the StyleBar Branch colour picker). */
  onBranchColor?: (color: string) => void;
  /** Saved presets for the StyleBar quick-apply gallery (#15). */
  namedStyles?: NamedStyle[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  /** Every tag already used in the map — drives the Add-a-tag autocomplete (a `<datalist>`). */
  allTags?: readonly string[];
  onSetProgress: (progress: number | undefined) => void;
  onSetDue: (due: string) => void;
  onSetStart: (start: string) => void;
  onSetPriority: (priority: number | undefined) => void;
  onAddAttachment: (file: File) => void;
  onRemoveAttachment: (index: number) => void;
  onSetHyperlink: (url: string) => void;
  /** Append an additional link (beyond the primary hyperlink) to the selected node. */
  onAddHyperlink: (url: string) => void;
  /** Remove the additional link at `index` from the selected node's extras. */
  onRemoveHyperlink: (index: number) => void;
  maps: { id: string; title: string }[];
  onLinkMap: (mapId: string) => void;
  jumpTargets: { id: string; topic: string; depth: number }[];
  onJump: (id: string) => void;
  /** When the node's link points at another map, that map's id + its topics — for the cross-map
   *  "…and a topic" refine select (upgrades a whole-map link to `#map=X&node=Y`). */
  crossLinkMapId?: string | null;
  crossLinkTopics?: { id: string; topic: string; depth: number }[];
  /** Topics that point AT the selected node (incoming #node= links + relationship edges). */
  backlinks: Backlink[];
  /** Topics the selected node points at (its #node= hyperlink target + relationship edges from it). */
  outgoingLinks: OutgoingLink[];
  /** Navigate to a backlink's source node (focus + select it) — distinct from onJump, which creates
   *  an outgoing link. Reused for outgoing-link jumps (both just focus a node by id). */
  onFollowBacklink: (id: string) => void;
  /** Topics in OTHER maps that link to this map (incoming #map= references). */
  crossMapBacklinks?: CrossMapBacklink[];
  /** Open the source map + focus the linking node for a cross-map backlink. */
  onFollowCrossMapBacklink?: (mapId: string, nodeId: string) => void;
  onMinimize: () => void;
  /** Set / clear the topic's fill image (covers the whole card). */
  onSetFillImage?: (file: File) => void;
  onClearFillImage?: () => void;
  /** Native browser spell-check in the note editor (view setting; off by default). */
  spellCheck?: boolean;
}) {
  const [tagInput, setTagInput] = useState("");
  const [tab, setTab] = useState<InfoTab>(() => {
    // Restore the last-used inspector tab (best-effort) instead of always defaulting to Details.
    try {
      const v = localStorage.getItem("mindmap-info-tab");
      return v === "notes" || v === "style" ? v : "details";
    } catch {
      return "details";
    }
  });
  // Bulk mode: >1 node selected. The editors that apply cleanly across a set are shown — markers
  // (tri-state) + tags lead the Details tab, plus shape/colour/font, progress, dates, priority. The
  // genuinely per-item editors (notes, stickers, attachments, links) stay single-node.
  const multi = (selectedCount ?? 0) > 1;
  // In bulk mode, which task fields the selected topics disagree on — those render blank + "Mixed"
  // instead of (and without overwriting from) the anchor's value. Empty object for a single select.
  const mixed: Partial<SelectionFields["mixed"]> = multi ? (fields?.mixed ?? {}) : {};
  // The note editor is single-topic, so the Notes tab is dropped in bulk mode (and a stale "notes"
  // selection falls back to Details). (P3)
  const tabs = multi ? INFO_TABS.filter((t) => t.id !== "notes") : INFO_TABS;
  const activeTab: InfoTab = multi && tab === "notes" ? "details" : tab;
  // Clicking a node's 📝 indicator bumps openNoteNonce → jump to the Notes tab where the note lives.
  useEffect(() => {
    if (openNoteNonce) setTab("notes");
  }, [openNoteNonce]);
  // Persist the chosen tab (the underlying state, not the bulk-mode-derived value) so a reload reopens it.
  useEffect(() => {
    try {
      localStorage.setItem("mindmap-info-tab", tab);
    } catch {
      // best-effort
    }
  }, [tab]);
  const link = node?.hyperlink ?? "";
  // The URL field is for plain web links; #map= / #node= links are managed by the selects below.
  const webUrl = link.startsWith("#") ? "" : link;
  // A faint "Mixed" tag shown next to a bulk-edit control whose selected topics hold differing values.
  const mixedHint = (
    <span style={{ color: "var(--ed-faint)", fontSize: fontSize.sm, fontStyle: "italic" }}>
      Mixed
    </span>
  );
  const sectionLabel = (text: string) => <PanelSection>{text}</PanelSection>;

  // Task progress: parents with sub-tasks show an auto-rolled-up pie (read-only); a leaf (or an
  // undivided node) gets quarter-step buttons to set its own completion, plus a clear-task control.
  const renderProgress = (n: MapNode) => {
    // Bulk mode with differing progress values: force the editable-step view with no active step + a
    // "Mixed" hint (suppress the anchor's pie/active step so it can't imply one rolled-up value).
    const progressMixed = !!mixed.progress;
    const info = progressMixed ? null : nodeProgress(n);
    const derived = !progressMixed && hasTaskDescendants(n);
    const pct = info ? toPercent(info.progress) : null;
    return (
      <PropRow label="Progress">
        {derived ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
            }}
          >
            {info ? <ProgressPie fraction={info.progress} size={20} /> : null}
            <span style={{ color: "var(--ed-ink)", fontVariantNumeric: "tabular-nums" }}>
              {pct}% · {info?.done}/{info?.total} done
            </span>
            <span style={{ color: "var(--ed-faint)" }}>(auto)</span>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexWrap: "wrap",
            }}
          >
            {progressMixed ? (
              mixedHint
            ) : info ? (
              <ProgressPie fraction={info.progress} size={20} />
            ) : null}
            {[0, 25, 50, 75, 100].map((step) => {
              const active = pct === step;
              return (
                <Button
                  key={step}
                  active={active}
                  onClick={() => onSetProgress(step / 100)}
                  title={`Set task to ${step}% complete`}
                  style={{
                    padding: "1px 7px",
                    fontSize: fontSize.sm,
                    fontVariantNumeric: "tabular-nums",
                    // Inactive steps are white (not the default lilac control fill).
                    ...(active ? null : { background: colors.white, color: colors.text }),
                  }}
                >
                  {step}
                </Button>
              );
            })}
            {info ? (
              <Button
                onClick={() => onSetProgress(undefined)}
                title="Clear task status (remove the pie)"
                style={{ padding: "1px 7px", fontSize: fontSize.sm }}
              >
                ✕
              </Button>
            ) : null}
          </div>
        )}
      </PropRow>
    );
  };
  const aside = (
    <aside className="mm-inspector" aria-label="Topic info" style={{ width }}>
      <InspectorResizer width={width} onResize={onResize} />
      <div className="mm-inspector-head">
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 600,
              color: "var(--ed-ink)",
            }}
          >
            ℹ {node ? node.topic || "(untitled)" : "Topic info"}
          </span>
          <button
            type="button"
            className="mm-inspector-min"
            onClick={onMinimize}
            title="Minimize — collapse to the right edge"
            aria-label="Minimize topic info"
          >
            ›
          </button>
        </div>
        {node && !multi && (breadcrumb || facts || times) ? (
          <div style={{ marginTop: 4 }}>
            {breadcrumb ? (
              <div className="mm-inspector-path" title={breadcrumb}>
                {breadcrumb}
              </div>
            ) : null}
            {facts ? (
              <div className="mm-inspector-path" style={{ marginTop: 1 }}>
                {facts}
              </div>
            ) : null}
            {times ? (
              <div className="mm-inspector-path" style={{ marginTop: 1 }}>
                {times}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {!node ? (
        <div style={{ padding: "8px 16px", fontSize: fontSize.md, color: "var(--ed-faint)" }}>
          Select a node to see and edit its details.
        </div>
      ) : (
        <>
          <Tabs
            tabs={tabs}
            active={activeTab}
            onChange={(id) => setTab(id as InfoTab)}
            ariaLabel="Topic info sections"
            idBase="topic-info"
          />
          {
            <div
              role="tabpanel"
              id={tabPanelId("topic-info", activeTab)}
              aria-labelledby={tabId("topic-info", activeTab)}
              style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
            >
              {multi && (
                <div
                  style={{
                    margin: "8px 10px 2px",
                    padding: "6px 10px",
                    borderRadius: radius.md,
                    background: "var(--ed-accent-tint)",
                    color: "var(--ed-ink)",
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {selectedCount} topics selected — changes apply to all
                  <div
                    style={{
                      fontWeight: fontWeight.normal,
                      fontSize: fontSize.xs,
                      marginTop: 3,
                      color: "var(--ed-ink2)",
                    }}
                  >
                    Per-topic fields (note, links, attachments) are hidden — select one topic to
                    edit them.
                  </div>
                </div>
              )}
              {activeTab === "style" && (
                <>
                  <StyleBar
                    onStyle={onStyle}
                    onBranchColor={onBranchColor}
                    namedStyles={namedStyles}
                    wrapWidth={node?.style?.maxWidth}
                    textColor={node?.style?.color}
                    fillColor={node?.style?.background}
                    branchColor={node?.branchColor}
                    style={multi ? undefined : node?.style}
                  />
                  {!multi && (
                    // Markers lead the Details tab in single + bulk; Style keeps the per-item sticker
                    // grid + fill image (both single-node).
                    <>
                      <StickerBar onPick={onPickSticker} />
                      {onSetFillImage ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                          }}
                        >
                          <label style={{ ...styleBtn, fontSize: fontSize.sm, cursor: "pointer" }}>
                            Fill image…
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                if (f) onSetFillImage(f);
                              }}
                            />
                          </label>
                          {node?.style?.fillImage && onClearFillImage ? (
                            <button
                              type="button"
                              onClick={onClearFillImage}
                              title="Remove the fill image"
                              style={{ ...styleBtn, fontSize: fontSize.sm }}
                            >
                              Clear fill image
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </>
              )}
              {activeTab === "notes" && (
                // Single-topic only (the tab is hidden in bulk) — the editor gets the whole tab with no
                // 168px clamp, roomy by design (P3).
                <div style={{ display: "flex", flexDirection: "column", minHeight: 320 }}>
                  {onExpandNote ? (
                    <button
                      type="button"
                      onClick={onExpandNote}
                      title="Open this note in the dockable editor for more room"
                      style={{
                        alignSelf: "flex-end",
                        margin: "2px 8px 4px",
                        padding: "2px 8px",
                        fontSize: fontSize.sm,
                        background: "none",
                        border: "1px solid var(--ed-border)",
                        borderRadius: radius.md,
                        color: "var(--ed-ink2)",
                        cursor: "pointer",
                      }}
                    >
                      ⤢ Open in dock
                    </button>
                  ) : null}
                  <NotesPanel
                    selected={selected}
                    value={noteDraft}
                    onChange={onNoteChange}
                    onBlur={onNoteBlur}
                    onOpenLink={onOpenLink}
                    spellCheck={spellCheck}
                  />
                </div>
              )}
              {activeTab === "details" && (
                <>
                  {multi && onBulkToggleMarker ? (
                    // Bulk: tri-state markers lead Details too (lit = on all, dashed = on some), so the
                    // control set doesn't reshuffle between single and multi select.
                    <>
                      {sectionLabel("Markers")}
                      <MarkerBar
                        markers={markers}
                        active={bulkMarkers?.all}
                        partial={bulkMarkers?.some}
                        onToggle={onBulkToggleMarker}
                      />
                    </>
                  ) : null}
                  {!multi && (
                    <>
                      {/* Markers lead Details; the note moved to its own Notes tab (P3). */}
                      {sectionLabel("Markers")}
                      <MarkerBar markers={markers} active={node.icons} onToggle={onToggleMarker} />
                      {(() => {
                        const suggested = suggestNewMarkers(node.topic, node.icons ?? []);
                        return suggested.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              flexWrap: "wrap",
                              padding: "0 10px 4px",
                            }}
                          >
                            <span style={{ fontSize: fontSize.xs, color: "var(--ed-faint)" }}>
                              Suggested:
                            </span>
                            {suggested.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => onToggleMarker(m)}
                                title={`Add ${m} (suggested from the topic text)`}
                                style={{
                                  border: "1px dashed var(--ed-accent)",
                                  background: "var(--ed-card)",
                                  borderRadius: radius.md,
                                  cursor: "pointer",
                                  fontSize: fontSize.lg,
                                  lineHeight: 1,
                                  padding: "2px 5px",
                                }}
                              >
                                {markerImage(m) ? (
                                  <img
                                    src={markerImage(m) as string}
                                    alt={m}
                                    width={16}
                                    height={16}
                                    style={{ display: "block" }}
                                  />
                                ) : (
                                  m
                                )}
                              </button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                      {sectionLabel("Tags")}
                      <div
                        style={{ padding: "0 10px 4px", display: "flex", flexWrap: "wrap", gap: 4 }}
                      >
                        {(node.tags ?? []).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => onRemoveTag(t)}
                            title={`Remove tag "${t}"`}
                            style={{
                              border: "1px solid var(--ed-border)",
                              background: "var(--ed-card)",
                              borderRadius: radius.md,
                              cursor: "pointer",
                              fontSize: fontSize.sm,
                              padding: "1px 6px",
                              color: "var(--ed-ink)",
                            }}
                          >
                            {t} ✕
                          </button>
                        ))}
                      </div>
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && tagInput.trim()) {
                            onAddTag(tagInput.trim());
                            setTagInput("");
                          }
                        }}
                        list={allTags && allTags.length > 0 ? "mm-tag-suggestions" : undefined}
                        placeholder="Add a tag, press Enter"
                        aria-label="Add a tag"
                        style={{ width: "auto", margin: "0 10px 4px" }}
                      />
                      {allTags && allTags.length > 0 ? (
                        <datalist id="mm-tag-suggestions">
                          {allTags.map((t) => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
                      ) : null}
                    </>
                  )}

                  {multi && bulkTags && onBulkToggleTag ? (
                    <>
                      {sectionLabel("Tags")}
                      <div
                        style={{ padding: "0 10px 4px", display: "flex", flexWrap: "wrap", gap: 4 }}
                      >
                        {bulkTags.all.map((t) => (
                          <button
                            key={`all:${t}`}
                            type="button"
                            onClick={() => onBulkToggleTag(t)}
                            title={`"${t}" is on all selected topics — click to remove from all`}
                            style={{
                              border: "1px solid var(--ed-accent)",
                              background: "var(--ed-accent-tint)",
                              borderRadius: radius.md,
                              cursor: "pointer",
                              fontSize: fontSize.sm,
                              padding: "1px 6px",
                              color: "var(--ed-ink)",
                            }}
                          >
                            {t} ✕
                          </button>
                        ))}
                        {bulkTags.some.map((t) => (
                          <button
                            key={`some:${t}`}
                            type="button"
                            onClick={() => onBulkToggleTag(t)}
                            title={`"${t}" is on some selected topics — click to add to all`}
                            style={{
                              border: "1px dashed var(--ed-accent)",
                              background: "var(--ed-card)",
                              borderRadius: radius.md,
                              cursor: "pointer",
                              fontSize: fontSize.sm,
                              padding: "1px 6px",
                              color: "var(--ed-muted)",
                              opacity: 0.7,
                            }}
                          >
                            {t} +
                          </button>
                        ))}
                        {bulkTags.all.length === 0 && bulkTags.some.length === 0 ? (
                          <span style={{ fontSize: fontSize.sm, color: "var(--ed-faint)" }}>
                            No tags on the selection
                          </span>
                        ) : null}
                      </div>
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && tagInput.trim()) {
                            onBulkToggleTag(tagInput.trim());
                            setTagInput("");
                          }
                        }}
                        placeholder="Add a tag to all, press Enter"
                        aria-label="Add a tag to all selected"
                        style={{ width: "auto", margin: "0 10px 4px" }}
                      />
                    </>
                  ) : null}

                  {renderProgress(node)}

                  <PropRow label="Dates">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                        fontSize: fontSize.sm,
                        color: "var(--ed-muted)",
                      }}
                    >
                      {/* biome-ignore lint/a11y/noLabelWithoutControl: NaturalDateInput renders a real
                        <input> inside, so the label associates with it at runtime (biome can't see
                        through the component); the input also self-labels via ariaLabel. */}
                      <label style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        Start
                        <NaturalDateInput
                          key={`${node.id}:start${mixed.start ? ":mixed" : ""}`}
                          value={node.task?.start ?? ""}
                          mixed={mixed.start}
                          onSet={onSetStart}
                          ariaLabel="Start date"
                        />
                        {mixed.start ? mixedHint : null}
                      </label>
                      {/* biome-ignore lint/a11y/noLabelWithoutControl: see the Start label above. */}
                      <label style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        Due
                        <NaturalDateInput
                          key={`${node.id}:due${mixed.due ? ":mixed" : ""}`}
                          value={node.task?.due ?? ""}
                          mixed={mixed.due}
                          onSet={onSetDue}
                          ariaLabel="Due date"
                        />
                        {mixed.due ? mixedHint : null}
                      </label>
                    </div>
                  </PropRow>

                  <PropRow label="Priority">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      {mixed.priority ? mixedHint : null}
                      {PRIORITY_LEVELS.map((p) => {
                        const active = !mixed.priority && node.task?.priority === p;
                        return (
                          <Button
                            key={p}
                            className="mm-keep-color"
                            onClick={() => onSetPriority(p)}
                            title={`${priorityLabel(p)} priority`}
                            style={{
                              padding: "1px 8px",
                              fontSize: fontSize.sm,
                              fontWeight: fontWeight.semibold,
                              // Priority keeps its own semantic colour scale in every theme (opted out
                              // of the inspector's accent re-theme via mm-keep-color).
                              background: active ? PRIORITY_COLOR[p] : "var(--ed-card)",
                              color: active ? "#fff" : PRIORITY_COLOR[p],
                              border: `1px solid ${PRIORITY_COLOR[p]}`,
                            }}
                          >
                            {priorityLabel(p)}
                          </Button>
                        );
                      })}
                      {node.task?.priority ? (
                        <Button
                          onClick={() => onSetPriority(undefined)}
                          title="Clear priority"
                          style={{ padding: "1px 7px", fontSize: fontSize.sm }}
                        >
                          ✕
                        </Button>
                      ) : null}
                    </div>
                  </PropRow>

                  {!multi && (
                    <>
                      <CollapsibleSection
                        key={`att:${node.id}`}
                        label="Attachments"
                        count={(node.attachments ?? []).length}
                      >
                        <div
                          style={{
                            padding: "0 10px 6px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          {(node.attachments ?? []).map((a, i) => (
                            <div
                              key={`${a.name}:${i}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: fontSize.sm,
                              }}
                            >
                              <a
                                href={a.dataUrl}
                                download={a.name}
                                title={`Download ${a.name}`}
                                style={{
                                  color: "var(--ed-ink)",
                                  flex: 1,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                📎 {a.name}
                              </a>
                              <span style={{ color: "var(--ed-faint)" }}>
                                {formatBytes(a.size)}
                              </span>
                              <Button
                                onClick={() => onRemoveAttachment(i)}
                                title="Remove attachment"
                                style={{ padding: "1px 6px", fontSize: fontSize.sm }}
                              >
                                ✕
                              </Button>
                            </div>
                          ))}
                          <label
                            style={{
                              ...controlStyle,
                              fontSize: fontSize.sm,
                              cursor: "pointer",
                              textAlign: "center",
                              background: "var(--ed-card)",
                              border: "1px solid var(--ed-border)",
                              color: "var(--ed-ink2)",
                            }}
                          >
                            + Attach file
                            <input
                              type="file"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) onAddAttachment(f);
                                e.target.value = "";
                              }}
                              style={{ display: "none" }}
                            />
                          </label>
                        </div>
                      </CollapsibleSection>

                      <CollapsibleSection
                        key={`links:${node.id}`}
                        label="Links"
                        count={(link ? 1 : 0) + (node.hyperlinks?.length ?? 0)}
                      >
                        <Input
                          key={`${node.id}:url`}
                          defaultValue={webUrl}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              onSetHyperlink((e.target as HTMLInputElement).value.trim());
                          }}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== webUrl) onSetHyperlink(v);
                          }}
                          placeholder="Link (https://, mailto:, tel:…)"
                          aria-label="Web link"
                          style={{ width: "auto", margin: "0 10px 4px" }}
                        />
                        <Select
                          value=""
                          onChange={(e) => e.target.value && onLinkMap(e.target.value)}
                          aria-label="Link to another map"
                          style={{ width: "auto", margin: "0 10px 4px" }}
                        >
                          <option value="">🔗 Link to a map…</option>
                          {maps.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.title}
                            </option>
                          ))}
                        </Select>
                        <Select
                          value=""
                          onChange={(e) => e.target.value && onJump(e.target.value)}
                          aria-label="Jump to another topic"
                          style={{ width: "auto", margin: "0 10px 4px" }}
                        >
                          <option value="">↪ Jump to a topic…</option>
                          {jumpTargets.map((row) => (
                            <option key={row.id} value={row.id}>
                              {`${"  ".repeat(row.depth)}${row.topic || "(untitled)"}`}
                            </option>
                          ))}
                        </Select>
                        {crossLinkMapId && crossLinkTopics && crossLinkTopics.length > 0 && (
                          <Select
                            value=""
                            onChange={(e) =>
                              onSetHyperlink(
                                buildMapLink(crossLinkMapId, e.target.value || undefined),
                              )
                            }
                            aria-label="Focus a topic in the linked map"
                            style={{ width: "auto", margin: "0 10px 4px" }}
                          >
                            <option value="">🗺 …and a topic (whole map)</option>
                            {crossLinkTopics.map((row) => (
                              <option key={row.id} value={row.id}>
                                {`${"  ".repeat(row.depth)}${row.topic || "(untitled)"}`}
                              </option>
                            ))}
                          </Select>
                        )}
                        {link && (
                          <Button
                            onClick={() => onSetHyperlink("")}
                            style={{
                              padding: "2px 8px",
                              fontSize: fontSize.sm,
                              margin: "0 10px 6px",
                            }}
                          >
                            ✕ Remove link (
                            {link.startsWith("#map=")
                              ? "map"
                              : link.startsWith("#node=")
                                ? "topic"
                                : "web"}
                            )
                          </Button>
                        )}
                        {/* Additional links beyond the primary — a topic can point at more than one
                            place. The primary above stays canonical (canvas 🔗 + exporters); these are
                            managed here and picked up by search + the backlink scans. */}
                        <div
                          style={{
                            margin: "2px 10px 0",
                            paddingTop: 6,
                            borderTop: "1px solid var(--ed-divider, #efece4)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: fontSize.sm,
                              color: colors.faint,
                              marginBottom: 4,
                            }}
                          >
                            Additional links
                          </div>
                          {(node.hyperlinks ?? []).map((h, i) => (
                            <div
                              key={h}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 4,
                              }}
                            >
                              {onOpenLink ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenLink(h)}
                                  title={`Open ${h}`}
                                  style={{
                                    ...listRow,
                                    padding: 0,
                                    color: colors.accent,
                                    textDecoration: "underline",
                                  }}
                                >
                                  {h}
                                </button>
                              ) : (
                                <span
                                  title={h}
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontSize: fontSize.md,
                                  }}
                                >
                                  {h}
                                </span>
                              )}
                              <Button
                                onClick={() => onRemoveHyperlink(i)}
                                title="Remove this link"
                                aria-label={`Remove additional link ${h}`}
                                style={{ padding: "0 6px", fontSize: fontSize.sm }}
                              >
                                ✕
                              </Button>
                            </div>
                          ))}
                          <Input
                            key={`${node.id}:addlink`}
                            defaultValue=""
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const el = e.target as HTMLInputElement;
                                const v = el.value.trim();
                                if (v) {
                                  onAddHyperlink(v);
                                  el.value = "";
                                }
                              }
                            }}
                            placeholder="Add another link + Enter"
                            aria-label="Add another link"
                            style={{ width: "auto", marginBottom: 6 }}
                          />
                        </div>
                      </CollapsibleSection>

                      {backlinks.length > 0 && (
                        <CollapsibleSection
                          key={`backlinks:${node.id}`}
                          label="Linked from"
                          count={backlinks.length}
                        >
                          <div
                            style={{
                              padding: "0 10px 6px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            {backlinks.map((b) => (
                              <button
                                key={`${b.kind}:${b.id}`}
                                type="button"
                                onClick={() => onFollowBacklink(b.id)}
                                title={`Go to "${b.topic || "(untitled)"}"`}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  textAlign: "left",
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  fontSize: fontSize.sm,
                                  color: "var(--ed-ink)",
                                  padding: "2px 4px",
                                  borderRadius: radius.md,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                <span style={{ color: "var(--ed-faint)" }}>
                                  {b.kind === "relationship" ? "↬ " : "↪ "}
                                </span>
                                {b.topic || "(untitled)"}
                                {b.label ? (
                                  <span style={{ color: "var(--ed-faint)" }}> — {b.label}</span>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </CollapsibleSection>
                      )}

                      {outgoingLinks.length > 0 && (
                        <CollapsibleSection
                          key={`outgoing:${node.id}`}
                          label="Links to"
                          count={outgoingLinks.length}
                        >
                          <div
                            style={{
                              padding: "0 10px 6px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            {outgoingLinks.map((b) => (
                              <button
                                key={`${b.kind}:${b.id}`}
                                type="button"
                                onClick={() => onFollowBacklink(b.id)}
                                title={`Go to "${b.topic || "(untitled)"}"`}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  textAlign: "left",
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  fontSize: fontSize.sm,
                                  color: "var(--ed-ink)",
                                  padding: "2px 4px",
                                  borderRadius: radius.md,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                <span style={{ color: "var(--ed-faint)" }}>
                                  {b.kind === "relationship" ? "↬ " : "↪ "}
                                </span>
                                {b.topic || "(untitled)"}
                                {b.label ? (
                                  <span style={{ color: "var(--ed-faint)" }}> — {b.label}</span>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </CollapsibleSection>
                      )}

                      {crossMapBacklinks && crossMapBacklinks.length > 0 && (
                        <CollapsibleSection
                          key={`xmap:${node.id}`}
                          label="Linked from other maps"
                          count={crossMapBacklinks.length}
                        >
                          <div
                            style={{
                              padding: "0 10px 6px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            {crossMapBacklinks.map((b) => (
                              <button
                                key={`${b.sourceMapId}:${b.id}`}
                                type="button"
                                onClick={() => onFollowCrossMapBacklink?.(b.sourceMapId, b.id)}
                                title={`Go to "${b.topic || "(untitled)"}" in ${b.sourceMapTitle}`}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  textAlign: "left",
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  fontSize: fontSize.sm,
                                  color: "var(--ed-ink)",
                                  padding: "2px 4px",
                                  borderRadius: radius.md,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                <span style={{ color: "var(--ed-faint)" }}>🗺 </span>
                                {b.topic || "(untitled)"}
                                <span style={{ color: "var(--ed-faint)" }}>
                                  {" "}
                                  — {b.sourceMapTitle}
                                </span>
                              </button>
                            ))}
                          </div>
                        </CollapsibleSection>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          }
        </>
      )}
    </aside>
  );
  return aside;
}

/** A dockable, full-height note editor in the left rail — the same NotesPanel the inspector embeds,
 *  given more room (for knowledge maps with long notes). Bound to the same note draft + handlers. */
export function NoteEditorPanel({
  selected,
  value,
  onChange,
  onBlur,
  onClose,
  onOpenLink,
  spellCheck = false,
}: {
  selected: SelectedNode | null;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onClose: () => void;
  onOpenLink?: (url: string) => void;
  spellCheck?: boolean;
}) {
  return (
    <Panel width={320} style={{ minHeight: 0 }}>
      {selected ? (
        <NotesPanel
          selected={selected}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onClose={onClose}
          onOpenLink={onOpenLink}
          cue="The selected topic's note — the same note as the inspector's Notes tab, docked here for more room."
          spellCheck={spellCheck}
        />
      ) : (
        <>
          <div style={{ ...panelTitle, display: "flex", justifyContent: "space-between" }}>
            <span>📝 Note editor</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close note editor"
              style={{ ...styleBtn, fontSize: fontSize.sm }}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: "4px 14px", fontSize: fontSize.sm, color: colors.faint }}>
            Select a topic to edit its note here.
          </div>
        </>
      )}
    </Panel>
  );
}

export function NotesPanel({
  selected,
  value,
  onChange,
  onBlur,
  onClose,
  onOpenLink,
  cue,
  spellCheck = false,
}: {
  selected: SelectedNode | null;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  /** Optional — when omitted (e.g. embedded in the Info panel) the Close button is hidden. */
  onClose?: () => void;
  /** Follow an in-app note link (`#node=…` / `#map=…`) — the app routes it through the canvas. */
  onOpenLink?: (url: string) => void;
  /** Optional faint sub-line under the header — used by the dockable panel to flag that it's the same
   *  note as the inspector's Notes tab (P6). */
  cue?: string;
  /** Native browser spell-check in the note editor (view setting; off by default). */
  spellCheck?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // The editor is an uncontrolled contentEditable: set its HTML imperatively only when the note
  // arrives from elsewhere (a different node / external edit) AND the editor isn't focused — writing
  // innerHTML while typing would reset the caret. On input we serialise HTML→markdown and report up,
  // but never push that back into the DOM while focused.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-sync only on note/selection change
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const html = renderNote(value);
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [value, selected?.id]);

  const serialize = () => {
    if (ref.current) onChange(htmlToNote(ref.current.innerHTML));
  };
  // Paste as PLAIN TEXT only: never let pasted HTML (which can carry <img onerror=…> or other active
  // markup) enter the live contentEditable, where the browser would run it. The note is markdown-backed,
  // so typed formatting still works; only the paste path is constrained.
  const onPaste = (e: ReactClipboardEvent<HTMLDivElement>) => {
    e.preventDefault(); // block the default rich paste regardless — pasted HTML must never enter the DOM
    const text = e.clipboardData.getData("text/plain");
    if (typeof document.execCommand === "function") document.execCommand("insertText", false, text);
    serialize();
  };
  const exec = (command: string) => {
    ref.current?.focus();
    // Prefer semantic tags (<b>/<i>) over inline-style spans so the serialiser stays simple.
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(command);
    serialize();
  };
  // Append a markdown block (image / table) to the note and re-render. Done at the markdown layer
  // rather than via execCommand so it works reliably (no native table command) and round-trips through
  // renderNote/htmlToNote — a freshly inserted block renders immediately as an image/table.
  const appendBlock = (snippet: string) => {
    const cur = ref.current ? htmlToNote(ref.current.innerHTML) : value;
    const sep = cur ? (cur.endsWith("\n") ? "\n" : "\n\n") : "";
    const next = `${cur}${sep}${snippet}`;
    onChange(next);
    if (ref.current) ref.current.innerHTML = renderNote(next);
  };
  const insertImage = async () => {
    const url = (
      await editorPrompt({
        title: "Insert image",
        label: "Image URL",
        placeholder: "https://… or data:image/…",
      })
    )?.trim();
    if (!url || !/^(https?:\/\/|data:image\/)/i.test(url)) return;
    appendBlock(`![](${url})`);
  };
  // Insert an inline link. With text selected, wrap it (createLink → <a>, which htmlToNote serialises
  // to [text](url)); with nothing selected, append the URL as its own markdown link. The selection is
  // captured + restored because opening the prompt dialog drops it. The renderer already round-trips links —
  // this just gives the capability a button (matching image/table) instead of hand-typed markdown.
  const insertLink = async () => {
    const sel = window.getSelection();
    const range =
      sel && sel.rangeCount > 0 && !sel.isCollapsed ? sel.getRangeAt(0).cloneRange() : null;
    const hasText = !!range && range.toString().trim().length > 0;
    const url = (
      await editorPrompt({
        title: "Insert link",
        label: "Link URL",
        placeholder: "https://… or mailto:…",
      })
    )?.trim();
    if (!url || !/^(https?:\/\/|mailto:|#)/i.test(url)) return;
    ref.current?.focus();
    if (hasText && range) {
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(range); // restore the selection the prompt may have cleared
      document.execCommand("createLink", false, url);
      serialize();
    } else {
      appendBlock(`[${url}](${url})`);
    }
  };
  const insertTable = () =>
    appendBlock("| Column A | Column B |\n| --- | --- |\n| Cell 1 | Cell 2 |");
  // Block-level formatting (headings, code block) via the native formatBlock command — its <h1>/<pre>
  // output round-trips through htmlToNote, so the note stays plain markdown.
  const execBlock = (tag: string) => {
    ref.current?.focus();
    document.execCommand("formatBlock", false, tag);
    serialize();
  };
  // Highlight: wrap the current selection in <mark> (no execCommand for it). Serialises to ==text==.
  const highlight = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const mark = document.createElement("mark");
    try {
      sel.getRangeAt(0).surroundContents(mark);
    } catch {
      return; // selection crossed element boundaries — leave it untouched
    }
    serialize();
  };
  const insertChecklist = () => appendBlock("- [ ] To-do\n- [ ] To-do");
  const tbBtn = {
    padding: "2px 8px",
    fontSize: fontSize.sm,
    background: colors.white,
    color: colors.text,
  } as const;
  const fmtBtns = [
    { cmd: "bold", label: <b>B</b>, title: "Bold (Ctrl+B)" },
    { cmd: "italic", label: <i>I</i>, title: "Italic (Ctrl+I)" },
    { cmd: "strikeThrough", label: <s>S</s>, title: "Strikethrough" },
    { cmd: "insertUnorderedList", label: "• List", title: "Bulleted list" },
    { cmd: "insertOrderedList", label: "1. List", title: "Numbered list" },
  ];

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px 16px",
        borderTop: "1px solid var(--ed-divider)",
        background: "transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: fontSize.sm,
          color: "var(--ed-muted)",
        }}
      >
        <span>📝 Note{selected ? ` — ${selected.topic}` : ""}</span>
        {onClose && (
          <Button onClick={onClose} style={{ padding: "2px 8px", fontSize: fontSize.sm }}>
            Close
          </Button>
        )}
      </div>
      {cue ? (
        <div style={{ padding: "0 14px 4px", fontSize: 11.5, color: "var(--ed-faint)" }}>{cue}</div>
      ) : null}
      {selected ? (
        <>
          <div
            role="toolbar"
            aria-label="Note formatting"
            style={{ display: "flex", flexWrap: "wrap", gap: 4, rowGap: 4 }}
          >
            {fmtBtns.map((b) => (
              <Button
                key={b.cmd}
                // Keep the selection in the editor — don't let the button steal focus before exec.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec(b.cmd)}
                title={b.title}
                style={{
                  padding: "2px 8px",
                  fontSize: fontSize.sm,
                  background: colors.white,
                  color: colors.text,
                }}
              >
                {b.label}
              </Button>
            ))}
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execBlock("<h1>")}
              title="Heading 1"
              style={tbBtn}
            >
              H1
            </Button>
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execBlock("<h2>")}
              title="Heading 2"
              style={tbBtn}
            >
              H2
            </Button>
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execBlock("<h3>")}
              title="Heading 3"
              style={tbBtn}
            >
              H3
            </Button>
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={highlight}
              title="Highlight selection"
              style={tbBtn}
            >
              <mark>H</mark>
            </Button>
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execBlock("<pre>")}
              title="Code block"
              style={tbBtn}
            >
              {"</>"}
            </Button>
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={insertChecklist}
              title="Checklist"
              style={tbBtn}
            >
              ☑ List
            </Button>
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={insertLink}
              title="Insert link (wraps the selected text)"
              style={tbBtn}
            >
              🔗 Link
            </Button>
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={insertImage}
              title="Insert image (by URL)"
              style={tbBtn}
            >
              🖼 Image
            </Button>
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={insertTable}
              title="Insert table"
              style={{
                padding: "2px 8px",
                fontSize: fontSize.sm,
                background: colors.white,
                color: colors.text,
              }}
            >
              ▦ Table
            </Button>
          </div>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: contentEditable note editor — the onClick only reroutes in-app links through the canvas; the same targets stay keyboard-reachable via the inspector's Links section + the Outline jumps. */}
          <div
            ref={ref}
            className="mm-note-editor"
            contentEditable
            suppressContentEditableWarning
            spellCheck={spellCheck}
            role="textbox"
            tabIndex={0}
            aria-multiline="true"
            aria-label="Node note"
            data-placeholder="Add a note… headings, highlight, code, lists, links, images & tables"
            onInput={serialize}
            onPaste={onPaste}
            onBlur={onBlur}
            onClick={(e) => {
              // Follow an in-app note link through the canvas (a topic jump / cross-map link) rather
              // than letting the browser navigate. getAttribute keeps the decoded `#…` form.
              const a = (e.target as HTMLElement).closest?.("a.mm-inote-link");
              if (a && onOpenLink) {
                e.preventDefault();
                onOpenLink(a.getAttribute("href") ?? "");
              }
            }}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              border: "1px solid var(--ed-border)",
              borderRadius: radius.lg,
              padding: "6px 10px",
              fontSize: fontSize.md,
              color: "var(--ed-ink)",
              background: "var(--ed-card)",
              outline: "none",
            }}
          />
        </>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            color: "var(--ed-faint)",
            fontSize: fontSize.md,
          }}
        >
          Select a node to add or edit its note.
        </div>
      )}
    </div>
  );
}

// A grid of built-in inline-SVG stickers; clicking one sets it as the selected node's image (it
// then flows through the existing node-image render + export pipeline). Lives in the Info panel
// next to the Markers bar — markers are tiny emoji glyphs, stickers are a larger picture on the node.
export function StickerBar({ onPick }: { onPick: (sticker: Sticker) => void }) {
  const [query, setQuery] = useState("");
  const stickerBtn = (s: Sticker) => (
    <button
      key={s.id}
      type="button"
      onClick={() => onPick(s)}
      title={`Add the ${s.label} sticker to this node`}
      aria-label={`Add ${s.label} sticker`}
      style={{
        width: 30,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--ed-border)",
        background: "var(--ed-card)",
        borderRadius: radius.md,
        cursor: "pointer",
        padding: 3,
      }}
    >
      <img src={stickerDataUrl(s)} alt="" width={22} height={22} style={{ display: "block" }} />
    </button>
  );
  const grid = (items: Sticker[]) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 10px 6px" }}>
      {items.map(stickerBtn)}
    </div>
  );
  const q = query.trim();
  const results = q ? searchStickers(q) : [];
  return (
    <>
      <PanelSection>Stickers</PanelSection>
      <div style={{ padding: "0 10px 4px" }}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a sticker…"
          aria-label="Search stickers"
          style={{ width: "auto" }}
        />
      </div>
      {q ? (
        results.length > 0 ? (
          grid(results)
        ) : (
          <div style={{ padding: "0 10px 6px", fontSize: fontSize.sm, color: colors.faint }}>
            No stickers match.
          </div>
        )
      ) : (
        // No query → browse by category, each under a small heading.
        stickerCategories().map((g) => (
          <div key={g.category}>
            <div
              style={{
                padding: "0 10px 2px",
                fontSize: fontSize.sm,
                color: colors.muted,
                fontWeight: fontWeight.semibold,
              }}
            >
              {g.category}
            </div>
            {grid(g.stickers)}
          </div>
        ))
      )}
    </>
  );
}

export function MarkerBar({
  markers,
  active,
  partial,
  onToggle,
}: {
  markers: readonly string[];
  /** Markers currently on the selected node (or on ALL selected, in bulk) — shown lit. */
  active?: readonly string[];
  /** Bulk mode only: markers on SOME of the selection — shown as a dashed "partial" chip. */
  partial?: readonly string[];
  onToggle: (marker: string) => void;
}) {
  const [query, setQuery] = useState("");
  // No query → the curated default palette; otherwise the searched superset (by name / keyword / glyph).
  const shown = query.trim() ? searchMarkers(query) : markers;
  return (
    <div style={{ ...barRow, gap: 4 }}>
      <span style={{ fontSize: fontSize.sm, color: "var(--ed-muted)", marginRight: 4 }}>
        Markers:
      </span>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find a marker…"
        aria-label="Search markers"
        style={{
          ...inputStyle,
          width: 110,
          padding: "2px 6px",
          fontSize: fontSize.sm,
          marginRight: 2,
        }}
      />
      {query.trim() && shown.length === 0 && (
        <span style={{ fontSize: fontSize.sm, color: "var(--ed-muted)" }}>No markers</span>
      )}
      {shown.map((marker) => {
        const on = active?.includes(marker);
        const some = !on && partial?.includes(marker);
        return (
          <button
            key={marker}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(MARKER_DND_TYPE, marker);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onToggle(marker)}
            aria-pressed={on}
            title={
              some
                ? `${marker} is on some selected topics — click to add to all`
                : `Toggle ${marker} on the selected topic(s) — or drag it onto any topic`
            }
            style={{
              border: `1px ${some ? "dashed" : "solid"} ${on || some ? "var(--ed-accent)" : "var(--ed-border)"}`,
              background: on ? "var(--ed-accent-tint)" : "var(--ed-card)",
              borderRadius: radius.md,
              cursor: "pointer",
              fontSize: fontSize.xl,
              lineHeight: 1,
              padding: "3px 5px",
              opacity: some ? 0.6 : 1,
            }}
          >
            {markerImage(marker) ? (
              <img
                src={markerImage(marker) as string}
                alt={marker}
                width={18}
                height={18}
                style={{ display: "block" }}
              />
            ) : (
              marker
            )}
          </button>
        );
      })}
    </div>
  );
}
