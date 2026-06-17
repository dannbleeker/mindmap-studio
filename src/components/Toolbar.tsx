import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { BrainstormTimer } from "../BrainstormTimer";
import { buildExample, examples } from "../examples";
import type { LayoutKind, MindMapHandle, SelectedNode } from "../mindmap";
import { canvasThemes } from "../mindmap/theme";
import type { CanvasTheme } from "../mindmap/theme";
import type { BackdropKind, MindMapDoc } from "../model/types";
import type { MapSummary } from "../store/mapStore";
import { buildTemplate, templates } from "../templates";
import { EditorIcon, type EditorIconName } from "./EditorIcons";

// The redesigned editor top bar — a two-row chrome in the warm-cream + emerald language (see
// design/editor.css, .mm-topbar*). Row 1 is file/identity (Start, map switcher, New, Find, Export,
// More); row 2 is view/edit/canvas, grouped into labelled dropdown menus so every existing control
// keeps a home without a wall of buttons. The component is still a pure prop-driven view: it owns no
// model state (the menus' open/close + BrainstormTimer are local UI only), and the ToolbarProps
// contract is unchanged from the previous toolbar, so App's wiring is untouched. Nothing the old
// toolbar could do was dropped — controls were re-homed, not removed.

/** Show/hide flags + setters for the side panels and the canvas-numbering toggle. */
export interface ToolbarPanels {
  outlineOpen: boolean;
  setOutlineOpen: (fn: (v: boolean) => boolean) => void;
  indexOpen: boolean;
  setIndexOpen: (fn: (v: boolean) => boolean) => void;
  filterOpen: boolean;
  toggleFilter: () => void;
  stylesOpen: boolean;
  setStylesOpen: (fn: (v: boolean) => boolean) => void;
  historyOpen: boolean;
  setHistoryOpen: (fn: (v: boolean) => boolean) => void;
  boardOpen: boolean;
  setBoardOpen: (fn: (v: boolean) => boolean) => void;
  infoOpen: boolean;
  setInfoOpen: (fn: (v: boolean) => boolean) => void;
  infoMinimized: boolean;
  setInfoMinimized: (fn: (v: boolean) => boolean) => void;
  numbered: boolean;
  setNumbered: (fn: (v: boolean) => boolean) => void;
}

/** Map/library state + the map-level actions (open, new, sheets, duplicate, delete, present, roll-ups). */
export interface ToolbarMap {
  doc: MindMapDoc;
  liveDoc: MindMapDoc;
  maps: MapSummary[];
  mapOptions: MapSummary[];
  switchMap: (id: string) => void;
  addSheet: () => void;
  /** Load a new doc from a template/example builder (the "+ New…" menu). */
  load: (doc: MindMapDoc) => void;
  duplicateMap: () => void;
  deleteCurrent: () => void;
  present: () => void;
  refreshRollupsNow: () => void;
}

/** Canvas-styling controls: theme, layout, branch focus, the per-node image picker. */
export interface ToolbarCanvas {
  theme: CanvasTheme;
  setThemeId: (id: string) => void;
  layout: LayoutKind;
  changeLayout: (value: LayoutKind) => void;
  selected: SelectedNode | null;
  setFocus: (focus: { id: string; topic: string }) => void;
  /** Per-node image picker (the "Image" label control). */
  handleImage: (event: ChangeEvent<HTMLInputElement>) => void;
  /** Per-map canvas background image picker. */
  handleBackgroundImage: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** The find / replace form state + actions. */
export interface ToolbarFind {
  query: string;
  setQuery: (value: string) => void;
  replaceWith: string;
  setReplaceWith: (value: string) => void;
  matchInfo: string;
  runSearch: (event: FormEvent) => void;
  runReplace: () => void;
}

/** File I/O: the export menu's per-format handlers + library backup / copy / open. */
export interface ToolbarIo {
  exportJson: () => void;
  exportMarkdown: () => void;
  exportMermaid: () => void;
  exportXmind: () => void;
  exportSmmx: () => void;
  exportOpml: () => void;
  exportFreemind: () => void;
  exportPng: () => void;
  exportSvg: () => void;
  exportHtml: () => void;
  exportInteractiveHtml: () => void;
  exportDeck: () => void;
  exportPdf: () => void;
  exportDocx: () => void;
  exportPptx: () => void;
  exportXlsx: () => void;
  exportLibrary: () => void;
  copyOutline: () => void;
  handleFile: (event: ChangeEvent<HTMLInputElement>) => void;
}

export interface ToolbarProps {
  /** Phone-width: rows scroll horizontally instead of wrapping. */
  isMobile: boolean;
  /** The canvas handle — most canvas controls are thin `mapRef.current?.X()` calls. */
  mapRef: RefObject<MindMapHandle | null>;
  nav: {
    goHome: () => void;
    openAbout: () => void;
    openSearchAll: () => void;
    openPaste: () => void;
  };
  panels: ToolbarPanels;
  map: ToolbarMap;
  canvas: ToolbarCanvas;
  find: ToolbarFind;
  io: ToolbarIo;
  /** Transient hint toast (used by the group/summary/note/roll-up actions). */
  showHint: (message: string) => void;
}

// ── primitives ───────────────────────────────────────────────────────────────
function TBtn({
  icon,
  label,
  text,
  active,
  danger,
  ghost,
  primary,
  disabled,
  onClick,
}: {
  icon?: EditorIconName;
  label: string;
  text?: string;
  active?: boolean;
  danger?: boolean;
  ghost?: boolean;
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const cls = [
    "mm-tbtn",
    icon && !text ? "mm-tbtn-icon" : "",
    danger ? "mm-tbtn-danger" : "",
    ghost ? "mm-tbtn-ghost" : "",
    primary ? "mm-tbtn-primary" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={cls}
      title={label}
      aria-label={text ? undefined : label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {icon && <EditorIcon name={icon} size={17} />}
      {text}
    </button>
  );
}

/** A dropdown menu anchored to a trigger button; closes on outside-click or Escape. */
function Menu({
  icon,
  label,
  align = "left",
  children,
}: {
  icon?: EditorIconName;
  label: string;
  align?: "left" | "right";
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Fixed-positioned menu coordinates, computed from the trigger button on open.
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const place = useCallback(() => {
    const b = btnRef.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    setPos(
      align === "left"
        ? { top: r.bottom + 4, left: r.left }
        : { top: r.bottom + 4, right: window.innerWidth - r.right },
    );
  }, [align]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);
  return (
    <div className="mm-menu-wrap" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        className="mm-tbtn mm-tbtn-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={() => {
          if (!open) place();
          setOpen((o) => !o);
        }}
      >
        {icon && <EditorIcon name={icon} size={16} />}
        {label}
        <EditorIcon name="chevron" size={13} />
      </button>
      {open && pos && (
        <div className="mm-menu" role="menu" style={pos}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon?: EditorIconName;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={danger ? "mm-menu-item mm-menu-item-danger" : "mm-menu-item"}
      onClick={onClick}
    >
      {icon && <EditorIcon name={icon} size={15} />}
      {label}
    </button>
  );
}

export function Toolbar({
  isMobile,
  mapRef,
  nav,
  panels,
  map,
  canvas,
  find,
  io,
  showHint,
}: ToolbarProps) {
  const { liveDoc, doc } = map;
  const m = () => mapRef.current;

  const EXPORTS: { group: string; items: [string, () => void][] }[] = [
    {
      group: "Data & outline",
      items: [
        [".json (lossless)", io.exportJson],
        [".md (Markdown)", io.exportMarkdown],
        [".opml (outline)", io.exportOpml],
        [".mm (FreeMind/Freeplane)", io.exportFreemind],
        [".mmd (Mermaid)", io.exportMermaid],
        [".xmind (XMind)", io.exportXmind],
        [".smmx (SimpleMind)", io.exportSmmx],
      ],
    },
    {
      group: "Image",
      items: [
        [".png (image)", io.exportPng],
        [".svg (vector)", io.exportSvg],
      ],
    },
    {
      group: "Document",
      items: [
        [".html (standalone)", io.exportHtml],
        [".html (interactive)", io.exportInteractiveHtml],
        [".pdf (print)", io.exportPdf],
        [".docx (Word)", io.exportDocx],
        [".xlsx (Excel)", io.exportXlsx],
      ],
    },
    {
      group: "Presentation",
      items: [
        [".html (slide deck)", io.exportDeck],
        [".pptx (PowerPoint)", io.exportPptx],
      ],
    },
  ];

  return (
    <header className="mm-topbar">
      {/* ── Row 1 — file / identity ── */}
      <div className="mm-topbar-row mm-topbar-row1">
        <TBtn
          icon="home"
          label="Start screen — new maps, templates, library"
          onClick={nav.goHome}
        />
        <span className="mm-crumb">Maps /</span>
        <select
          className="mm-select"
          value={doc.id}
          onChange={(e) => map.switchMap(e.target.value)}
          aria-label="Open map"
          title="Switch map"
          style={{ fontWeight: 700, maxWidth: 220 }}
        >
          {map.mapOptions.map((mm) => (
            <option key={mm.id} value={mm.id}>
              {mm.title || "(untitled)"}
            </option>
          ))}
        </select>
        <select
          className="mm-select"
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) map.load(v.startsWith("ex:") ? buildExample(v.slice(3)) : buildTemplate(v));
          }}
          aria-label="New map from a template or example"
          title="New map (blank template or worked example)"
        >
          <option value="">+ New…</option>
          <optgroup label="Templates">
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Examples">
            {examples.map((e) => (
              <option key={e.id} value={`ex:${e.id}`}>
                {e.name}
              </option>
            ))}
          </optgroup>
        </select>
        <TBtn
          icon="search"
          label="Search across every map"
          text="All maps"
          ghost
          onClick={nav.openSearchAll}
        />
        <span className="mm-saved">
          <span className="mm-saved-dot" /> Saved locally
        </span>
        <span className="mm-grow" />
        <form onSubmit={find.runSearch} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            className="mm-input"
            value={find.query}
            onChange={(e) => find.setQuery(e.target.value)}
            placeholder="Find…"
            aria-label="Find node"
            style={{ width: 96 }}
          />
          <input
            className="mm-input"
            value={find.replaceWith}
            onChange={(e) => find.setReplaceWith(e.target.value)}
            placeholder="Replace…"
            aria-label="Replace with"
            style={{ width: 96 }}
          />
          <TBtn
            label="Replace the find text in every matching topic"
            text="Replace all"
            ghost
            onClick={find.runReplace}
          />
          {find.matchInfo && (
            <span style={{ fontSize: 11, color: "var(--ed-muted)" }}>{find.matchInfo}</span>
          )}
        </form>
        <Menu icon="export" label="Export" align="right">
          {(close) => (
            <>
              {EXPORTS.map((g) => (
                <div key={g.group}>
                  <div className="mm-menu-label">{g.group}</div>
                  {g.items.map(([lbl, fn]) => (
                    <MenuItem
                      key={lbl}
                      label={lbl}
                      onClick={() => {
                        fn();
                        close();
                      }}
                    />
                  ))}
                </div>
              ))}
            </>
          )}
        </Menu>
        <Menu icon="dots" label="More" align="right">
          {(close) => (
            <>
              <div className="mm-menu-label">Map</div>
              <MenuItem
                icon="present"
                label="Present"
                onClick={() => {
                  map.present();
                  close();
                }}
              />
              <MenuItem
                icon="copy"
                label="Duplicate map"
                onClick={() => {
                  map.duplicateMap();
                  close();
                }}
              />
              <MenuItem
                icon="grid"
                label="Add sheet to workbook"
                onClick={() => {
                  map.addSheet();
                  close();
                }}
              />
              <MenuItem
                icon="trash"
                label="Delete map"
                danger
                onClick={() => {
                  map.deleteCurrent();
                  close();
                }}
              />
              <div className="mm-menu-sep" />
              <div className="mm-menu-label">Import / backup</div>
              <label className="mm-menu-item">
                <EditorIcon name="import" size={15} /> Open files…
                <input
                  id="mmap-input"
                  type="file"
                  accept=".mmap,.mmp,.md,.markdown,.json,.opml,.mm,.mmd,.mermaid,.xmind,.smmx,.docx,.xlsx,.itmz,.mind,.mup,.textpack,.textbundle"
                  multiple
                  onChange={(e) => {
                    io.handleFile(e);
                    close();
                  }}
                  style={{ display: "none" }}
                />
              </label>
              <MenuItem
                icon="paste"
                label="Paste text → topics"
                onClick={() => {
                  nav.openPaste();
                  close();
                }}
              />
              <MenuItem
                icon="copy"
                label="Copy outline to clipboard"
                onClick={() => {
                  io.copyOutline();
                  close();
                }}
              />
              <MenuItem
                icon="export"
                label="Back up whole library"
                onClick={() => {
                  io.exportLibrary();
                  close();
                }}
              />
              <div className="mm-menu-sep" />
              <MenuItem
                icon="help"
                label="About MindMap Studio"
                onClick={() => {
                  nav.openAbout();
                  close();
                }}
              />
            </>
          )}
        </Menu>
      </div>

      {/* ── Row 2 — view / edit / canvas ── */}
      <div className={`mm-topbar-row mm-topbar-row2${isMobile ? "" : " mm-wrap"}`}>
        <Menu icon="layers" label="Panels">
          {() => (
            <>
              <div className="mm-menu-label">Side panels</div>
              <PanelToggle
                label="Outline"
                icon="layers"
                on={panels.outlineOpen}
                onClick={() => panels.setOutlineOpen((v) => !v)}
              />
              <PanelToggle
                label="Markers & tags index"
                icon="grid"
                on={panels.indexOpen}
                onClick={() => panels.setIndexOpen((v) => !v)}
              />
              <PanelToggle
                label="Power Filter"
                icon="filter"
                on={panels.filterOpen}
                onClick={panels.toggleFilter}
              />
              <PanelToggle
                label="Conditional styles"
                icon="palette"
                on={panels.stylesOpen}
                onClick={() => panels.setStylesOpen((v) => !v)}
              />
              <PanelToggle
                label="Version history"
                icon="history"
                on={panels.historyOpen}
                onClick={() => panels.setHistoryOpen((v) => !v)}
              />
              <PanelToggle
                label="Board (Kanban)"
                icon="board"
                on={panels.boardOpen}
                onClick={() => panels.setBoardOpen((v) => !v)}
              />
              <PanelToggle
                label="Topic info / inspector"
                icon="note"
                on={panels.infoOpen || panels.infoMinimized}
                onClick={() => {
                  // One clean toggle: if shown (panel OR minimized strip) close both; else open.
                  const shown = panels.infoOpen || panels.infoMinimized;
                  panels.setInfoMinimized(() => false);
                  panels.setInfoOpen(() => !shown);
                }}
              />
            </>
          )}
        </Menu>
        <span className="mm-vdiv" />
        <div className="mm-cluster">
          <TBtn icon="fit" label="Fit map to screen" onClick={() => m()?.fit()} />
          <TBtn
            icon="minus"
            label="Collapse all branches"
            onClick={() => m()?.setAllExpanded(false)}
          />
          <TBtn icon="plus" label="Expand all branches" onClick={() => m()?.setAllExpanded(true)} />
          <TBtn
            icon="balance"
            label="Focus the selected branch (dim the rest)"
            disabled={!canvas.selected}
            onClick={() =>
              canvas.selected &&
              canvas.setFocus({ id: canvas.selected.id, topic: canvas.selected.topic })
            }
          />
          <TBtn
            icon="check"
            label="Outline numbering (1, 1.2, 1.2.3…)"
            active={panels.numbered}
            onClick={() => panels.setNumbered((v) => !v)}
          />
          <TBtn
            icon="link"
            label="Line jumps where relationships cross"
            active={!!liveDoc.meta?.lineJumps}
            onClick={() => m()?.setLineJumps(!liveDoc.meta?.lineJumps)}
          />
        </div>
        <span className="mm-vdiv" />
        <Menu icon="plus" label="Insert">
          {(close) => (
            <>
              <MenuItem
                icon="note"
                label="Sticky note"
                onClick={() => {
                  m()?.addStickyNote();
                  showHint("Sticky note added — drag it anywhere.");
                  close();
                }}
              />
              <MenuItem
                icon="layers"
                label="Group branch (boundary)"
                onClick={() => {
                  const id = canvas.selected?.id;
                  const ok = id ? m()?.groupBranch(id) : false;
                  showHint(
                    ok
                      ? "Branch grouped — double-click the label to rename."
                      : "Select a node first, then group its branch.",
                  );
                  close();
                }}
              />
              <MenuItem
                icon="balance"
                label="Summary bracket"
                onClick={() => {
                  const id = canvas.selected?.id;
                  const ok = id ? m()?.groupSummary(id) : false;
                  showHint(
                    ok
                      ? "Summary added — double-click its label to rename."
                      : "Select a node first, then summarise its branch.",
                  );
                  close();
                }}
              />
              <label className="mm-menu-item">
                <EditorIcon name="image" size={15} /> Image on selected node…
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    canvas.handleImage(e);
                    close();
                  }}
                  style={{ display: "none" }}
                />
              </label>
              <div className="mm-menu-sep" />
              <div className="mm-menu-label">Roll-up (mirror another map)</div>
              <div style={{ padding: "2px 6px" }}>
                <select
                  className="mm-select"
                  style={{ width: "100%" }}
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    const ok = canvas.selected?.id
                      ? m()?.setSelectedRollup(v === "none" ? "" : v)
                      : false;
                    showHint(
                      !ok
                        ? "Select a node first, then bind a roll-up source."
                        : v === "none"
                          ? "Roll-up unbound."
                          : "Bound — refresh to pull the latest.",
                    );
                    close();
                  }}
                  aria-label="Bind roll-up source"
                >
                  <option value="">Bind source map…</option>
                  {map.maps
                    .filter((mm) => mm.id !== liveDoc.id)
                    .map((mm) => (
                      <option key={mm.id} value={mm.id}>
                        {mm.title || "(untitled)"}
                      </option>
                    ))}
                  <option value="none">— Unbind</option>
                </select>
              </div>
              <MenuItem
                icon="history"
                label="Refresh all roll-ups"
                onClick={() => {
                  map.refreshRollupsNow();
                  close();
                }}
              />
            </>
          )}
        </Menu>
        <Menu icon="palette" label="Canvas">
          {(close) => (
            <>
              <div className="mm-menu-label">Theme</div>
              <div style={{ padding: "2px 6px" }}>
                <select
                  className="mm-select"
                  style={{ width: "100%" }}
                  value={canvas.theme.id}
                  onChange={(e) => canvas.setThemeId(e.target.value)}
                  aria-label="Canvas theme"
                >
                  {canvasThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mm-menu-label">Background</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px" }}>
                <input
                  type="color"
                  aria-label="Canvas background colour"
                  value={liveDoc.meta?.background || "#ffffff"}
                  onChange={(e) => m()?.setBackground(e.target.value)}
                  style={{
                    width: 28,
                    height: 22,
                    border: "none",
                    background: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                />
                <button
                  type="button"
                  className="mm-tbtn"
                  style={{ height: 26 }}
                  onClick={() => m()?.setBackground("")}
                >
                  Reset
                </button>
                <label
                  className="mm-tbtn"
                  style={{ height: 26, cursor: "pointer" }}
                  title="Background image"
                >
                  <EditorIcon name="image" size={15} />
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Canvas background image"
                    onChange={(e) => {
                      canvas.handleBackgroundImage(e);
                      close();
                    }}
                    style={{ display: "none" }}
                  />
                </label>
                {liveDoc.meta?.backgroundImage ? (
                  <button
                    type="button"
                    className="mm-tbtn"
                    style={{ height: 26 }}
                    onClick={() => m()?.setBackgroundImage("")}
                  >
                    Clear img
                  </button>
                ) : null}
              </div>
              <div className="mm-menu-sep" />
              <PanelToggle
                label="Free layout (whiteboard)"
                icon="hand"
                on={!!liveDoc.meta?.freeform}
                onClick={() => m()?.setFreeform(!liveDoc.meta?.freeform)}
              />
              <div className="mm-menu-label">Diagram backdrop</div>
              <div style={{ padding: "2px 6px" }}>
                <select
                  className="mm-select"
                  style={{ width: "100%" }}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) m()?.setBackdrop(e.target.value as BackdropKind);
                  }}
                  aria-label="Add a diagram backdrop"
                >
                  <option value="">Add backdrop…</option>
                  <option value="onion">Onion (rings)</option>
                  <option value="funnel">Funnel (stages)</option>
                  <option value="venn2">Venn (2 circles)</option>
                  <option value="venn3">Venn (3 circles)</option>
                </select>
              </div>
              {liveDoc.backdrop ? (
                <div style={{ display: "flex", gap: 6, padding: "4px 10px" }}>
                  {liveDoc.backdrop.kind === "onion" || liveDoc.backdrop.kind === "funnel" ? (
                    <>
                      <button
                        type="button"
                        className="mm-tbtn"
                        style={{ height: 26 }}
                        onClick={() => m()?.setBackdropRings(-1)}
                      >
                        − ring
                      </button>
                      <button
                        type="button"
                        className="mm-tbtn"
                        style={{ height: 26 }}
                        onClick={() => m()?.setBackdropRings(1)}
                      >
                        + ring
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="mm-tbtn"
                    style={{ height: 26 }}
                    onClick={() => {
                      m()?.clearBackdrop();
                      close();
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </>
          )}
        </Menu>
        <span className="mm-grow" />
        <span className="mm-eyebrow">Layout</span>
        <select
          className="mm-select"
          value={canvas.layout}
          onChange={(e) => canvas.changeLayout(e.target.value as LayoutKind)}
          aria-label="Layout"
          title={liveDoc.meta?.freeform ? "Auto-layout is paused (Free layout is on)" : "Layout"}
          disabled={!!liveDoc.meta?.freeform}
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
        <span className="mm-vdiv" />
        <input
          className="mm-input"
          placeholder="Quick add… ⏎"
          aria-label="Quick add topic"
          title="Type a topic and press Enter to add it under the selection (or the central topic)."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = e.currentTarget.value.trim();
              if (v) {
                m()?.quickAdd(v);
                e.currentTarget.value = "";
              }
            }
          }}
          style={{ width: 130 }}
        />
        <BrainstormTimer />
      </div>
    </header>
  );
}

function PanelToggle({
  label,
  icon,
  on,
  onClick,
}: {
  label: string;
  icon: EditorIconName;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={on}
      className="mm-menu-item"
      onClick={onClick}
      style={on ? { color: "var(--ed-accent)", background: "var(--ed-accent-tint)" } : undefined}
    >
      <EditorIcon name={icon} size={15} />
      {label}
      {on && <EditorIcon name="check" size={14} />}
    </button>
  );
}
