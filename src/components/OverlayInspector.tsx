import type { CSSProperties } from "react";
import type { SelectedOverlay } from "../mindmap";
import { InspectorResizer } from "./InspectorResizer";

// OverlayInspector — the right panel shown when an overlay object (boundary box / summary bracket /
// callout bubble) is selected, in place of the node InfoPanel / EdgeInspector / MapPanel. Edits the
// overlay's label (boundary/summary) or text (callout) and deletes it, via the canvas's overlay
// mutators. Styled via .mm-inspector* + --ed-* tokens so it re-themes with the chrome.

const KIND_LABEL: Record<SelectedOverlay["kind"], string> = {
  boundary: "Boundary",
  summary: "Summary",
  callout: "Callout",
};

const fieldLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--ed-faint)",
  margin: "12px 0 5px",
};

const controlStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--ed-border)",
  background: "var(--ed-card)",
  color: "var(--ed-ink)",
  borderRadius: 7,
  fontFamily: "inherit",
  fontSize: 13,
  padding: "4px 7px",
};

export function OverlayInspector({
  overlay,
  caption,
  onSetLabel,
  onDelete,
  onMinimize,
  width,
  onResize,
}: {
  overlay: SelectedOverlay;
  caption: string;
  onSetLabel: (label: string) => void;
  onDelete: () => void;
  onMinimize?: () => void;
  width?: number;
  onResize?: (next: number) => void;
}) {
  const isCallout = overlay.kind === "callout";
  const labelTitle = isCallout ? "Text" : "Label";
  return (
    <aside className="mm-inspector" aria-label="Overlay info" style={width ? { width } : undefined}>
      {width && onResize ? <InspectorResizer width={width} onResize={onResize} /> : null}
      <div
        className="mm-inspector-head"
        style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 11.5, color: "var(--ed-muted)", marginBottom: 5 }}>
            {KIND_LABEL[overlay.kind]}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={caption}
          >
            {caption || KIND_LABEL[overlay.kind]}
          </div>
        </div>
        {onMinimize && (
          <button
            type="button"
            className="mm-inspector-min"
            title="Minimize"
            aria-label="Minimize overlay info"
            onClick={onMinimize}
          >
            ›
          </button>
        )}
      </div>
      <div className="mm-inspector-body">
        <div style={fieldLabel}>{labelTitle}</div>
        {isCallout ? (
          <textarea
            key={`${overlay.kind}:${overlay.id}`}
            defaultValue={overlay.label}
            rows={3}
            onBlur={(e) => {
              if (e.target.value !== overlay.label) onSetLabel(e.target.value);
            }}
            placeholder="Callout text"
            aria-label="Callout text"
            style={{ ...controlStyle, resize: "vertical" }}
          />
        ) : (
          <input
            key={`${overlay.kind}:${overlay.id}`}
            defaultValue={overlay.label}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            onBlur={(e) => {
              if (e.target.value.trim() !== overlay.label) onSetLabel(e.target.value.trim());
            }}
            placeholder={overlay.kind === "boundary" ? "Boundary label" : "Summary label"}
            aria-label={`${KIND_LABEL[overlay.kind]} label`}
            style={controlStyle}
          />
        )}

        {/* Colour — added by the overlay-colours spec (Feature 4c slots a swatch row in here). */}

        {overlay.deletable ? (
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
            Delete {KIND_LABEL[overlay.kind].toLowerCase()}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
