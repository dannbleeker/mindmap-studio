import { type CSSProperties, useState } from "react";
import { type FilterCriteria, type SavedFilter, describeCriteria } from "./filter";
import type { SelectedNode } from "./mindmap";
import type { MapNode, NodeStyle } from "./model/types";
import { renderNote } from "./noteFormat";
import {
  type IndexEntry,
  type IndexHit,
  markerTagIndex,
  outlineNumbers,
  outlineRows,
} from "./outline";
import { hasTaskDescendants, nodeProgress, toPercent } from "./progress";
import type { VersionMeta } from "./store/mapStore";
import { controlStyle, inputStyle, timeAgo } from "./ui";

const FILL_SWATCHES = ["#fde2e2", "#e2ecfd", "#e2fbe8", "#fdf3e2", "#efe2fd", "#ececec"];
const BORDER_SWATCHES = ["#e23b3b", "#3b8bd4", "#27852f", "#d98a17", "#7a3fb0", "#555555"];

// Shared chrome for the left-rail panels (Outline, Marker/tag index, Power Filter): a fixed-width
// flex column with a right divider. One definition so the three panels stay visually identical.
const PANEL_ASIDE: CSSProperties = {
  width: 250,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  borderRight: "1px solid #e2e0d8",
  background: "#fbfbf9",
};

// Small-caps section header inside the index + filter panels.
const PANEL_GROUP_LABEL: CSSProperties = {
  padding: "8px 10px 2px",
  fontSize: 11,
  fontWeight: 700,
  color: "#8a8780",
};

const styleBtn = {
  border: "1px solid #cecbf6",
  background: "#fff",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
  padding: "2px 6px",
  color: "#26215c",
} as const;

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
        borderRadius: 4,
        border: "1px solid #cecbf6",
        background: color,
        cursor: "pointer",
        padding: 0,
      }}
    />
  );
  const label = (text: string) => (
    <span style={{ fontSize: 12, color: "#73726c", margin: "0 2px 0 6px" }}>{text}</span>
  );
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        flexWrap: "wrap",
        padding: "6px 16px",
        background: "#f4f3fb",
        borderBottom: "1px solid #e2e0d8",
      }}
    >
      {label("Shape")}
      <button
        type="button"
        style={styleBtn}
        title="Box"
        onClick={() => onStyle({ borderRadius: "4px" })}
      >
        ▭
      </button>
      <button
        type="button"
        style={styleBtn}
        title="Rounded"
        onClick={() => onStyle({ borderRadius: "14px" })}
      >
        ▢
      </button>
      <button
        type="button"
        style={styleBtn}
        title="Pill"
        onClick={() => onStyle({ borderRadius: "999px" })}
      >
        ⬭
      </button>
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
      <button
        type="button"
        style={{ ...styleBtn, fontSize: 12 }}
        title="Reset style"
        onClick={() =>
          onStyle({
            background: "",
            border: "",
            borderRadius: "",
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
    <aside style={PANEL_ASIDE}>
      <input
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        placeholder="Filter outline…"
        aria-label="Filter outline"
        style={{ ...inputStyle, width: "auto", margin: "8px 10px 4px" }}
      />
      <div style={{ overflowY: "auto", padding: "4px 0 8px" }}>
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onPick(row.id)}
            title={row.topic}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              color: "#26215c",
              padding: "3px 10px",
              paddingLeft: 10 + row.depth * 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row.hasNote ? "📝 " : ""}
            {numbers?.get(row.id) ? `${numbers.get(row.id)} ` : ""}
            {row.topic || "(untitled)"}
            {row.progress !== undefined ? (
              <span style={{ marginLeft: 6, fontSize: 11, color: "#8a8780" }}>{row.progress}%</span>
            ) : null}
          </button>
        ))}
      </div>
    </aside>
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
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: 13,
        color: "#26215c",
        padding: "2px 10px 2px 24px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {hit.topic || "(untitled)"}
    </button>
  );

  const group = (label: string, entries: IndexEntry[]) => {
    if (entries.length === 0) return null;
    return (
      <div key={label}>
        <div style={PANEL_GROUP_LABEL}>{label}</div>
        {entries.map(({ key, hits }) => (
          <div key={key}>
            <div style={{ padding: "2px 10px", fontSize: 13, fontWeight: 600, color: "#26215c" }}>
              {key} <span style={{ color: "#8a8780", fontWeight: 400 }}>({hits.length})</span>
            </div>
            {hits.map((hit) => jump(hit, key))}
          </div>
        ))}
      </div>
    );
  };

  const empty = markers.length === 0 && tags.length === 0;
  return (
    <aside style={PANEL_ASIDE}>
      <div style={{ padding: "8px 10px 4px", fontSize: 13, fontWeight: 600, color: "#26215c" }}>
        Markers &amp; tags
      </div>
      <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
        {empty ? (
          <div style={{ padding: "4px 10px", fontSize: 13, color: "#8a8780" }}>
            No markers or tags in this map yet.
          </div>
        ) : null}
        {group("Markers", markers)}
        {group("Tags", tags)}
      </div>
    </aside>
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
  matchCount,
  savedFilters,
  onText,
  onToggleMarker,
  onToggleTag,
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
  matchCount: number;
  savedFilters: SavedFilter[];
  onText: (value: string) => void;
  onToggleMarker: (marker: string) => void;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
  onSaveFilter: (name: string) => void;
  onApplyFilter: (criteria: FilterCriteria) => void;
  onDeleteFilter: (id: string) => void;
}) {
  const { markers: markerEntries, tags: tagEntries } = markerTagIndex(root, floatingTopics);
  const active = text.trim().length > 0 || markers.length > 0 || tags.length > 0;
  const [saveName, setSaveName] = useState("");
  const chip = (key: string, selected: boolean, onClick: () => void) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        border: `1px solid ${selected ? "#6c63d6" : "#cecbf6"}`,
        background: selected ? "#6c63d6" : "#fff",
        color: selected ? "#fff" : "#26215c",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 13,
        lineHeight: 1.4,
        padding: "2px 7px",
      }}
    >
      {key}
    </button>
  );
  const groupLabel = (label: string) => <div style={PANEL_GROUP_LABEL}>{label}</div>;
  return (
    <aside style={PANEL_ASIDE}>
      <div style={{ padding: "8px 10px 4px", fontSize: 13, fontWeight: 600, color: "#26215c" }}>
        🎚 Power Filter
      </div>
      <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
        <input
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Filter by text…"
          aria-label="Filter by text"
          style={{ ...inputStyle, width: "auto", margin: "4px 10px" }}
        />
        {markerEntries.length > 0 ? (
          <>
            {groupLabel("Markers")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 10px" }}>
              {markerEntries.map((e) =>
                chip(e.key, markers.includes(e.key), () => onToggleMarker(e.key)),
              )}
            </div>
          </>
        ) : null}
        {tagEntries.length > 0 ? (
          <>
            {groupLabel("Tags")}
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
            fontSize: 12,
            color: "#73726c",
          }}
        >
          <span>
            {active ? `${matchCount} match${matchCount === 1 ? "" : "es"}` : "Showing all"}
          </span>
          {active ? (
            <button type="button" onClick={onClear} style={{ ...controlStyle, padding: "2px 8px" }}>
              Clear
            </button>
          ) : null}
        </div>
        <div style={{ padding: "6px 10px", fontSize: 11, color: "#8a8780" }}>
          Read-only: non-matching topics are dimmed, nothing is removed.
        </div>

        {groupLabel("Saved filters")}
        {savedFilters.length === 0 ? (
          <div style={{ padding: "0 10px 4px", fontSize: 12, color: "#8a8780" }}>
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
                  fontSize: 13,
                  color: "#26215c",
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
                  color: "#8a8780",
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            </div>
          ))
        )}
        {active ? (
          <div style={{ display: "flex", gap: 4, padding: "4px 10px 8px" }}>
            <input
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
              style={{ ...inputStyle, width: "auto", flex: 1 }}
            />
            <button
              type="button"
              disabled={!saveName.trim()}
              onClick={() => {
                onSaveFilter(saveName.trim());
                setSaveName("");
              }}
              style={{ ...controlStyle, padding: "2px 8px", fontSize: 12 }}
            >
              Save
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

// Per-map version history: a list of past snapshots (newest first) with a one-click restore, plus
// an on-demand "Save version now". Snapshots are captured automatically while editing (throttled)
// and on demand; restoring loads a snapshot back in place (the current state is checkpointed first).
export function HistoryPanel({
  versions,
  onSaveNow,
  onRestore,
  onClose,
}: {
  versions: VersionMeta[];
  onSaveNow: () => void;
  onRestore: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <aside style={PANEL_ASIDE}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 10px 4px",
          fontSize: 13,
          fontWeight: 600,
          color: "#26215c",
        }}
      >
        <span>🕔 History</span>
        <button
          type="button"
          onClick={onClose}
          style={{ ...controlStyle, padding: "2px 8px", fontSize: 12 }}
        >
          Close
        </button>
      </div>
      <button
        type="button"
        onClick={onSaveNow}
        style={{ ...controlStyle, margin: "0 10px 6px", padding: "4px 8px", fontSize: 12 }}
      >
        ＋ Save version now
      </button>
      <div style={{ overflowY: "auto", padding: "0 0 8px" }}>
        {versions.length === 0 ? (
          <div style={{ padding: "4px 10px", fontSize: 13, color: "#8a8780" }}>
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
                  fontSize: 13,
                  color: "#26215c",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={new Date(v.ts).toLocaleString()}
              >
                {timeAgo(v.ts)} <span style={{ color: "#8a8780" }}>· {v.nodeCount} topics</span>
              </span>
              <button
                type="button"
                onClick={() => onRestore(v.id)}
                style={{ ...controlStyle, padding: "1px 8px", fontSize: 12 }}
              >
                Restore
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

// Unified per-node "topic info" panel: one side rail consolidating everything you can set on the
// selected node — note, markers, tags, style, and links (web / another map / another topic) —
// replacing the separate Notes / Markers / Style bars and the Link / Jump toolbar selects.
export function InfoPanel({
  selected,
  node,
  noteDraft,
  onNoteChange,
  onNoteBlur,
  markers,
  onToggleMarker,
  onStyle,
  onAddTag,
  onRemoveTag,
  onSetProgress,
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
  onStyle: (patch: Partial<NodeStyle>) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onSetProgress: (progress: number | undefined) => void;
  onSetHyperlink: (url: string) => void;
  maps: { id: string; title: string }[];
  onLinkMap: (mapId: string) => void;
  jumpTargets: { id: string; topic: string; depth: number }[];
  onJump: (id: string) => void;
  onClose: () => void;
}) {
  const [tagInput, setTagInput] = useState("");
  const link = node?.hyperlink ?? "";
  // The URL field is for plain web links; #map= / #node= links are managed by the selects below.
  const webUrl = link.startsWith("#") ? "" : link;
  const sectionLabel = (text: string) => <div style={PANEL_GROUP_LABEL}>{text}</div>;

  // Task progress: parents with sub-tasks show an auto-rolled-up bar (read-only); a leaf (or an
  // undivided node) gets quarter-step buttons to set its own completion, plus a clear-task control.
  const renderProgress = (n: MapNode) => {
    const info = nodeProgress(n);
    const derived = hasTaskDescendants(n);
    const pct = info ? toPercent(info.progress) : null;
    const bar = info ? (
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: 56,
          height: 7,
          borderRadius: 999,
          background: "rgba(0,0,0,0.12)",
          overflow: "hidden",
          verticalAlign: "middle",
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: `${pct}%`,
            background: (pct ?? 0) >= 100 ? "#27852f" : "#3b8bd4",
          }}
        />
      </span>
    ) : null;
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
            {bar}
            <span style={{ color: "#26215c", fontVariantNumeric: "tabular-nums" }}>
              {pct}% · {info?.done}/{info?.total} done
            </span>
            <span style={{ color: "#8a8780" }}>(auto)</span>
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
            {[0, 25, 50, 75, 100].map((step) => {
              const active = pct === step;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => onSetProgress(step / 100)}
                  title={`Set task to ${step}% complete`}
                  style={{
                    ...controlStyle,
                    padding: "1px 7px",
                    fontSize: 12,
                    fontVariantNumeric: "tabular-nums",
                    background: active ? "#26215c" : "#fff",
                    color: active ? "#fff" : "#26215c",
                    borderColor: active ? "#26215c" : undefined,
                  }}
                >
                  {step}
                </button>
              );
            })}
            {info ? (
              <button
                type="button"
                onClick={() => onSetProgress(undefined)}
                title="Clear task status"
                style={{ ...controlStyle, padding: "1px 7px", fontSize: 12 }}
              >
                ✕
              </button>
            ) : null}
          </div>
        )}
      </>
    );
  };
  const aside = (
    <aside style={{ ...PANEL_ASIDE, width: 280 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 10px 4px",
          fontSize: 13,
          fontWeight: 600,
          color: "#26215c",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          ℹ {node ? node.topic || "(untitled)" : "Topic info"}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{ ...controlStyle, padding: "2px 8px", fontSize: 12 }}
        >
          Close
        </button>
      </div>
      {!node ? (
        <div style={{ padding: "8px 10px", fontSize: 13, color: "#8a8780" }}>
          Select a node to see and edit its details.
        </div>
      ) : (
        <div style={{ overflowY: "auto" }}>
          <StyleBar onStyle={onStyle} />
          <MarkerBar markers={markers} active={node.icons} onToggle={onToggleMarker} />

          {sectionLabel("Tags")}
          <div style={{ padding: "0 10px 4px", display: "flex", flexWrap: "wrap", gap: 4 }}>
            {(node.tags ?? []).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onRemoveTag(t)}
                title={`Remove tag "${t}"`}
                style={{
                  border: "1px solid #cecbf6",
                  background: "#fff",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  padding: "1px 6px",
                  color: "#26215c",
                }}
              >
                {t} ✕
              </button>
            ))}
          </div>
          <input
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
            style={{ ...inputStyle, width: "auto", margin: "0 10px 4px" }}
          />

          {renderProgress(node)}

          {sectionLabel("Links")}
          <input
            key={`${node.id}:url`}
            defaultValue={webUrl}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSetHyperlink((e.target as HTMLInputElement).value.trim());
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== webUrl) onSetHyperlink(v);
            }}
            placeholder="Web link (https://…)"
            aria-label="Web link"
            style={{ ...inputStyle, width: "auto", margin: "0 10px 4px" }}
          />
          <select
            value=""
            onChange={(e) => e.target.value && onLinkMap(e.target.value)}
            aria-label="Link to another map"
            style={{ ...inputStyle, width: "auto", margin: "0 10px 4px" }}
          >
            <option value="">🔗 Link to a map…</option>
            {maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          <select
            value=""
            onChange={(e) => e.target.value && onJump(e.target.value)}
            aria-label="Jump to another topic"
            style={{ ...inputStyle, width: "auto", margin: "0 10px 4px" }}
          >
            <option value="">↪ Jump to a topic…</option>
            {jumpTargets.map((row) => (
              <option key={row.id} value={row.id}>
                {`${"  ".repeat(row.depth)}${row.topic || "(untitled)"}`}
              </option>
            ))}
          </select>
          {link && (
            <button
              type="button"
              onClick={() => onSetHyperlink("")}
              style={{ ...controlStyle, padding: "2px 8px", fontSize: 12, margin: "0 10px 6px" }}
            >
              ✕ Remove link (
              {link.startsWith("#map=") ? "map" : link.startsWith("#node=") ? "topic" : "web"})
            </button>
          )}

          <NotesPanel
            selected={selected}
            value={noteDraft}
            onChange={onNoteChange}
            onBlur={onNoteBlur}
          />
        </div>
      )}
    </aside>
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
        borderTop: "1px solid #e2e0d8",
        background: "#fbfbf9",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          color: "#73726c",
        }}
      >
        <span>📝 Note{selected ? ` — ${selected.topic}` : ""} · Markdown</span>
        <span style={{ display: "flex", gap: 6 }}>
          {selected && (
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              style={{ ...controlStyle, padding: "2px 8px", fontSize: 12 }}
            >
              {preview ? "Edit" : "Preview"}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{ ...controlStyle, padding: "2px 8px", fontSize: 12 }}
            >
              Close
            </button>
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
              border: "1px solid #cecbf6",
              borderRadius: 8,
              padding: "2px 10px",
              fontSize: 13,
              color: "#26215c",
              background: "#fff",
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
              border: "1px solid #cecbf6",
              borderRadius: 8,
              padding: 8,
              fontSize: 13,
              fontFamily: "inherit",
              color: "#26215c",
            }}
          />
        )
      ) : (
        <div
          style={{ flex: 1, display: "flex", alignItems: "center", color: "#999", fontSize: 13 }}
        >
          Select a node to add or edit its note.
        </div>
      )}
    </div>
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexWrap: "wrap",
        padding: "6px 16px",
        background: "#f4f3fb",
        borderBottom: "1px solid #e2e0d8",
      }}
    >
      <span style={{ fontSize: 12, color: "#73726c", marginRight: 4 }}>Markers:</span>
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
              border: `1px solid ${on ? "#6c63d6" : "#cecbf6"}`,
              background: on ? "#e7e4fb" : "#fff",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 16,
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
