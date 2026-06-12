import type { SelectedNode } from "./mindmap/MindMap";
import type { MapNode } from "./model/types";
import { outlineRows } from "./outline";
import { controlStyle, inputStyle } from "./ui";

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
  return (
    <div
      style={{
        height: 140,
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
        <span>📝 Note{selected ? ` — ${selected.topic}` : ""}</span>
        <button
          type="button"
          onClick={onClose}
          style={{ ...controlStyle, padding: "2px 8px", fontSize: 12 }}
        >
          Close
        </button>
      </div>
      {selected ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Add a note for this node…"
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
