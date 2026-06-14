import { useState } from "react";
import type { SelectedNode } from "./mindmap";
import type { MapNode, NodeStyle } from "./model/types";
import { renderNote } from "./noteFormat";
import { outlineRows } from "./outline";
import { controlStyle, inputStyle } from "./ui";

const FILL_SWATCHES = ["#fde2e2", "#e2ecfd", "#e2fbe8", "#fdf3e2", "#efe2fd", "#ececec"];
const BORDER_SWATCHES = ["#e23b3b", "#3b8bd4", "#27852f", "#d98a17", "#7a3fb0", "#555555"];

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
  onFilterChange,
  onPick,
}: {
  root: MapNode;
  filter: string;
  onFilterChange: (value: string) => void;
  onPick: (id: string) => void;
}) {
  const q = filter.trim().toLowerCase();
  const rows = outlineRows(root).filter((row) => !q || row.topic.toLowerCase().includes(q));
  return (
    <aside
      style={{
        width: 250,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #e2e0d8",
        background: "#fbfbf9",
      }}
    >
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
            {row.topic || "(untitled)"}
          </button>
        ))}
      </div>
    </aside>
  );
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
  onClose: () => void;
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
          <button
            type="button"
            onClick={onClose}
            style={{ ...controlStyle, padding: "2px 8px", fontSize: 12 }}
          >
            Close
          </button>
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
  onToggle,
}: {
  markers: readonly string[];
  onToggle: (marker: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 16px",
        background: "#f4f3fb",
        borderBottom: "1px solid #e2e0d8",
      }}
    >
      <span style={{ fontSize: 12, color: "#73726c", marginRight: 4 }}>Markers:</span>
      {markers.map((marker) => (
        <button
          key={marker}
          type="button"
          onClick={() => onToggle(marker)}
          title={`Toggle ${marker} on the selected node`}
          style={{
            border: "1px solid #cecbf6",
            background: "#fff",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "3px 5px",
          }}
        >
          {marker}
        </button>
      ))}
    </div>
  );
}
