import {
  type CSSProperties,
  type ClipboardEvent as ReactClipboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { ProgressPie } from "./ProgressPie";
import { InspectorResizer } from "./components/InspectorResizer";
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
import { type DueMode, type FilterCriteria, type SavedFilter, describeCriteria } from "./filter";
import { markerImage, searchMarkers } from "./icons";
import { formatBytes } from "./io/attachment";
import { suggestNewMarkers } from "./markerSuggest";
import {
  MARKER_DND_TYPE,
  type MarkerTagSummary,
  type SelectedNode,
  type SelectionFields,
} from "./mindmap";
import { shapeOverlayPath, shapePath } from "./mindmap/flow/shapes";
import type {
  ConditionalRule,
  MapNode,
  MindMapDoc,
  NodeShape,
  NodeStyle,
  NumberStyle,
} from "./model/types";
import { htmlToNote, renderNote } from "./noteFormat";
import {
  type Backlink,
  type IndexEntry,
  type IndexHit,
  markerTagIndex,
  outlineDropWhere,
  outlineNumbers,
  outlineRows,
} from "./outline";
import { PRIORITY_COLOR, PRIORITY_LABEL, PRIORITY_LEVELS } from "./priority";
import { hasTaskDescendants, nodeProgress, toPercent } from "./progress";
import { describeRule } from "./rules";
import { mapStats } from "./stats";
import { STICKERS, type Sticker, stickerDataUrl } from "./stickers";
import type { VersionMeta } from "./store/mapStore";
import { controlStyle, inputStyle, timeAgo } from "./ui";

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

// Per-topic styling bar: shape, fill, border, bold — applied to the selected node.
export function StyleBar({
  onStyle,
  namedStyles = [],
}: {
  onStyle: (patch: Partial<NodeStyle>) => void;
  /** Saved presets surfaced as a quick-apply swatch gallery (#15); empty = no Presets row. */
  namedStyles?: NamedStyle[];
}) {
  const swatch = (color: string, onClick: () => void, title: string) => (
    <button
      key={title}
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 18,
        height: 18,
        borderRadius: radius.xs,
        border: `1px solid ${colors.controlBorder}`,
        background: color,
        cursor: "pointer",
        padding: 0,
      }}
    />
  );
  const label = (text: string) => (
    <span style={{ fontSize: fontSize.sm, color: "var(--ed-muted)", margin: "0 2px 0 6px" }}>
      {text}
    </span>
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
  return (
    <div style={barRow}>
      {label("Shape")}
      <button
        type="button"
        style={styleBtn}
        title="Box"
        onClick={() => onStyle({ borderRadius: "4px", shape: undefined })}
      >
        ▭
      </button>
      <button
        type="button"
        style={styleBtn}
        title="Rounded"
        onClick={() => onStyle({ borderRadius: "14px", shape: undefined })}
      >
        ▢
      </button>
      <button
        type="button"
        style={styleBtn}
        title="Pill"
        onClick={() => onStyle({ borderRadius: "999px", shape: undefined })}
      >
        ⬭
      </button>
      {geomShapes.map(({ shape, title }) => (
        <button
          key={shape}
          type="button"
          style={{ ...styleBtn, padding: "3px 5px" }}
          title={title}
          onClick={() => onStyle({ shape })}
        >
          {shapeIcon(shape)}
        </button>
      ))}
      {label("Fill")}
      {FILL_SWATCHES.map((c) => swatch(c, () => onStyle({ background: c }), `Fill ${c}`))}
      <button
        type="button"
        style={styleBtn}
        title="No fill"
        onClick={() => onStyle({ background: "", fill: undefined })}
      >
        ✕
      </button>
      <button
        type="button"
        style={styleBtn}
        title="Branch-colour tint"
        onClick={() => onStyle({ fill: "tint" })}
      >
        ◧
      </button>
      <button
        type="button"
        style={styleBtn}
        title="Gradient fill"
        onClick={() => onStyle({ fill: "gradient" })}
      >
        ◨
      </button>
      {label("Border")}
      {BORDER_SWATCHES.map((c) =>
        swatch(c, () => onStyle({ border: `2px solid ${c}` }), `Border ${c}`),
      )}
      <button
        type="button"
        style={styleBtn}
        title="No border"
        onClick={() => onStyle({ border: "" })}
      >
        ✕
      </button>
      <button
        type="button"
        style={styleBtn}
        title="Bold"
        onClick={() => onStyle({ fontWeight: "bold" })}
      >
        <b>B</b>
      </button>
      {label("Font")}
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) onStyle({ fontFamily: e.target.value });
        }}
        title="Topic font family"
        style={{ ...styleBtn, padding: "2px 4px", fontSize: 12 }}
      >
        <option value="">Font…</option>
        <option value="sans-serif">Sans</option>
        <option value="serif">Serif</option>
        <option value="monospace">Mono</option>
      </select>
      {label("Wrap")}
      <select
        value=""
        onChange={(e) => {
          if (e.target.value)
            onStyle({ maxWidth: e.target.value === "none" ? "" : e.target.value });
        }}
        title="Wrap long topics to a width"
        aria-label="Topic wrap width"
        style={{ ...styleBtn, padding: "2px 4px", fontSize: 12 }}
      >
        <option value="">Width…</option>
        <option value="160px">Narrow</option>
        <option value="220px">Medium</option>
        <option value="300px">Wide</option>
        <option value="none">None</option>
      </select>
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

  const startEdit = (id: string, topic: string) => {
    setEditId(id);
    setDraft(topic);
  };
  const commitEdit = () => {
    if (editId && onRename) onRename(editId, draft.trim());
    setEditId(null);
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
      <div style={{ overflowY: "auto", padding: "4px 0 8px" }}>
        {rows.map((row) => {
          const isEditing = editId === row.id;
          const dropHere = drop?.id === row.id ? drop.where : null;
          // Dragging is disabled on the root + while filtering (the flat filtered view hides structure).
          const canDrag = editable && row.depth > 0 && !q;
          return (
            <div
              key={row.id}
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
                    if (e.key === "Enter") commitEdit();
                    else if (e.key === "Escape") setEditId(null);
                  }}
                  aria-label="Rename topic"
                  style={{ ...inputStyle, flex: 1, margin: "1px 6px", padding: "2px 6px" }}
                />
              ) : (
                <>
                  <button
                    type="button"
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
                        onClick={() => onIndent?.(row.id, "out")}
                        title="Promote (outdent)"
                        aria-label="Promote topic"
                        style={{ ...styleBtn, fontSize: 11, padding: "1px 5px" }}
                      >
                        ◂
                      </button>
                      <button
                        type="button"
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
}: {
  root: MapNode;
  floatingTopics?: MapNode[];
  onPick: (id: string) => void;
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

  const group = (label: string, entries: IndexEntry[], manage = false) => {
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
        {group("Markers", markers)}
        {group("Tags", tags, manageTags)}
      </div>
    </Panel>
  );
}

// Map statistics: a read-only at-a-glance summary of the whole map (topics, depth, task health,
// content tallies). Numbers come from the pure mapStats() so they're unit-tested independently.
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
  matchCount,
  savedFilters,
  onText,
  onToggleMarker,
  onToggleTag,
  onDue,
  onPriority,
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
  matchCount: number;
  savedFilters: SavedFilter[];
  onText: (value: string) => void;
  onToggleMarker: (marker: string) => void;
  onToggleTag: (tag: string) => void;
  onDue: (mode: DueMode) => void;
  onPriority: (priority: number) => void;
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
    text.trim().length > 0 || markers.length > 0 || tags.length > 0 || due !== "" || priority > 0;
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
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </Select>
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
        background: "rgba(255,255,255,0.95)",
        border: `1px solid ${colors.playbackBorder}`,
        borderRadius: radius.xl,
        boxShadow: "0 6px 24px rgba(31,27,77,0.18)",
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
}: {
  index: number;
  total: number;
  topic: string;
  note?: string;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
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
  const [kind, setKind] = useState<ConditionalRule["kind"]>("tag");
  const [value, setValue] = useState("");
  const [fill, setFill] = useState("");
  const [border, setBorder] = useState("");
  // tag / marker / priority / textContains carry a value; completed / overdue / hasAttachment don't.
  const needsValue =
    kind === "tag" || kind === "marker" || kind === "priority" || kind === "textContains";
  const add = () => {
    if (needsValue && !value.trim()) return;
    if (!fill && !border) return;
    const style: NodeStyle = {};
    if (fill) style.background = fill;
    if (border) style.border = `2px solid ${border}`;
    onAddRule({
      id: crypto.randomUUID(),
      kind,
      value: needsValue ? value.trim() : undefined,
      style,
    });
    setValue("");
    setFill("");
    setBorder("");
  };
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
          Auto-style topics by tag, marker, completion, due date, priority, text, or attachment.
          Manual styling still wins.
        </div>
        {rules.map((r) => (
          <div
            key={r.id}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 10px" }}
          >
            <span style={previewSwatch(r.style)} />
            <span style={{ flex: 1, fontSize: fontSize.sm, color: colors.text }}>
              {describeRule(r)}
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
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as ConditionalRule["kind"])}
            aria-label="Rule condition"
            style={{ width: "auto", flex: 1 }}
          >
            <option value="tag">has tag</option>
            <option value="marker">has marker</option>
            <option value="completed">is completed</option>
            <option value="overdue">is overdue</option>
            <option value="priority">priority ≤</option>
            <option value="textContains">text contains</option>
            <option value="hasAttachment">has attachment</option>
          </Select>
        </div>
        {kind === "tag" ? (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="tag name"
            aria-label="Rule tag"
            style={{ width: "auto", margin: "0 10px 4px" }}
          />
        ) : kind === "marker" ? (
          <Select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Rule marker"
            style={{ width: "auto", margin: "0 10px 4px" }}
          >
            <option value="">Pick a marker…</option>
            {markers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        ) : kind === "priority" ? (
          <Select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Rule priority"
            style={{ width: "auto", margin: "0 10px 4px" }}
          >
            <option value="">Pick a priority…</option>
            <option value="1">1 — High</option>
            <option value="2">2 — Medium &amp; up</option>
            <option value="3">3 — Low &amp; up</option>
          </Select>
        ) : kind === "textContains" ? (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="topic contains…"
            aria-label="Rule text"
            style={{ width: "auto", margin: "0 10px 4px" }}
          />
        ) : null}
        {swatchRow(FILL_SWATCHES, fill, setFill, "Fill")}
        {swatchRow(BORDER_SWATCHES, border, setBorder, "Border")}
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
type InfoTab = "details" | "style";
// Details now leads with the note + markers (the most-reached-for edits), so the old separate Notes
// tab is folded in; Style stays the secondary tab. (#7)
const INFO_TABS: readonly TabItem[] = [
  {
    id: "details",
    label: "Details",
    title: "Note, markers, tags, progress, dates, priority, attachments & links",
  },
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
  markers,
  onToggleMarker,
  bulkMarkers,
  bulkTags,
  onBulkToggleMarker,
  onBulkToggleTag,
  onPickSticker,
  onStyle,
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
  maps,
  onLinkMap,
  jumpTargets,
  onJump,
  backlinks,
  onFollowBacklink,
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
  maps: { id: string; title: string }[];
  onLinkMap: (mapId: string) => void;
  jumpTargets: { id: string; topic: string; depth: number }[];
  onJump: (id: string) => void;
  /** Topics that point AT the selected node (incoming #node= links + relationship edges). */
  backlinks: Backlink[];
  /** Navigate to a backlink's source node (focus + select it) — distinct from onJump, which creates
   *  an outgoing link. */
  onFollowBacklink: (id: string) => void;
  onMinimize: () => void;
  /** Set / clear the topic's fill image (covers the whole card). */
  onSetFillImage?: (file: File) => void;
  onClearFillImage?: () => void;
  /** Native browser spell-check in the note editor (view setting; off by default). */
  spellCheck?: boolean;
}) {
  const [tagInput, setTagInput] = useState("");
  const [tab, setTab] = useState<InfoTab>("details");
  // Bulk mode: >1 node selected. Only the value-setting editors that apply cleanly across a set are
  // shown (shape/colour/font, progress, dates, priority); per-item editors (notes, markers, tags,
  // stickers, attachments, links) are hidden — they stay single-node, edited by selecting one topic.
  const multi = (selectedCount ?? 0) > 1;
  // In bulk mode, which task fields the selected topics disagree on — those render blank + "Mixed"
  // instead of (and without overwriting from) the anchor's value. Empty object for a single select.
  const mixed: Partial<SelectionFields["mixed"]> = multi ? (fields?.mixed ?? {}) : {};
  const tabs = INFO_TABS;
  const activeTab: InfoTab = tab;
  // Clicking a node's 📝 indicator bumps openNoteNonce → jump to Details, where the note now lives.
  useEffect(() => {
    if (openNoteNonce) setTab("details");
  }, [openNoteNonce]);
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
                </div>
              )}
              {activeTab === "style" && (
                <>
                  <StyleBar onStyle={onStyle} namedStyles={namedStyles} />
                  {multi ? (
                    // Bulk: tri-state markers (lit = on all, dashed = on some); stickers stay single-node.
                    onBulkToggleMarker ? (
                      <MarkerBar
                        markers={markers}
                        active={bulkMarkers?.all}
                        partial={bulkMarkers?.some}
                        onToggle={onBulkToggleMarker}
                      />
                    ) : null
                  ) : (
                    // Markers now lead the Details tab (#7); Style keeps the per-item sticker grid.
                    <>
                      <StickerBar stickers={STICKERS} onPick={onPickSticker} />
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
              {activeTab === "details" && (
                <>
                  {!multi && (
                    <>
                      {/* Note + markers lead Details — the most-reached-for edits, one click from
                          the default inspector view (#7). */}
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
                      {sectionLabel("Note")}
                      <div style={{ display: "flex", flexDirection: "column", height: 168 }}>
                        <NotesPanel
                          selected={selected}
                          value={noteDraft}
                          onChange={onNoteChange}
                          onBlur={onNoteBlur}
                          spellCheck={spellCheck}
                        />
                      </div>
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
                      <label style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        Start
                        {/* Native input (not the Input primitive) so it stays nested in its label; the
                          mm-prim-input class lets the .mm-inspector theme override re-skin it. The key
                          includes the mixed flag so the uncontrolled input remounts (and clears its
                          defaultValue) when bulk mixed-ness flips — never pre-filling the anchor's date. */}
                        <input
                          key={`${node.id}:start${mixed.start ? ":mixed" : ""}`}
                          className="mm-prim-input"
                          type="date"
                          defaultValue={mixed.start ? "" : (node.task?.start ?? "")}
                          onChange={(e) => onSetStart(e.target.value)}
                          aria-label="Start date"
                          style={{ ...inputStyle, width: "auto", padding: "2px 4px" }}
                        />
                        {mixed.start ? mixedHint : null}
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        Due
                        <input
                          key={`${node.id}:due${mixed.due ? ":mixed" : ""}`}
                          className="mm-prim-input"
                          type="date"
                          defaultValue={mixed.due ? "" : (node.task?.due ?? "")}
                          onChange={(e) => onSetDue(e.target.value)}
                          aria-label="Due date"
                          style={{ ...inputStyle, width: "auto", padding: "2px 4px" }}
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
                            title={`${PRIORITY_LABEL[p]} priority`}
                            style={{
                              padding: "1px 8px",
                              fontSize: fontSize.sm,
                              fontWeight: fontWeight.semibold,
                              // Priority keeps its own semantic colour scale in every theme (opted out
                              // of the inspector's accent re-theme via mm-keep-color).
                              background: active ? PRIORITY_COLOR[p] : "var(--ed-card)",
                              color: active ? "#fff" : PRIORITY_COLOR[p],
                              borderColor: PRIORITY_COLOR[p],
                            }}
                          >
                            {PRIORITY_LABEL[p]}
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
                      {sectionLabel("Attachments")}
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
                            <span style={{ color: "var(--ed-faint)" }}>{formatBytes(a.size)}</span>
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

                      {sectionLabel("Links")}
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
                        placeholder="Web link (https://…)"
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

                      {backlinks.length > 0 && (
                        <>
                          {sectionLabel("Linked from")}
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
                        </>
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
  spellCheck = false,
}: {
  selected: SelectedNode | null;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onClose: () => void;
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
  spellCheck = false,
}: {
  selected: SelectedNode | null;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  /** Optional — when omitted (e.g. embedded in the Info panel) the Close button is hidden. */
  onClose?: () => void;
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
      {selected ? (
        <>
          <div role="toolbar" aria-label="Note formatting" style={{ display: "flex", gap: 4 }}>
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
          </div>
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
            data-placeholder="Add a note… bold, italic, lists & links supported"
            onInput={serialize}
            onPaste={onPaste}
            onBlur={onBlur}
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
export function StickerBar({
  stickers,
  onPick,
}: {
  stickers: readonly Sticker[];
  onPick: (sticker: Sticker) => void;
}) {
  return (
    <>
      <PanelSection>Stickers</PanelSection>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          padding: "0 10px 6px",
        }}
      >
        {stickers.map((s) => (
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
            <img
              src={stickerDataUrl(s)}
              alt=""
              width={22}
              height={22}
              style={{ display: "block" }}
            />
          </button>
        ))}
      </div>
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
