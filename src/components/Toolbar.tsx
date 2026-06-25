import type { ChangeEvent, FormEvent, ReactNode, RefObject } from "react";
import { BrainstormTimer } from "../BrainstormTimer";
import { Menu, MenuCheckboxItem, MenuItem, MenuLabel, MenuSeparator } from "../design/primitives";
import { designPreviewModel } from "../designPreview";
import { DESIGNS } from "../designs";
import { buildExample, examples } from "../examples";
import { MAP_PARTS, buildMapPart } from "../mapParts";
import type { LayoutKind, MindMapHandle, SelectedNode } from "../mindmap";
import { canvasThemes } from "../mindmap/theme";
import type { CanvasTheme } from "../mindmap/theme";
import type { BackdropKind, BranchGrowth, MindMapDoc } from "../model/types";
import type { MapSummary } from "../store/mapStore";
import { buildTemplate, templates } from "../templates";
import { EditorIcon, type EditorIconName } from "./EditorIcons";

// A tiny themed thumbnail for a design in the gallery (#5): the design's background, a root dot, and
// three palette branches drawn with its connector style — so designs are told apart at a glance
// instead of by an identical palette icon. Model is the pure designPreviewModel.
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
  statsOpen: boolean;
  setStatsOpen: (fn: (v: boolean) => boolean) => void;
  agendaOpen: boolean;
  setAgendaOpen: (fn: (v: boolean) => boolean) => void;
  mapsOpen: boolean;
  setMapsOpen: (fn: (v: boolean) => boolean) => void;
  deckEditorOpen: boolean;
  setDeckEditorOpen: (fn: (v: boolean) => boolean) => void;
  noteEditorOpen: boolean;
  setNoteEditorOpen: (fn: (v: boolean) => boolean) => void;
  infoOpen: boolean;
  setInfoOpen: (fn: (v: boolean) => boolean) => void;
  infoMinimized: boolean;
  setInfoMinimized: (fn: (v: boolean) => boolean) => void;
  numbered: boolean;
  setNumbered: (fn: (v: boolean) => boolean) => void;
  spellcheck: boolean;
  setSpellcheck: (fn: (v: boolean) => boolean) => void;
}

/** Map/library state + the map-level actions (open, new, duplicate, delete, present, roll-ups). */
export interface ToolbarMap {
  doc: MindMapDoc;
  liveDoc: MindMapDoc;
  maps: MapSummary[];
  mapOptions: MapSummary[];
  switchMap: (id: string) => void;
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
  /** Format Painter: copy the selected topic's style / paste it across the selection. */
  copyFormat: () => void;
  pasteFormat: () => void;
  /** Whether a style has been copied (enables "Paste format"). */
  canPasteFormat: boolean;
  /** Auto-colour the top branches from the theme palette. */
  shuffleBranchColors: () => void;
  /** Apply a design preset (theme + connector style) from the gallery. */
  applyDesign: (id: string) => void;
  /** Drill in: re-root the canvas view at the selected topic (focus-on-topic). */
  drillIn: () => void;
  /** Start the guided walk (step through every topic in outline order with a spotlight + notes). */
  startWalk: () => void;
  /** Align / distribute the selected free-canvas nodes (freeform mode). */
  alignSelection: (mode: "left" | "hcenter" | "right" | "top" | "vmiddle" | "bottom") => void;
  distributeSelection: (axis: "h" | "v") => void;
  /** How many nodes are selected + whether the map is in free-canvas mode (gates the Arrange tools). */
  selectedCount: number;
  freeform: boolean;
}

/** The find / replace form state + actions. */
export interface ToolbarFind {
  query: string;
  setQuery: (value: string) => void;
  replaceWith: string;
  setReplaceWith: (value: string) => void;
  replaceScope: "topics" | "notes" | "both";
  setReplaceScope: (value: "topics" | "notes" | "both") => void;
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
  exportMmap: () => void;
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
  copyTable: () => void;
  handleFile: (event: ChangeEvent<HTMLInputElement>) => void;
  /** Native disk-file actions (File System Access API, with a download/upload fallback). */
  openFile: () => void;
  saveFile: () => void;
  saveFileAs: () => void;
  /** The active map's linked file name (null = library-only) + whether it's unsaved to disk. */
  fileName: string | null;
  dirty: boolean;
}

/** Saved views (bookmarked perspectives) for the View menu. */
export interface ToolbarViews {
  list: { id: string; name: string }[];
  /** Capture + name the current view (App prompts for the name). */
  onSave: () => void;
  /** Jump to a saved view by id. */
  onApply: (id: string) => void;
  onDelete: (id: string) => void;
}

export interface ToolbarProps {
  /** Phone-width: rows scroll horizontally instead of wrapping. */
  isMobile: boolean;
  /** The canvas handle — most canvas controls are thin `mapRef.current?.X()` calls. */
  mapRef: RefObject<MindMapHandle | null>;
  nav: {
    goHome: () => void;
    openAbout: () => void;
    openShortcuts: () => void;
    openSearchAll: () => void;
    openPaste: () => void;
  };
  panels: ToolbarPanels;
  map: ToolbarMap;
  canvas: ToolbarCanvas;
  find: ToolbarFind;
  io: ToolbarIo;
  views: ToolbarViews;
  /** Undo / redo for the Row-1 buttons. canUndo/canRedo are reported live from the canvas history so
   *  the buttons disable correctly; undo/redo fire the action and a transient "Undone"/"Redone" toast. */
  history: { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void };
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

/** A toolbar dropdown trigger's inner content (icon + label + chevron); the accessible name is the
 *  label text, matching the old inline trigger so the menu a11y parity net stays green. */
function menuTrigger(icon: EditorIconName, label: string): ReactNode {
  return (
    <>
      <EditorIcon name={icon} size={16} />
      {label}
      <EditorIcon name="chevron" size={13} />
    </>
  );
}

/** A 15px editor icon node for a menu item's leading glyph. */
function mi(name: EditorIconName): ReactNode {
  return <EditorIcon name={name} size={15} />;
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
  views,
  history,
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
        [".mmap (MindManager)", io.exportMmap],
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
        <TBtn
          icon="undo"
          label="Undo (Ctrl/⌘+Z)"
          disabled={!history.canUndo}
          onClick={history.undo}
        />
        <TBtn
          icon="redo"
          label="Redo (Ctrl/⌘+Shift+Z)"
          disabled={!history.canRedo}
          onClick={history.redo}
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
          <select
            className="mm-input"
            value={find.replaceScope}
            onChange={(e) => find.setReplaceScope(e.target.value as "topics" | "notes" | "both")}
            aria-label="Replace scope"
            title="Where to replace: topics, notes, or both"
            style={{ width: 78 }}
          >
            <option value="topics">Topics</option>
            <option value="notes">Notes</option>
            <option value="both">Both</option>
          </select>
          <TBtn
            label="Replace the find text in every match (topics and/or notes per scope)"
            text="Replace all"
            ghost
            onClick={find.runReplace}
          />
          {find.matchInfo && (
            <span style={{ fontSize: 11, color: "var(--ed-muted)" }}>{find.matchInfo}</span>
          )}
        </form>
        {/* Export + More menus — output / overflow group. */}
        <div className="mm-cluster">
          <Menu
            trigger={menuTrigger("export", "Export")}
            triggerTitle="Export"
            align="right"
            sheet={isMobile}
          >
            {EXPORTS.map((g) => (
              <div key={g.group}>
                <MenuLabel>{g.group}</MenuLabel>
                {g.items.map(([lbl, fn]) => (
                  <MenuItem key={lbl} label={lbl} onSelect={fn} />
                ))}
              </div>
            ))}
          </Menu>
          <Menu
            trigger={menuTrigger("dots", "More")}
            triggerTitle="More"
            align="right"
            sheet={isMobile}
          >
            {(close) => (
              <>
                <MenuLabel>
                  File{io.fileName ? ` — ${io.dirty ? "● " : ""}${io.fileName}` : ""}
                </MenuLabel>
                <MenuItem
                  icon={mi("import")}
                  label="Open file… (Ctrl+O)"
                  onSelect={() => {
                    io.openFile();
                    close();
                  }}
                />
                <MenuItem
                  icon={mi("export")}
                  label="Save to file (Ctrl+S)"
                  onSelect={() => io.saveFile()}
                />
                <MenuItem
                  icon={mi("export")}
                  label="Save as… (Ctrl+Shift+S)"
                  onSelect={() => io.saveFileAs()}
                />
                <MenuSeparator />
                <MenuLabel>Map</MenuLabel>
                <MenuItem icon={mi("present")} label="Present" onSelect={() => map.present()} />
                <MenuItem
                  icon={mi("copy")}
                  label="Duplicate map"
                  onSelect={() => map.duplicateMap()}
                />
                <MenuItem
                  icon={mi("trash")}
                  label="Delete map"
                  danger
                  onSelect={() => map.deleteCurrent()}
                />
                <MenuSeparator />
                <MenuLabel>Import / backup</MenuLabel>
                <label className="mm-menu-item">
                  <EditorIcon name="import" size={15} /> Import files…
                  <input
                    id="mmap-input"
                    type="file"
                    accept=".mmst,.mmap,.mmp,.md,.markdown,.json,.opml,.mm,.mmd,.mermaid,.xmind,.smmx,.docx,.xlsx,.itmz,.mind,.mup,.textpack,.textbundle"
                    multiple
                    onChange={(e) => {
                      io.handleFile(e);
                      close();
                    }}
                    style={{ display: "none" }}
                  />
                </label>
                <MenuItem
                  icon={mi("paste")}
                  label="Paste text → topics"
                  onSelect={() => nav.openPaste()}
                />
                <MenuItem
                  icon={mi("copy")}
                  label="Copy outline to clipboard"
                  onSelect={() => io.copyOutline()}
                />
                <MenuItem
                  icon={mi("copy")}
                  label="Copy as table (TSV)"
                  onSelect={() => io.copyTable()}
                />
                <MenuItem
                  icon={mi("export")}
                  label="Back up whole library"
                  onSelect={() => io.exportLibrary()}
                />
                <MenuSeparator />
                <MenuItem
                  icon={mi("help")}
                  label="About MindMap Studio"
                  onSelect={() => nav.openAbout()}
                />
              </>
            )}
          </Menu>
        </div>
      </div>

      {/* ── Row 2 — view / edit / canvas ── */}
      <div className={`mm-topbar-row mm-topbar-row2${isMobile ? "" : " mm-wrap"}`}>
        <Menu trigger={menuTrigger("layers", "Panels")} triggerTitle="Panels" sheet={isMobile}>
          <MenuLabel>Side panels</MenuLabel>
          <MenuCheckboxItem
            icon={mi("layers")}
            label="Outline"
            checked={panels.outlineOpen}
            trailing={mi("check")}
            onSelect={() => panels.setOutlineOpen((v) => !v)}
          />
          <MenuCheckboxItem
            icon={mi("grid")}
            label="Markers & tags index"
            checked={panels.indexOpen}
            trailing={mi("check")}
            onSelect={() => panels.setIndexOpen((v) => !v)}
          />
          <MenuCheckboxItem
            icon={mi("filter")}
            label="Power Filter"
            checked={panels.filterOpen}
            trailing={mi("check")}
            onSelect={panels.toggleFilter}
          />
          <MenuCheckboxItem
            icon={mi("palette")}
            label="Conditional styles"
            checked={panels.stylesOpen}
            trailing={mi("check")}
            onSelect={() => panels.setStylesOpen((v) => !v)}
          />
          <MenuCheckboxItem
            icon={mi("history")}
            label="Version history"
            checked={panels.historyOpen}
            trailing={mi("check")}
            onSelect={() => panels.setHistoryOpen((v) => !v)}
          />
          <MenuCheckboxItem
            icon={mi("board")}
            label="Board (Kanban)"
            checked={panels.boardOpen}
            trailing={mi("check")}
            onSelect={() => panels.setBoardOpen((v) => !v)}
          />
          <MenuCheckboxItem
            icon={mi("grid")}
            label="Map statistics"
            checked={panels.statsOpen}
            trailing={mi("check")}
            onSelect={() => panels.setStatsOpen((v) => !v)}
          />
          <MenuCheckboxItem
            icon={mi("calendar")}
            label="Agenda (due tasks)"
            checked={panels.agendaOpen}
            trailing={mi("check")}
            onSelect={() => panels.setAgendaOpen((v) => !v)}
          />
          <MenuCheckboxItem
            icon={mi("layers")}
            label="Maps (all maps)"
            checked={panels.mapsOpen}
            trailing={mi("check")}
            onSelect={() => panels.setMapsOpen((v) => !v)}
          />
          <MenuCheckboxItem
            icon={mi("present")}
            label="Slide deck (custom)"
            checked={panels.deckEditorOpen}
            trailing={mi("check")}
            onSelect={() => panels.setDeckEditorOpen((v) => !v)}
          />
          <MenuCheckboxItem
            icon={mi("note")}
            label="Note editor (dockable)"
            checked={panels.noteEditorOpen}
            trailing={mi("check")}
            onSelect={() => panels.setNoteEditorOpen((v) => !v)}
          />
          <MenuCheckboxItem
            icon={mi("note")}
            label="Topic info / inspector"
            checked={panels.infoOpen || panels.infoMinimized}
            trailing={mi("check")}
            onSelect={() => {
              // One clean toggle: if shown (panel OR minimized strip) close both; else open.
              const shown = panels.infoOpen || panels.infoMinimized;
              panels.setInfoMinimized(() => false);
              panels.setInfoOpen(() => !shown);
            }}
          />
        </Menu>
        <span className="mm-vdiv" />
        {/* View menu — fit / collapse / expand / focus folded into one labelled dropdown so the bar
            reads clearly instead of four ambiguous icons (#4). Mirrored 1:1 in ⌘K (kind "view"). */}
        <Menu trigger={menuTrigger("fit", "View")} triggerTitle="View actions" sheet={isMobile}>
          <MenuItem icon={mi("fit")} label="Fit map to screen" onSelect={() => m()?.fit()} />
          <MenuItem
            icon={mi("balance")}
            label="Balance map (even out both sides)"
            disabled={canvas.layout !== "side" || !!liveDoc.meta?.freeform}
            title={
              canvas.layout === "side" && !liveDoc.meta?.freeform
                ? "Clear any pinned sides and redistribute the main branches evenly"
                : "Only the two-sided (Both sides) layout has sides to balance"
            }
            onSelect={() => m()?.balanceMap()}
          />
          <MenuItem
            icon={mi("minus")}
            label="Collapse all branches"
            onSelect={() => m()?.setAllExpanded(false)}
          />
          <MenuItem
            icon={mi("plus")}
            label="Expand all branches"
            onSelect={() => m()?.setAllExpanded(true)}
          />
          <MenuLabel>Detail level</MenuLabel>
          {[1, 2, 3, 4, 5].map((n) => (
            <MenuItem
              key={n}
              icon={mi("layers")}
              label={`Show level ${n}`}
              onSelect={() => m()?.setExpandedToLevel(n)}
            />
          ))}
          <MenuItem
            icon={mi("balance")}
            label="Focus the selected branch"
            disabled={!canvas.selected}
            onSelect={() =>
              canvas.selected &&
              canvas.setFocus({ id: canvas.selected.id, topic: canvas.selected.topic })
            }
          />
          <MenuItem
            icon={mi("layers")}
            label="Drill into the selected topic"
            disabled={!canvas.selected}
            onSelect={() => canvas.drillIn()}
          />
          <MenuItem
            icon={mi("layers")}
            label="Isolate branch (collapse others)"
            disabled={!canvas.selected}
            title={canvas.selected ? undefined : "Select a topic in a branch to isolate it"}
            onSelect={() => {
              const ok = canvas.selected?.id ? m()?.isolateBranch(canvas.selected.id) : false;
              showHint(ok ? "Isolated this branch." : "Select a topic in a branch first.");
            }}
          />
          <MenuItem
            icon={mi("present")}
            label="Guided walk (step through topics)"
            onSelect={() => canvas.startWalk()}
          />
          <MenuLabel>Format</MenuLabel>
          <MenuItem
            icon={mi("copy")}
            label="Copy format"
            disabled={!canvas.selected}
            onSelect={() => canvas.copyFormat()}
          />
          <MenuItem
            icon={mi("paste")}
            label="Paste format"
            disabled={!canvas.selected || !canvas.canPasteFormat}
            onSelect={() => canvas.pasteFormat()}
          />
          <MenuItem
            icon={mi("palette")}
            label="Auto-colour branches"
            onSelect={() => canvas.shuffleBranchColors()}
          />
          <MenuLabel>Arrange (free layout)</MenuLabel>
          {(
            [
              ["left", "Align left"],
              ["hcenter", "Align centres (horizontal)"],
              ["right", "Align right"],
              ["top", "Align top"],
              ["vmiddle", "Align middles (vertical)"],
              ["bottom", "Align bottom"],
            ] as const
          ).map(([mode, label]) => (
            <MenuItem
              key={mode}
              label={label}
              disabled={!canvas.freeform || canvas.selectedCount < 2}
              onSelect={() => canvas.alignSelection(mode)}
            />
          ))}
          <MenuItem
            label="Distribute horizontally"
            disabled={!canvas.freeform || canvas.selectedCount < 3}
            onSelect={() => canvas.distributeSelection("h")}
          />
          <MenuItem
            label="Distribute vertically"
            disabled={!canvas.freeform || canvas.selectedCount < 3}
            onSelect={() => canvas.distributeSelection("v")}
          />
          <MenuLabel>Saved views</MenuLabel>
          <MenuItem icon={mi("star")} label="Save current view…" onSelect={() => views.onSave()} />
          {views.list.map((v) => (
            <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                type="button"
                className="mm-menu-item"
                style={{ flex: 1 }}
                onClick={() => views.onApply(v.id)}
              >
                {mi("fit")}
                {v.name}
              </button>
              <button
                type="button"
                className="mm-menu-item"
                aria-label={`Delete view ${v.name}`}
                title={`Delete view ${v.name}`}
                style={{ flex: "0 0 auto" }}
                onClick={() => views.onDelete(v.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </Menu>
        <span className="mm-vdiv" />
        {/* Overlay-toggle group — outline numbering / line-jumps (view-only switches). */}
        <div className="mm-cluster">
          <TBtn
            icon="check"
            label="Outline numbering (1, 1.2, 1.2.3…)"
            active={panels.numbered}
            onClick={() => panels.setNumbered((v) => !v)}
          />
          {panels.numbered ? (
            <TBtn
              icon="layers"
              label={
                liveDoc.meta?.numberStyle === "outline"
                  ? "Numbering: outline (I, A, 1, a) — switch to decimal"
                  : "Numbering: decimal (1, 1.1) — switch to outline"
              }
              onClick={() =>
                m()?.setNumberStyle(liveDoc.meta?.numberStyle === "outline" ? "decimal" : "outline")
              }
            />
          ) : null}
          <TBtn
            icon="link"
            label="Line jumps where relationships cross"
            active={!!liveDoc.meta?.lineJumps}
            onClick={() => m()?.setLineJumps(!liveDoc.meta?.lineJumps)}
          />
          <TBtn
            icon="layers"
            label="Legend (markers / tags / rules in use)"
            active={!!liveDoc.meta?.legend}
            onClick={() => m()?.setLegend(!liveDoc.meta?.legend)}
          />
          <TBtn
            icon="text"
            label="Spell-check the topic + note editors"
            active={panels.spellcheck}
            onClick={() => panels.setSpellcheck((v) => !v)}
          />
        </div>
        <span className="mm-vdiv" />
        {/* Insert + Canvas menus — content/styling group. */}
        <div className="mm-cluster">
          <Menu trigger={menuTrigger("plus", "Insert")} triggerTitle="Insert" sheet={isMobile}>
            {(close) => (
              <>
                <MenuItem
                  icon={mi("note")}
                  label="Sticky note"
                  onSelect={() => {
                    m()?.addStickyNote();
                    showHint("Sticky note added — drag it anywhere.");
                  }}
                />
                <MenuItem
                  icon={mi("layers")}
                  label="Group branch (boundary)"
                  disabled={!canvas.selected}
                  title={canvas.selected ? undefined : "Select a topic first to group its branch"}
                  onSelect={() => {
                    const id = canvas.selected?.id;
                    const ok = id ? m()?.groupBranch(id) : false;
                    showHint(
                      ok
                        ? "Branch grouped — double-click the label to rename."
                        : "Select a node first, then group its branch.",
                    );
                  }}
                />
                <MenuItem
                  icon={mi("layers")}
                  label="Group selection (boundary)"
                  disabled={canvas.selectedCount < 2}
                  title={
                    canvas.selectedCount < 2
                      ? "Select 2+ topics to group them in one boundary"
                      : undefined
                  }
                  onSelect={() => {
                    const ok = m()?.groupSelection();
                    showHint(
                      ok
                        ? "Selection grouped — double-click the label to rename."
                        : "Select 2+ topics first.",
                    );
                  }}
                />
                <MenuItem
                  icon={mi("balance")}
                  label="Summary bracket"
                  disabled={!canvas.selected}
                  title={
                    canvas.selected ? undefined : "Select a topic first to summarise its branch"
                  }
                  onSelect={() => {
                    const id = canvas.selected?.id;
                    const ok = id ? m()?.groupSummary(id) : false;
                    showHint(
                      ok
                        ? "Summary added — double-click its label to rename."
                        : "Select a node first, then summarise its branch.",
                    );
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
                <MenuSeparator />
                <MenuLabel>Map part (insert under selected)</MenuLabel>
                {MAP_PARTS.map((p) => (
                  <MenuItem
                    key={p.id}
                    icon={mi("plus")}
                    label={p.name}
                    disabled={!canvas.selected}
                    title={canvas.selected ? undefined : "Select a topic first to insert under it"}
                    onSelect={() => {
                      const part = buildMapPart(p.id);
                      const ok = part ? m()?.addSubtreeToSelected(part) : false;
                      showHint(ok ? `Inserted the ${p.name} map part.` : "Select a topic first.");
                    }}
                  />
                ))}
                <MenuSeparator />
                <MenuLabel>Roll-up (mirror another map)</MenuLabel>
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
                  icon={mi("history")}
                  label="Refresh all roll-ups"
                  onSelect={() => map.refreshRollupsNow()}
                />
              </>
            )}
          </Menu>
          <Menu trigger={menuTrigger("palette", "Canvas")} triggerTitle="Canvas" sheet={isMobile}>
            {(close) => (
              <>
                <MenuLabel>Design</MenuLabel>
                {DESIGNS.map((d) => (
                  <MenuItem
                    key={d.id}
                    icon={<DesignPreview design={d} />}
                    label={d.name}
                    title={d.note}
                    onSelect={() => {
                      canvas.applyDesign(d.id);
                      close();
                    }}
                  />
                ))}
                <MenuSeparator />
                <MenuLabel>Theme</MenuLabel>
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
                <MenuLabel>Background</MenuLabel>
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
                <MenuSeparator />
                <MenuCheckboxItem
                  icon={mi("hand")}
                  label="Free layout (whiteboard)"
                  checked={!!liveDoc.meta?.freeform}
                  trailing={mi("check")}
                  onSelect={() => m()?.setFreeform(!liveDoc.meta?.freeform)}
                />
                <MenuLabel>Diagram backdrop</MenuLabel>
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
        </div>
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
            <option value="swimlane">Swimlane</option>
            <option value="brace">Brace map</option>
          </optgroup>
        </select>
        <span className="mm-eyebrow">Connectors</span>
        <select
          className="mm-select"
          value={liveDoc.meta?.connectorStyle ?? "organic"}
          onChange={(e) =>
            m()?.setConnectorStyle(e.target.value as "organic" | "curved" | "elbow" | "straight")
          }
          aria-label="Connector style"
          title="Branch connector style"
        >
          <option value="organic">Organic</option>
          <option value="curved">Curved</option>
          <option value="elbow">Elbow</option>
          <option value="straight">Straight</option>
        </select>
        <span className="mm-eyebrow">Growth</span>
        <select
          className="mm-select"
          value={liveDoc.meta?.branchGrowth ?? "regular"}
          onChange={(e) => m()?.setBranchGrowth(e.target.value as BranchGrowth)}
          aria-label="Branch growth weight"
          title="Branch line weight (thickness)"
        >
          <option value="fine">Fine</option>
          <option value="regular">Regular</option>
          <option value="bold">Bold</option>
        </select>
        <span className="mm-vdiv" />
        <span className="mm-eyebrow">Type</span>
        <select
          className="mm-select"
          value={liveDoc.meta?.fontFamily ?? ""}
          onChange={(e) => m()?.setFontFamily(e.target.value)}
          aria-label="Base font family"
          title="Map-wide base font (a per-topic font still overrides it)"
        >
          <option value="">Default</option>
          <option value="Inter, system-ui, sans-serif">Sans</option>
          <option value="Georgia, 'Times New Roman', serif">Serif</option>
          <option value="'Courier New', ui-monospace, monospace">Mono</option>
        </select>
        <select
          className="mm-select"
          value={liveDoc.meta?.fontScale ?? "comfortable"}
          onChange={(e) => m()?.setFontScale(e.target.value as "compact" | "comfortable" | "large")}
          aria-label="Font size scale"
          title="Map-wide text size (a per-topic size still overrides it)"
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="large">Large</option>
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
