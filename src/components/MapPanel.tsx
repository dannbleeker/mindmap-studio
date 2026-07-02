import type { ChangeEvent } from "react";
import { CollapsibleSection } from "../Panels";
import { Menu, MenuItem, MenuLabel } from "../design/primitives";
import { designPreviewModel } from "../designPreview";
import { DESIGNS } from "../designs";
import { LAYOUT_PREVIEW_NODE_R, LAYOUT_PREVIEW_ROOT_R, layoutPreviewModel } from "../layoutPreview";
import type { LayoutKind } from "../mindmap";
import { type CanvasTheme, canvasThemes } from "../mindmap/theme";
import type { BackdropKind, BranchGrowth, MapNode, MindMapDoc } from "../model/types";
import type { CustomTheme } from "../store/customThemes";
import { InspectorResizer } from "./InspectorResizer";

/** A tiny themed thumbnail for a design in the gallery: the design's background, a root dot, and
 *  three palette branches drawn with its connector style — so designs are told apart at a glance
 *  instead of by an identical palette icon. Model is the pure designPreviewModel. Moved here from the
 *  Toolbar's Canvas menu (T3-25) so the map's look has one home. */
function DesignPreview({ design }: { design: (typeof DESIGNS)[number] }) {
  const m = designPreviewModel(design);
  return (
    <svg
      width={m.w}
      height={m.h}
      viewBox={`0 0 ${m.w} ${m.h}`}
      aria-hidden="true"
      style={{ flexShrink: 0, borderRadius: 3 }}
    >
      <rect width={m.w} height={m.h} rx={3} fill={m.bg} stroke="rgba(0,0,0,0.15)" />
      {m.branches.map((b) => (
        <g key={b.ty}>
          <path d={b.d} fill="none" stroke={b.color} strokeWidth={1.5} />
          <circle cx={b.tx} cy={b.ty} r={2.5} fill={b.color} />
        </g>
      ))}
      <circle cx={m.root.cx} cy={m.root.cy} r={m.root.r} fill={m.rootBg} />
    </svg>
  );
}

/** A layout's schematic thumbnail (10c) — a tiny SVG built from the pure layoutPreviewModel, coloured
 *  via the chrome's design tokens so it re-themes (unlike DESIGNS' theme-specific hex swatches, a
 *  layout icon has no "theme" of its own). Used as the gallery's per-row icon + the trigger preview. */
function LayoutPreview({ kind }: { kind: LayoutKind }) {
  const m = layoutPreviewModel(kind);
  return (
    <svg
      width={m.w}
      height={m.h}
      viewBox={`0 0 ${m.w} ${m.h}`}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {m.paths?.map((d) => (
        <path key={d} d={d} fill="none" stroke="var(--ed-faint)" strokeWidth={1.3} />
      ))}
      {m.lines.map((l) => (
        <line
          key={`${l.x1},${l.y1}-${l.x2},${l.y2}`}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="var(--ed-faint)"
          strokeWidth={1.3}
        />
      ))}
      {m.nodes.map((n) => (
        <circle
          key={`${n.cx},${n.cy}`}
          cx={n.cx}
          cy={n.cy}
          r={LAYOUT_PREVIEW_NODE_R}
          fill="var(--ed-muted)"
        />
      ))}
      {m.root ? (
        <circle cx={m.root.cx} cy={m.root.cy} r={LAYOUT_PREVIEW_ROOT_R} fill="var(--ed-accent)" />
      ) : null}
    </svg>
  );
}

/** Layout gallery rows, grouped exactly like the native select's optgroups (Radial / Tree / Diagram). */
const LAYOUT_GROUPS: { label: string; kinds: { kind: LayoutKind; name: string }[] }[] = [
  {
    label: "Radial",
    kinds: [
      { kind: "side", name: "Both sides" },
      { kind: "right", name: "Right" },
      { kind: "left", name: "Left" },
      { kind: "radial", name: "Radial / hub" },
    ],
  },
  {
    label: "Tree",
    kinds: [
      { kind: "org-down", name: "Org chart ↓" },
      { kind: "org-up", name: "Org chart ↑" },
    ],
  },
  {
    label: "Diagram",
    kinds: [
      { kind: "timeline", name: "Timeline" },
      { kind: "fishbone", name: "Fishbone" },
      { kind: "grid", name: "Grid / matrix" },
      { kind: "swimlane", name: "Swimlane" },
      { kind: "brace", name: "Brace map" },
    ],
  },
];
const LAYOUT_NAME: Record<string, string> = Object.fromEntries(
  LAYOUT_GROUPS.flatMap((g) => g.kinds.map(({ kind, name }) => [kind, name])),
);

type ConnectorStyle = "organic" | "curved" | "elbow" | "straight";
type FontScale = "compact" | "comfortable" | "large";

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
  customThemes = [],
  onManageThemes = () => {},
  onApplyDesign,
  layout,
  changeLayout,
  freeform,
  background,
  onSetBackground,
  accentColor,
  onSetAccentColor,
  onSetBackgroundImage,
  handleBackgroundImage,
  lineJumps,
  onToggleLineJumps,
  onSetConnectorStyle,
  onSetBranchGrowth,
  onSetFontFamily,
  onSetFontScale,
  onSetBackdrop,
  onRenameMap,
  onBackdropRings,
  onSetBackdropColor,
  onClearBackdrop,
  onMinimize,
  width,
  onResize,
  filteredCount,
}: {
  doc: MindMapDoc;
  theme: CanvasTheme;
  setThemeId: (id: string) => void;
  /** The user's saved custom themes (C3), shown after the built-ins in the Theme dropdown. */
  customThemes?: CustomTheme[];
  /** Open the theme designer (the dropdown's "Manage themes…" entry). */
  onManageThemes?: () => void;
  /** Apply a whole Design preset (theme + connector style + branch weight + accent) in one shot
   *  (T3-25 — moved here from the Toolbar's Canvas menu). Absent → the Design gallery is hidden. */
  onApplyDesign?: (id: string) => void;
  layout: LayoutKind;
  changeLayout: (v: LayoutKind) => void;
  freeform?: boolean;
  background?: string;
  onSetBackground: (color: string) => void;
  /** The map-wide accent colour (default tint for relationships + boundaries), or "" for the theme default. */
  accentColor?: string;
  onSetAccentColor: (color: string) => void;
  onSetBackgroundImage: (url: string) => void;
  handleBackgroundImage: (e: ChangeEvent<HTMLInputElement>) => void;
  lineJumps: boolean;
  onToggleLineJumps: () => void;
  /** Persistent map-wide styling (moved here from the Canvas menu so the map's look has one home). */
  onSetConnectorStyle: (style: ConnectorStyle) => void;
  onSetBranchGrowth: (weight: BranchGrowth) => void;
  onSetFontFamily: (family: string) => void;
  onSetFontScale: (scale: FontScale) => void;
  /** Create a diagram backdrop (ring/colour controls below appear once one exists). */
  onSetBackdrop?: (kind: BackdropKind) => void;
  onRenameMap: (title: string) => void;
  /** Add/remove a ring or stage on the current onion/funnel backdrop (no-op for venn). */
  onBackdropRings?: (delta: number) => void;
  /** Set (or reset, with "") the diagram backdrop's colour override. */
  onSetBackdropColor?: (color: string) => void;
  /** Remove the map's diagram backdrop. */
  onClearBackdrop?: () => void;
  onMinimize?: () => void;
  width?: number;
  onResize?: (next: number) => void;
  /** Matching-topic count when a Power Filter is active (whole-map total stays the denominator); the
   *  stats then read "N / M topics match" instead of silently showing the whole-map total. */
  filteredCount?: number;
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
          {onApplyDesign ? (
            <div className="mm-map-field">
              <span>Design</span>
              {/* One-shot preset: sets theme + connector style + branch weight + accent together
                  (T3-25 — moved here from the Toolbar's Canvas menu so the map's look has one home). */}
              <Menu
                trigger={<>Choose a preset…</>}
                triggerClassName="mm-map-control mm-layout-trigger"
                triggerAriaLabel="Apply a design preset"
                triggerTitle="Apply a design preset (theme + connectors + branch weight + accent)"
                menuAriaLabel="Design presets"
              >
                {DESIGNS.map((d) => (
                  <MenuItem
                    key={d.id}
                    icon={<DesignPreview design={d} />}
                    label={d.name}
                    title={d.note}
                    onSelect={() => onApplyDesign(d.id)}
                  />
                ))}
              </Menu>
            </div>
          ) : null}
          <label className="mm-map-field">
            <span>Theme</span>
            <select
              className="mm-map-control"
              value={theme.id}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__manage__") {
                  onManageThemes();
                  return;
                }
                setThemeId(v);
                // A custom theme also carries a font + branch weight — apply them like a Design (C3).
                const ct = customThemes.find((c) => c.id === v);
                if (ct) {
                  onSetFontFamily(ct.fontFamily);
                  onSetBranchGrowth(ct.branchGrowth);
                }
              }}
              aria-label="Canvas theme"
            >
              {canvasThemes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              {customThemes.length > 0 ? (
                <optgroup label="Custom">
                  {customThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <option value="__manage__">Manage themes…</option>
            </select>
          </label>
          {/* A plain div, not <label> — the Menu trigger below carries its own aria-label (like the
              Background/Accent fields), so wrapping it in a <label> would be a redundant, unlinked
              association (the trigger isn't a native form control the label can associate with). */}
          <div className="mm-map-field">
            <span>Layout</span>
            {/* A visual gallery (SVG thumbnails, 10c) instead of a text-only select — layout is
                inherently spatial, so seeing the shape beats reading its name. */}
            <Menu
              trigger={
                <>
                  <LayoutPreview kind={layout} />
                  {LAYOUT_NAME[layout] ?? layout}
                </>
              }
              triggerClassName="mm-map-control mm-layout-trigger"
              triggerAriaLabel="Layout"
              disabled={!!freeform}
              triggerTitle={freeform ? "Auto-layout is paused (Free layout is on)" : "Layout"}
              menuAriaLabel="Choose a layout"
            >
              {LAYOUT_GROUPS.map((g) => (
                <div key={g.label}>
                  <MenuLabel>{g.label}</MenuLabel>
                  {g.kinds.map(({ kind, name }) => (
                    <MenuItem
                      key={kind}
                      icon={<LayoutPreview kind={kind} />}
                      label={name}
                      onSelect={() => changeLayout(kind)}
                    />
                  ))}
                </div>
              ))}
            </Menu>
          </div>
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
          {/* Accent — the default tint for relationship lines + boundary boxes. Previously only
              settable as a side effect of a whole Design preset; now a standalone control. */}
          <div className="mm-map-field">
            <span>Accent</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="color"
                className="mm-map-control"
                value={accentColor || "#1b8a5e"}
                onChange={(e) => onSetAccentColor(e.target.value)}
                aria-label="Accent colour"
                style={{ padding: 1, width: 34, height: 24 }}
              />
              {accentColor ? (
                <button
                  type="button"
                  className="mm-map-control"
                  onClick={() => onSetAccentColor("")}
                  title="Reset accent colour"
                  style={{ cursor: "pointer" }}
                >
                  Reset
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {/* Progressive disclosure: the high-frequency controls (Theme/Layout/Background/Accent) stay
            visible; the rest tuck behind a collapsed disclosure so the panel isn't an 11-control wall. */}
        <CollapsibleSection label="More styling" defaultOpen={false}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
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
            {/* Connector style / branch weight / type — moved here from the Canvas menu (T5) so the
              map's persistent styling lives in one place. The Canvas menu now keeps only Design
              presets + Free layout and points here. */}
            <label className="mm-map-field">
              <span>Connectors</span>
              <select
                className="mm-map-control"
                value={doc.meta?.connectorStyle ?? "organic"}
                onChange={(e) => onSetConnectorStyle(e.target.value as ConnectorStyle)}
                aria-label="Connector style"
              >
                <option value="organic">Organic</option>
                <option value="curved">Curved</option>
                <option value="elbow">Elbow</option>
                <option value="straight">Straight</option>
              </select>
            </label>
            <label className="mm-map-field">
              <span>Branch weight</span>
              <select
                className="mm-map-control"
                value={doc.meta?.branchGrowth ?? "regular"}
                onChange={(e) => onSetBranchGrowth(e.target.value as BranchGrowth)}
                aria-label="Branch growth weight"
              >
                <option value="fine">Fine</option>
                <option value="regular">Regular</option>
                <option value="bold">Bold</option>
              </select>
            </label>
            <label className="mm-map-field">
              <span>Font</span>
              <select
                className="mm-map-control"
                value={doc.meta?.fontFamily ?? ""}
                onChange={(e) => onSetFontFamily(e.target.value)}
                aria-label="Base font family"
                title="Map-wide base font (a per-topic font still overrides it)"
              >
                <option value="">Default</option>
                <option value="Inter, system-ui, sans-serif">Sans</option>
                <option value="Georgia, 'Times New Roman', serif">Serif</option>
                <option value="'Courier New', ui-monospace, monospace">Mono</option>
              </select>
            </label>
            <label className="mm-map-field">
              <span>Text size</span>
              <select
                className="mm-map-control"
                value={doc.meta?.fontScale ?? "comfortable"}
                onChange={(e) => onSetFontScale(e.target.value as FontScale)}
                aria-label="Font size scale"
                title="Map-wide text size (a per-topic size still overrides it)"
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="large">Large</option>
              </select>
            </label>
            {!doc.backdrop && onSetBackdrop ? (
              <label className="mm-map-field">
                <span>Backdrop</span>
                <select
                  className="mm-map-control"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) onSetBackdrop(e.target.value as BackdropKind);
                  }}
                  aria-label="Add a diagram backdrop"
                >
                  <option value="">None</option>
                  <option value="onion">Onion (rings)</option>
                  <option value="funnel">Funnel (stages)</option>
                  <option value="venn2">Venn (2 circles)</option>
                  <option value="venn3">Venn (3 circles)</option>
                </select>
              </label>
            ) : null}
          </div>
        </CollapsibleSection>

        {/* Diagram backdrop controls — shown only when the map has one (a singleton on the doc). */}
        {doc.backdrop && (onBackdropRings || onClearBackdrop || onSetBackdropColor) ? (
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
            {onSetBackdropColor ? (
              <div className="mm-map-field">
                <span>Colour</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="color"
                    className="mm-map-control"
                    // Default-accent placeholder (BACKDROP_STROKE) until an override is set.
                    value={doc.backdrop.color || "#9a93d6"}
                    onChange={(e) => onSetBackdropColor(e.target.value)}
                    aria-label="Backdrop colour"
                    style={{ padding: 1, width: 34, height: 24 }}
                  />
                  {doc.backdrop.color ? (
                    <button
                      type="button"
                      className="mm-map-control"
                      onClick={() => onSetBackdropColor("")}
                      title="Reset backdrop colour"
                      style={{ cursor: "pointer" }}
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mm-stat-grid">
          <div className="mm-stat">
            <div className="mm-stat-num">
              {filteredCount != null ? `${filteredCount}/${counts.total}` : counts.total}
            </div>
            {/* A Power Filter narrows the canvas; say so instead of silently showing whole-map totals. */}
            <div className="mm-stat-label">{filteredCount != null ? "topics match" : "topics"}</div>
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
          Select a topic to edit it
        </div>
      </div>
    </aside>
  );
}
