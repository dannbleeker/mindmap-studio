import { type CSSProperties, useState } from "react";
import { ProgressPie } from "./ProgressPie";
import {
  Button,
  Chip,
  Input,
  Panel,
  PanelSection,
  Select,
  type TabItem,
  Tabs,
} from "./design/primitives";
import { colors, fontSize, fontWeight, radius, space } from "./design/tokens";
import { type DueMode, type FilterCriteria, type SavedFilter, describeCriteria } from "./filter";
import { formatBytes } from "./io/attachment";
import type { SelectedNode } from "./mindmap";
import { shapeOverlayPath, shapePath } from "./mindmap/flow/shapes";
import type { ConditionalRule, MapNode, NodeShape, NodeStyle } from "./model/types";
import { renderNote } from "./noteFormat";
import {
  type IndexEntry,
  type IndexHit,
  markerTagIndex,
  outlineNumbers,
  outlineRows,
} from "./outline";
import { PRIORITY_COLOR, PRIORITY_LABEL, PRIORITY_LEVELS } from "./priority";
import { hasTaskDescendants, nodeProgress, toPercent } from "./progress";
import { describeRule } from "./rules";
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
  border: `1px solid ${colors.controlBorder}`,
  background: colors.white,
  borderRadius: radius.md,
  cursor: "pointer",
  fontSize: fontSize.lg,
  lineHeight: 1,
  padding: `${space.xxs}px ${space.md}px`,
  color: colors.text,
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
  background: colors.surfaceBar,
  borderBottom: `1px solid ${colors.border}`,
};

// The bold ink title at the top of a rail panel (Markers & tags / Power Filter / Styles). The
// History + Info panels use a flex variant of this (title + a Close button) inline.
const panelTitle: CSSProperties = {
  padding: `${space.lg}px ${space.xl}px ${space.sm}px`,
  fontSize: fontSize.md,
  fontWeight: fontWeight.semibold,
  color: colors.text,
};

// Per-topic styling bar: shape, fill, border, bold — applied to the selected node.
export function StyleBar({ onStyle }: { onStyle: (patch: Partial<NodeStyle>) => void }) {
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
    <span style={{ fontSize: fontSize.sm, color: colors.muted, margin: "0 2px 0 6px" }}>
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
        <path d={shapePath(shape, 5, 5, 90, 60)} fill="none" stroke="#26215c" strokeWidth={7} />
        {overlay ? <path d={overlay} fill="none" stroke="#26215c" strokeWidth={7} /> : null}
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
        onClick={() => onStyle({ background: "" })}
      >
        ✕
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
            color: "",
            fontWeight: "",
            fontFamily: "",
            textDecoration: "",
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
  onFilterChange,
  onPick,
}: {
  root: MapNode;
  filter: string;
  numbered?: boolean;
  onFilterChange: (value: string) => void;
  onPick: (id: string) => void;
}) {
  const q = filter.trim().toLowerCase();
  const rows = outlineRows(root).filter((row) => !q || row.topic.toLowerCase().includes(q));
  const numbers = numbered ? outlineNumbers(root) : undefined;
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
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onPick(row.id)}
            title={row.topic}
            style={{
              ...listRow,
              padding: "3px 10px",
              paddingLeft: 10 + row.depth * 14,
            }}
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
        ))}
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
}: {
  root: MapNode;
  floatingTopics?: MapNode[];
  onPick: (id: string) => void;
}) {
  const { markers, tags } = markerTagIndex(root, floatingTopics);

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

  const group = (label: string, entries: IndexEntry[]) => {
    if (entries.length === 0) return null;
    return (
      <div key={label}>
        <PanelSection>{label}</PanelSection>
        {entries.map(({ key, hits }) => (
          <div key={key}>
            <div
              style={{
                padding: "2px 10px",
                fontSize: fontSize.md,
                fontWeight: fontWeight.semibold,
                color: colors.text,
              }}
            >
              {key}{" "}
              <span style={{ color: colors.faint, fontWeight: fontWeight.normal }}>
                ({hits.length})
              </span>
            </div>
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
        {group("Tags", tags)}
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
        <div style={{ padding: "6px 10px", fontSize: fontSize.xs, color: colors.faint }}>
          Read-only: non-matching topics are dimmed, nothing is removed.
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
  const add = () => {
    if (kind !== "completed" && !value.trim()) return;
    if (!fill && !border) return;
    const style: NodeStyle = {};
    if (fill) style.background = fill;
    if (border) style.border = `2px solid ${border}`;
    onAddRule({
      id: crypto.randomUUID(),
      kind,
      value: kind === "completed" ? undefined : value.trim(),
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
          Auto-style topics by tag, marker, or completion. Manual styling still wins.
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
type InfoTab = "details" | "style" | "notes";
const INFO_TABS: readonly TabItem[] = [
  {
    id: "details",
    label: "Details",
    title: "Tags, progress, dates, priority, attachments & links",
  },
  { id: "style", label: "Style", title: "Shape, colour, font & stickers" },
  { id: "notes", label: "Notes", title: "Markdown note for this topic" },
];

export function InfoPanel({
  selected,
  node,
  noteDraft,
  onNoteChange,
  onNoteBlur,
  markers,
  onToggleMarker,
  onPickSticker,
  onStyle,
  onAddTag,
  onRemoveTag,
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
  onClose,
}: {
  selected: SelectedNode | null;
  node: MapNode | null;
  noteDraft: string;
  onNoteChange: (value: string) => void;
  onNoteBlur: () => void;
  markers: readonly string[];
  onToggleMarker: (marker: string) => void;
  onPickSticker: (sticker: Sticker) => void;
  onStyle: (patch: Partial<NodeStyle>) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
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
  onClose: () => void;
}) {
  const [tagInput, setTagInput] = useState("");
  const [tab, setTab] = useState<InfoTab>("details");
  const link = node?.hyperlink ?? "";
  // The URL field is for plain web links; #map= / #node= links are managed by the selects below.
  const webUrl = link.startsWith("#") ? "" : link;
  const sectionLabel = (text: string) => <PanelSection>{text}</PanelSection>;

  // Task progress: parents with sub-tasks show an auto-rolled-up pie (read-only); a leaf (or an
  // undivided node) gets quarter-step buttons to set its own completion, plus a clear-task control.
  const renderProgress = (n: MapNode) => {
    const info = nodeProgress(n);
    const derived = hasTaskDescendants(n);
    const pct = info ? toPercent(info.progress) : null;
    return (
      <>
        {sectionLabel("Progress")}
        {derived ? (
          <div
            style={{
              padding: "0 10px 6px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
            }}
          >
            {info ? <ProgressPie fraction={info.progress} size={20} /> : null}
            <span style={{ color: colors.text, fontVariantNumeric: "tabular-nums" }}>
              {pct}% · {info?.done}/{info?.total} done
            </span>
            <span style={{ color: colors.faint }}>(auto)</span>
          </div>
        ) : (
          <div
            style={{
              padding: "0 10px 6px",
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexWrap: "wrap",
            }}
          >
            {info ? <ProgressPie fraction={info.progress} size={20} /> : null}
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
      </>
    );
  };
  const aside = (
    <Panel width={280}>
      <div
        style={{
          ...panelTitle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          ℹ {node ? node.topic || "(untitled)" : "Topic info"}
        </span>
        <Button onClick={onClose} style={{ padding: "2px 8px", fontSize: fontSize.sm }}>
          Close
        </Button>
      </div>
      {!node ? (
        <div style={{ padding: "8px 10px", fontSize: fontSize.md, color: colors.faint }}>
          Select a node to see and edit its details.
        </div>
      ) : (
        <>
          <Tabs
            tabs={INFO_TABS}
            active={tab}
            onChange={(id) => setTab(id as InfoTab)}
            ariaLabel="Topic info sections"
          />
          <div style={{ overflowY: "auto" }}>
            {tab === "style" && (
              <>
                <StyleBar onStyle={onStyle} />
                <MarkerBar markers={markers} active={node.icons} onToggle={onToggleMarker} />
                <StickerBar stickers={STICKERS} onPick={onPickSticker} />
              </>
            )}
            {tab === "details" && (
              <>
                {sectionLabel("Tags")}
                <div style={{ padding: "0 10px 4px", display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(node.tags ?? []).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onRemoveTag(t)}
                      title={`Remove tag "${t}"`}
                      style={{
                        border: `1px solid ${colors.controlBorder}`,
                        background: colors.white,
                        borderRadius: radius.md,
                        cursor: "pointer",
                        fontSize: fontSize.sm,
                        padding: "1px 6px",
                        color: colors.text,
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
                  placeholder="Add a tag, press Enter"
                  aria-label="Add a tag"
                  style={{ width: "auto", margin: "0 10px 4px" }}
                />

                {renderProgress(node)}

                {sectionLabel("Dates")}
                <div
                  style={{
                    padding: "0 10px 6px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                    fontSize: fontSize.sm,
                    color: colors.muted,
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    Start
                    {/* Native input (not the Input primitive) so it stays nested in its label. */}
                    <input
                      key={`${node.id}:start`}
                      type="date"
                      defaultValue={node.task?.start ?? ""}
                      onChange={(e) => onSetStart(e.target.value)}
                      aria-label="Start date"
                      style={{ ...inputStyle, width: "auto", padding: "2px 4px" }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    Due
                    <input
                      key={`${node.id}:due`}
                      type="date"
                      defaultValue={node.task?.due ?? ""}
                      onChange={(e) => onSetDue(e.target.value)}
                      aria-label="Due date"
                      style={{ ...inputStyle, width: "auto", padding: "2px 4px" }}
                    />
                  </label>
                </div>

                {sectionLabel("Priority")}
                <div
                  style={{
                    padding: "0 10px 6px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexWrap: "wrap",
                  }}
                >
                  {PRIORITY_LEVELS.map((p) => {
                    const active = node.task?.priority === p;
                    return (
                      <Button
                        key={p}
                        onClick={() => onSetPriority(p)}
                        title={`${PRIORITY_LABEL[p]} priority`}
                        style={{
                          padding: "1px 8px",
                          fontSize: fontSize.sm,
                          fontWeight: fontWeight.semibold,
                          // Priority uses its own colour scale, not the chrome accent.
                          background: active ? PRIORITY_COLOR[p] : colors.white,
                          color: active ? colors.white : PRIORITY_COLOR[p],
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
                          color: colors.text,
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        📎 {a.name}
                      </a>
                      <span style={{ color: colors.faint }}>{formatBytes(a.size)}</span>
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
                    style={{ padding: "2px 8px", fontSize: fontSize.sm, margin: "0 10px 6px" }}
                  >
                    ✕ Remove link (
                    {link.startsWith("#map=") ? "map" : link.startsWith("#node=") ? "topic" : "web"}
                    )
                  </Button>
                )}
              </>
            )}
            {tab === "notes" && (
              <NotesPanel
                selected={selected}
                value={noteDraft}
                onChange={onNoteChange}
                onBlur={onNoteBlur}
              />
            )}
          </div>
        </>
      )}
    </Panel>
  );
  return aside;
}

export function NotesPanel({
  selected,
  value,
  onChange,
  onBlur,
  onClose,
}: {
  selected: SelectedNode | null;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  /** Optional — when omitted (e.g. embedded in the Info panel) the Close button is hidden. */
  onClose?: () => void;
}) {
  const [preview, setPreview] = useState(false);
  return (
    <div
      style={{
        height: 160,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px 16px",
        borderTop: `1px solid ${colors.border}`,
        background: colors.surface,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: fontSize.sm,
          color: colors.muted,
        }}
      >
        <span>📝 Note{selected ? ` — ${selected.topic}` : ""} · Markdown</span>
        <span style={{ display: "flex", gap: 6 }}>
          {selected && (
            <Button
              onClick={() => setPreview((p) => !p)}
              style={{ padding: "2px 8px", fontSize: fontSize.sm }}
            >
              {preview ? "Edit" : "Preview"}
            </Button>
          )}
          {onClose && (
            <Button onClick={onClose} style={{ padding: "2px 8px", fontSize: fontSize.sm }}>
              Close
            </Button>
          )}
        </span>
      </div>
      {selected ? (
        preview ? (
          <div
            // Safe: renderNote escapes HTML and only emits a fixed tag subset.
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitised by renderNote
            dangerouslySetInnerHTML={{
              __html: renderNote(value) || "<p style='color:#999'>(empty)</p>",
            }}
            style={{
              flex: 1,
              overflowY: "auto",
              border: `1px solid ${colors.controlBorder}`,
              borderRadius: radius.lg,
              padding: "2px 10px",
              fontSize: fontSize.md,
              color: colors.text,
              background: colors.white,
            }}
          />
        ) : (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder="Add a note… Markdown supported (**bold**, *italic*, # heading, - list, links)"
            aria-label="Node note"
            style={{
              flex: 1,
              resize: "none",
              border: `1px solid ${colors.controlBorder}`,
              borderRadius: radius.lg,
              padding: 8,
              fontSize: fontSize.md,
              fontFamily: "inherit",
              color: colors.text,
            }}
          />
        )
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            color: colors.placeholder,
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
              border: `1px solid ${colors.controlBorder}`,
              background: colors.white,
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
  onToggle,
}: {
  markers: readonly string[];
  /** Markers currently on the selected node — highlighted so the bar reflects state. */
  active?: readonly string[];
  onToggle: (marker: string) => void;
}) {
  return (
    <div style={{ ...barRow, gap: 4 }}>
      <span style={{ fontSize: fontSize.sm, color: colors.muted, marginRight: 4 }}>Markers:</span>
      {markers.map((marker) => {
        const on = active?.includes(marker);
        return (
          <button
            key={marker}
            type="button"
            onClick={() => onToggle(marker)}
            aria-pressed={on}
            title={`Toggle ${marker} on the selected node`}
            style={{
              border: `1px solid ${on ? colors.accent : colors.controlBorder}`,
              background: on ? colors.accentTint : colors.white,
              borderRadius: radius.md,
              cursor: "pointer",
              fontSize: fontSize.xl,
              lineHeight: 1,
              padding: "3px 5px",
            }}
          >
            {marker}
          </button>
        );
      })}
    </div>
  );
}
