import type { ReactNode } from "react";

// The left dock — the read-mostly side panels share ONE tabbed column instead of stacking as N 250px
// columns that could crush the canvas. One panel shows at a time; the tab strip switches between the
// open ones and each tab carries a × to close that panel. Presentational: App builds the entries (open
// panels, in order) + owns the active-tab state; this just renders the tabs + the active body.

export interface DockEntry {
  key: string;
  label: string;
  onClose: () => void;
  node: ReactNode;
}

const TAB_BTN = {
  border: 0,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
  padding: 0,
} as const;

export function PanelDock({
  entries,
  active,
  onActivate,
}: {
  entries: DockEntry[];
  /** The active tab's key; falls back to the last entry when it doesn't match an open panel. */
  active: string | null;
  onActivate: (key: string) => void;
}) {
  if (entries.length === 0) return null;
  const activeEntry = entries.find((e) => e.key === active) ?? entries[entries.length - 1];
  return (
    <div className="mm-dock">
      <div className="mm-dock-tabs" role="tablist" aria-label="Side panels">
        {entries.map((e) => (
          <span
            key={e.key}
            className="mm-dock-tab"
            data-active={activeEntry.key === e.key || undefined}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeEntry.key === e.key}
              onClick={() => onActivate(e.key)}
              style={TAB_BTN}
            >
              {e.label}
            </button>
            <button
              type="button"
              className="mm-dock-tab-close"
              aria-label={`Close ${e.label}`}
              onClick={e.onClose}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mm-dock-body">{activeEntry.node}</div>
    </div>
  );
}
