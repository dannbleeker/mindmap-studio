import type { ChangeEvent } from "react";
import type { LayoutKind } from "../mindmap";
import { type CanvasTheme, canvasThemes } from "../mindmap/theme";
import type { MapNode, MindMapDoc } from "../model/types";
import { InspectorResizer } from "./InspectorResizer";

// MapPanel — the right-panel no-selection state (was MapStats). An editable map title + a "Map"
// settings section (theme, layout, background colour/image, line-jumps) above the read-only stats
// (topics, branches, task progress). Purely presentational: every setter is a prop App wires to the
// existing handlers (mapRef edge mutators / app theme+layout state), so there's no duplicated logic.
// Styled via .mm-inspector* / .mm-stat* / .mm-map-* + --ed-* so it re-themes with the chrome.

const BACKDROP_LABELS: Record<string, string> = {
  onion: "Onion (rings)",
  funnel: "Funnel (stages)",
  venn2: "Venn (2 circles)",
  venn3: "Venn (3 circles)",
};

interface Counts {
  total: number;
  withProgress: number;
  done: number;
}

function tally(node: MapNode, acc: Counts): Counts {
  acc.total += 1;
  const progress = node.task?.progress;
  if (typeof progress === "number") {
    acc.withProgress += 1;
    if (progress >= 1) acc.done += 1; // task.progress is 0..1
  }
  for (const c of node.children) tally(c, acc);
  return acc;
}

export function MapPanel({
  doc,
  theme,
  setThemeId,
  layout,
  changeLayout,
  freeform,
  background,
  onSetBackground,
  onSetBackgroundImage,
  handleBackgroundImage,
  lineJumps,
  onToggleLineJumps,
  onRenameMap,
  onBackdropRings,
  onClearBackdrop,
  onMinimize,
  width,
  onResize,
}: {
  doc: MindMapDoc;
  theme: CanvasTheme;
  setThemeId: (id: string) => void;
  layout: LayoutKind;
  changeLayout: (v: LayoutKind) => void;
  freeform?: boolean;
  background?: string;
  onSetBackground: (color: string) => void;
  onSetBackgroundImage: (url: string) => void;
  handleBackgroundImage: (e: ChangeEvent<HTMLInputElement>) => void;
  lineJumps: boolean;
  onToggleLineJumps: () => void;
  onRenameMap: (title: string) => void;
  /** Add/remove a ring or stage on the current onion/funnel backdrop (no-op for venn). */
  onBackdropRings?: (delta: number) => void;
  /** Remove the map's diagram backdrop. */
  onClearBackdrop?: () => void;
  onMinimize?: () => void;
  width?: number;
  onResize?: (next: number) => void;
}) {
  const counts = tally(doc.root, { total: 0, withProgress: 0, done: 0 });
  const branches = doc.root.children.length;
  const pct = counts.withProgress > 0 ? Math.round((counts.done / counts.withProgress) * 100) : 0;
  const commitTitle = (value: string) => {
    const v = value.trim();
    if (v && v !== doc.title) onRenameMap(v);
  };
  return (
    <aside className="mm-inspector" aria-label="Map overview" style={width ? { width } : undefined}>
      {width && onResize ? <InspectorResizer width={width} onResize={onResize} /> : null}
      <div
        className="mm-inspector-head"
        style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: "var(--ed-muted)", marginBottom: 5 }}>
            No node selected
          </div>
          {/* Editable map title — commits on Enter/blur via renameMap (sets the root topic; the doc
              title follows). Keyed on the doc so it resets when switching maps. */}
          <input
            key={doc.id}
            defaultValue={doc.title || ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            onBlur={(e) => commitTitle(e.target.value)}
            aria-label="Map title"
            placeholder="Untitled map"
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid transparent",
              background: "transparent",
              color: "var(--ed-ink)",
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              borderRadius: 6,
              padding: "1px 4px",
              marginLeft: -4,
            }}
          />
        </div>
        {onMinimize && (
          <button
            type="button"
            className="mm-inspector-min"
            title="Minimize"
            aria-label="Minimize map overview"
            onClick={onMinimize}
          >
            ›
          </button>
        )}
      </div>
      <div className="mm-inspector-body">
        {/* Map settings — all wired to existing app state / handle methods. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="mm-map-section-title">Map</div>
          <label className="mm-map-field">
            <span>Theme</span>
            <select
              className="mm-map-control"
              value={theme.id}
              onChange={(e) => setThemeId(e.target.value)}
              aria-label="Canvas theme"
            >
              {canvasThemes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="mm-map-field">
            <span>Layout</span>
            <select
              className="mm-map-control"
              value={layout}
              onChange={(e) => changeLayout(e.target.value as LayoutKind)}
              aria-label="Layout"
              disabled={!!freeform}
              title={freeform ? "Auto-layout is paused (Free layout is on)" : "Layout"}
            >
              <optgroup label="Radial">
                <option value="side">Both sides</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="radial">Radial / hub</option>
              </optgroup>
              <optgroup label="Tree">
                <option value="org-down">Org chart ↓</option>
                <option value="org-up">Org chart ↑</option>
              </optgroup>
              <optgroup label="Diagram">
                <option value="timeline">Timeline</option>
                <option value="fishbone">Fishbone</option>
                <option value="grid">Grid / matrix</option>
                <option value="brace">Brace map</option>
              </optgroup>
            </select>
          </label>
          <div className="mm-map-field">
            <span>Background</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="color"
                className="mm-map-control"
                value={background || "#ffffff"}
                onChange={(e) => onSetBackground(e.target.value)}
                aria-label="Background colour"
                style={{ padding: 1, width: 34, height: 24 }}
              />
              {background ? (
                <button
                  type="button"
                  className="mm-map-control"
                  onClick={() => onSetBackground("")}
                  title="Reset background colour"
                  style={{ cursor: "pointer" }}
                >
                  Reset
                </button>
              ) : null}
            </div>
          </div>
          <div className="mm-map-field">
            <span>Image</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label className="mm-map-control" style={{ cursor: "pointer" }}>
                {doc.meta?.backgroundImage ? "Replace…" : "Add…"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundImage}
                  style={{ display: "none" }}
                />
              </label>
              {doc.meta?.backgroundImage ? (
                <button
                  type="button"
                  className="mm-map-control"
                  onClick={() => onSetBackgroundImage("")}
                  title="Clear background image"
                  style={{ cursor: "pointer" }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          <label className="mm-map-field" style={{ cursor: "pointer" }}>
            <span>Line jumps</span>
            <input
              type="checkbox"
              checked={lineJumps}
              onChange={onToggleLineJumps}
              aria-label="Line jumps where relationships cross"
            />
          </label>
        </div>

        {/* Diagram backdrop controls — shown only when the map has one (a singleton on the doc). */}
        {doc.backdrop && (onBackdropRings || onClearBackdrop) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="mm-map-section-title">Backdrop</div>
            <div className="mm-map-field">
              <span>{BACKDROP_LABELS[doc.backdrop.kind] ?? doc.backdrop.kind}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {(doc.backdrop.kind === "onion" || doc.backdrop.kind === "funnel") &&
                onBackdropRings ? (
                  <>
                    <button
                      type="button"
                      className="mm-map-control"
                      onClick={() => onBackdropRings(-1)}
                      title="Fewer rings / stages"
                      aria-label="Fewer rings"
                      style={{ cursor: "pointer" }}
                    >
                      −
                    </button>
                    {typeof doc.backdrop.rings === "number" ? (
                      <span
                        className="mm-mono"
                        style={{ minWidth: 14, textAlign: "center", color: "var(--ed-ink)" }}
                      >
                        {doc.backdrop.rings}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="mm-map-control"
                      onClick={() => onBackdropRings(1)}
                      title="More rings / stages"
                      aria-label="More rings"
                      style={{ cursor: "pointer" }}
                    >
                      +
                    </button>
                  </>
                ) : null}
                {onClearBackdrop ? (
                  <button
                    type="button"
                    className="mm-map-control"
                    onClick={onClearBackdrop}
                    title="Remove the backdrop"
                    style={{ cursor: "pointer" }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mm-stat-grid">
          <div className="mm-stat">
            <div className="mm-stat-num">{counts.total}</div>
            <div className="mm-stat-label">topics</div>
          </div>
          <div className="mm-stat">
            <div className="mm-stat-num">{branches}</div>
            <div className="mm-stat-label">{branches === 1 ? "branch" : "branches"}</div>
          </div>
        </div>
        {counts.withProgress > 0 && (
          <div className="mm-stat" style={{ flex: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Task progress</span>
              <span
                className="mm-mono"
                style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ed-accent)" }}
              >
                {counts.done}/{counts.withProgress}
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: "var(--ed-divider)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "var(--ed-accent)",
                  borderRadius: 999,
                  transition: "width .3s",
                }}
              />
            </div>
          </div>
        )}
        <div
          style={{
            fontSize: 12,
            color: "var(--ed-faint)",
            textAlign: "center",
            lineHeight: 1.7,
          }}
        >
          Click any node to inspect it
        </div>
      </div>
    </aside>
  );
}
