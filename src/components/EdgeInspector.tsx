import type { CSSProperties } from "react";
import type { SelectedEdge } from "../mindmap";
import { InspectorResizer } from "./InspectorResizer";

// EdgeInspector — the right-panel shown when a relationship (cross-link) edge is selected, in place of
// the node InfoPanel / MapPanel. Styled via .mm-inspector* + --ed-* tokens (matching MapPanel) so it
// re-themes with the chrome. Edits go through the canvas's edge mutators (setLinkLabel/Arrow/Style,
// deleteLink); the `edge` prop is the resolved SelectedEdge (every field has a concrete value).

// A small set of relationship colours + the accent default; "" resets to the shared CROSSLINK_COLOR.
const SWATCHES = ["#8b87e0", "#e0697f", "#3f9e6e", "#d98a2b", "#3b82c4", "#111827"];
const WIDTHS: { w: number; label: string }[] = [
  { w: 1, label: "Thin" },
  { w: 1.5, label: "Medium" },
  { w: 3, label: "Thick" },
];
const DASHES: { d: SelectedEdge["dash"]; label: string }[] = [
  { d: "dashed", label: "Dashed" },
  { d: "solid", label: "Solid" },
  { d: "dotted", label: "Dotted" },
];
const ARROWS: { a: SelectedEdge["arrow"]; glyph: string; title: string }[] = [
  { a: "to", glyph: "→", title: "Arrow at the target end" },
  { a: "from", glyph: "←", title: "Arrow at the source end" },
  { a: "both", glyph: "↔", title: "Arrows at both ends" },
  { a: "none", glyph: "—", title: "No arrowheads (a plain line)" },
];

const fieldLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--ed-faint)",
  margin: "12px 0 5px",
};
const segRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 4 };

function seg(active: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? "var(--ed-accent)" : "var(--ed-border)"}`,
    background: active ? "var(--ed-accent-tint)" : "var(--ed-card)",
    color: active ? "var(--ed-accent)" : "var(--ed-ink)",
    borderRadius: 7,
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 600,
    padding: "3px 9px",
  };
}

export function EdgeInspector({
  edge,
  fromTopic,
  toTopic,
  onSetLabel,
  onSetArrow,
  onSetStyle,
  onDelete,
  onMinimize,
  width,
  onResize,
}: {
  edge: SelectedEdge;
  fromTopic: string;
  toTopic: string;
  onSetLabel: (label: string) => void;
  onSetArrow: (arrow: SelectedEdge["arrow"]) => void;
  onSetStyle: (patch: { color?: string; width?: number; dash?: SelectedEdge["dash"] }) => void;
  onDelete: () => void;
  onMinimize?: () => void;
  width?: number;
  onResize?: (next: number) => void;
}) {
  return (
    <aside
      className="mm-inspector"
      aria-label="Relationship info"
      style={width ? { width } : undefined}
    >
      {width && onResize ? <InspectorResizer width={width} onResize={onResize} /> : null}
      <div
        className="mm-inspector-head"
        style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 11.5, color: "var(--ed-muted)", marginBottom: 5 }}>
            Relationship
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={`${fromTopic} → ${toTopic}`}
          >
            {fromTopic || "(untitled)"} <span style={{ color: "var(--ed-faint)" }}>→</span>{" "}
            {toTopic || "(untitled)"}
          </div>
        </div>
        {onMinimize && (
          <button
            type="button"
            className="mm-inspector-min"
            title="Minimize"
            aria-label="Minimize relationship info"
            onClick={onMinimize}
          >
            ›
          </button>
        )}
      </div>
      <div className="mm-inspector-body">
        {/* Label */}
        <div style={fieldLabel}>Label</div>
        <input
          key={`${edge.id}:label`}
          defaultValue={edge.label}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSetLabel((e.target as HTMLInputElement).value.trim());
          }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== edge.label) onSetLabel(v);
          }}
          placeholder="Relationship label"
          aria-label="Relationship label"
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid var(--ed-border)",
            background: "var(--ed-card)",
            color: "var(--ed-ink)",
            borderRadius: 7,
            fontSize: 13,
            padding: "4px 7px",
          }}
        />

        {/* Direction / arrowheads */}
        <div style={fieldLabel}>Direction</div>
        <div style={segRow}>
          {ARROWS.map(({ a, glyph, title }) => (
            <button
              key={a}
              type="button"
              title={title}
              aria-pressed={edge.arrow === a}
              onClick={() => onSetArrow(a)}
              style={{ ...seg(edge.arrow === a), minWidth: 34, textAlign: "center" }}
            >
              {glyph}
            </button>
          ))}
        </div>

        {/* Line colour */}
        <div style={fieldLabel}>Colour</div>
        <div style={segRow}>
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              aria-label={`Colour ${c}`}
              aria-pressed={edge.color.toLowerCase() === c.toLowerCase()}
              onClick={() => onSetStyle({ color: c })}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: c,
                cursor: "pointer",
                border:
                  edge.color.toLowerCase() === c.toLowerCase()
                    ? "2px solid var(--ed-ink)"
                    : "1px solid var(--ed-border)",
                padding: 0,
              }}
            />
          ))}
          <button
            type="button"
            title="Reset to the default colour"
            onClick={() => onSetStyle({ color: "" })}
            style={seg(false)}
          >
            Default
          </button>
        </div>

        {/* Width */}
        <div style={fieldLabel}>Width</div>
        <div style={segRow}>
          {WIDTHS.map(({ w, label }) => (
            <button
              key={w}
              type="button"
              aria-pressed={edge.width === w}
              onClick={() => onSetStyle({ width: w })}
              style={seg(edge.width === w)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Dash */}
        <div style={fieldLabel}>Style</div>
        <div style={segRow}>
          {DASHES.map(({ d, label }) => (
            <button
              key={d}
              type="button"
              aria-pressed={edge.dash === d}
              onClick={() => onSetStyle({ dash: d })}
              style={seg(edge.dash === d)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          style={{
            marginTop: 16,
            width: "100%",
            border: "1px solid var(--ed-danger)",
            background: "transparent",
            color: "var(--ed-danger)",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 0",
          }}
        >
          Delete relationship
        </button>
      </div>
    </aside>
  );
}
