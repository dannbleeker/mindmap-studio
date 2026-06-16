import type { ChangeEvent, FormEvent, RefObject } from "react";
import { BrainstormTimer } from "../BrainstormTimer";
import { Button, Input, Select } from "../design/primitives";
import { colors } from "../design/tokens";
import { buildExample, examples } from "../examples";
import type { LayoutKind, MindMapHandle, SelectedNode } from "../mindmap";
import { canvasThemes } from "../mindmap/theme";
import type { CanvasTheme } from "../mindmap/theme";
import type { BackdropKind, MindMapDoc } from "../model/types";
import type { MapSummary } from "../store/mapStore";
import { buildTemplate, templates } from "../templates";
import { controlStyle } from "../ui";

// The editor toolbar — the `<header>` extracted from App.tsx, unchanged in behaviour. Every control
// is driven by props grouped into logical buckets (nav / panels / map / canvas / find / io) plus the
// canvas handle ref (the stable seam the controls call through). This is a pure prop-driven view:
// it owns no state of its own (BrainstormTimer is self-contained), so the upcoming UX redesign can
// restructure it in one file without touching the App's orchestration. The inline `controlStyle` /
// `inputStyle` buttons were swapped for the Button / Select / Input primitives where the swap is
// pixel-identical; the few bespoke controls (canvas-colour cluster, backdrop ring stepper, find form,
// sheet-style buttons) keep their inline styles.

/** Show/hide flags + setters for the left-rail panels and the canvas-numbering toggle. */
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
  /** Per-map canvas background image picker (the "🖼" control in the Canvas cluster). */
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
  /** Phone-width: a single horizontally-scrollable strip instead of the wrapping desktop rows. */
  isMobile: boolean;
  /** The canvas handle — most canvas controls are thin `mapRef.current?.X()` calls. */
  mapRef: RefObject<MindMapHandle | null>;
  /** Top-level navigation / dialogs. */
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
  /** Transient hint toast (used by the group/summary/note/roll-up/sticker actions). */
  showHint: (message: string) => void;
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
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: isMobile ? "nowrap" : "wrap",
        gap: 6,
        rowGap: 6,
        padding: isMobile ? "6px 10px" : "8px 16px",
        borderBottom: `1px solid ${colors.border}`,
        ...(isMobile ? { overflowX: "auto" as const } : {}),
      }}
    >
      <strong style={{ fontSize: 15, marginRight: 4 }}>MindMap Studio</strong>
      <Button onClick={nav.goHome} title="Start screen — new maps, templates, library">
        ⌂ Start
      </Button>
      <Button onClick={nav.openAbout} title="About MindMap Studio — version, license, credits">
        About
      </Button>
      <Button onClick={nav.openSearchAll} title="Search across every map in your library">
        🔎 All maps
      </Button>
      <Button
        onClick={() => panels.setOutlineOpen((v) => !v)}
        aria-pressed={panels.outlineOpen}
        title="Toggle the outline panel"
      >
        ☰ Outline
      </Button>
      <Button
        onClick={() => panels.setIndexOpen((v) => !v)}
        aria-pressed={panels.indexOpen}
        title="Toggle the markers & tags index"
      >
        📑 Index
      </Button>
      <Button
        onClick={panels.toggleFilter}
        aria-pressed={panels.filterOpen}
        title="Power Filter: dim topics that don't match a marker / tag / text (read-only)"
      >
        🎚 Filter
      </Button>
      <Button
        onClick={() => panels.setStylesOpen((v) => !v)}
        aria-pressed={panels.stylesOpen}
        title="Conditional formatting — auto-style topics by tag / marker / completion"
      >
        🎨 Styles
      </Button>
      <Button
        onClick={() => panels.setHistoryOpen((v) => !v)}
        aria-pressed={panels.historyOpen}
        title="Version history — restore an earlier snapshot of this map"
      >
        🕔 History
      </Button>
      <Button
        onClick={() => panels.setBoardOpen((v) => !v)}
        aria-pressed={panels.boardOpen}
        title="Board view — topics grouped into columns by tag (read-only)"
      >
        ▦ Board
      </Button>
      <Select
        value={doc.id}
        onChange={(e) => map.switchMap(e.target.value)}
        style={controlStyle}
        aria-label="Open map"
      >
        {map.mapOptions.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </Select>
      <Button
        onClick={map.addSheet}
        title="Add a sheet to this file (maps in a workbook share a sheet tab strip + export together)"
      >
        ▦ + Sheet
      </Button>
      <Select
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v) map.load(v.startsWith("ex:") ? buildExample(v.slice(3)) : buildTemplate(v));
        }}
        style={controlStyle}
        aria-label="New map from a template or example"
        title="New map (pick a blank template or a worked example)"
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
      </Select>
      <Button onClick={map.duplicateMap} title="Duplicate the current map">
        Duplicate
      </Button>
      <Button onClick={map.deleteCurrent}>Delete</Button>
      <Button onClick={map.present}>▶ Present</Button>
      <Button onClick={() => mapRef.current?.fit()}>Fit</Button>
      <Button
        onClick={() => mapRef.current?.setAllExpanded(false)}
        aria-label="Collapse all branches"
        title="Collapse all branches"
      >
        ⊟
      </Button>
      <Button
        onClick={() => mapRef.current?.setAllExpanded(true)}
        aria-label="Expand all branches"
        title="Expand all branches"
      >
        ⊞
      </Button>
      <Button
        onClick={() => panels.setNumbered((v) => !v)}
        aria-pressed={panels.numbered}
        title="Toggle outline numbering (1, 1.2, 1.2.3 …) on topics"
      >
        1. Numbering
      </Button>
      <Button
        onClick={() => mapRef.current?.setLineJumps(!liveDoc.meta?.lineJumps)}
        aria-pressed={!!liveDoc.meta?.lineJumps}
        title="Toggle line-jumps — draw a hop where two relationship arrows cross, so they read as passing over (not joining)"
      >
        ⌒ Line jumps
      </Button>
      <Button
        onClick={() =>
          canvas.selected &&
          canvas.setFocus({ id: canvas.selected.id, topic: canvas.selected.topic })
        }
        disabled={!canvas.selected}
        title="Focus the selected branch — dim everything off it (Esc to exit)"
      >
        ◎ Focus
      </Button>
      <label style={controlStyle}>
        Image
        <input
          type="file"
          accept="image/*"
          onChange={canvas.handleImage}
          style={{ display: "none" }}
        />
      </label>
      <Select
        value={canvas.theme.id}
        onChange={(e) => canvas.setThemeId(e.target.value)}
        style={controlStyle}
        aria-label="Canvas theme"
        title="Canvas style / theme"
      >
        {canvasThemes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
      <span
        style={{ ...controlStyle, display: "inline-flex", alignItems: "center", gap: 4 }}
        title="Canvas background colour for this map (overrides the theme)"
      >
        Canvas
        <input
          type="color"
          aria-label="Canvas background colour"
          value={liveDoc.meta?.background || "#ffffff"}
          onChange={(e) => mapRef.current?.setBackground(e.target.value)}
          style={{
            width: 22,
            height: 18,
            border: "none",
            background: "none",
            padding: 0,
            cursor: "pointer",
          }}
        />
        <button
          type="button"
          onClick={() => mapRef.current?.setBackground("")}
          title="Reset background to the theme default"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: colors.muted,
            fontSize: 12,
            padding: 0,
          }}
        >
          ✕
        </button>
        <label
          title="Set a background image for this map (covers the canvas, behind the topics)"
          style={{ cursor: "pointer", fontSize: 13, lineHeight: 1 }}
        >
          🖼
          <input
            type="file"
            accept="image/*"
            aria-label="Canvas background image"
            onChange={canvas.handleBackgroundImage}
            style={{ display: "none" }}
          />
        </label>
        {liveDoc.meta?.backgroundImage ? (
          <button
            type="button"
            onClick={() => mapRef.current?.setBackgroundImage("")}
            title="Remove the background image"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: colors.muted,
              fontSize: 12,
              padding: 0,
            }}
          >
            ✕
          </button>
        ) : null}
      </span>
      <Select
        value={canvas.layout}
        onChange={(e) => canvas.changeLayout(e.target.value as LayoutKind)}
        style={controlStyle}
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
      </Select>
      <Button
        onClick={() => mapRef.current?.setFreeform(!liveDoc.meta?.freeform)}
        aria-pressed={!!liveDoc.meta?.freeform}
        title="Free layout (whiteboard): drag topics anywhere; the auto-layout pauses"
      >
        🧲 Free layout
      </Button>
      <Select
        value=""
        onChange={(e) => {
          if (e.target.value) mapRef.current?.setBackdrop(e.target.value as BackdropKind);
        }}
        style={controlStyle}
        aria-label="Add a diagram backdrop"
        title="Add a diagram backdrop (drop topics into its regions)"
      >
        <option value="">◎ Diagram…</option>
        <option value="onion">Onion (rings)</option>
        <option value="funnel">Funnel (stages)</option>
        <option value="venn2">Venn (2 circles)</option>
        <option value="venn3">Venn (3 circles)</option>
      </Select>
      {liveDoc.backdrop ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          {liveDoc.backdrop.kind === "onion" || liveDoc.backdrop.kind === "funnel" ? (
            <>
              <Button
                onClick={() => mapRef.current?.setBackdropRings(-1)}
                title="Fewer rings / stages"
              >
                −
              </Button>
              <Button
                onClick={() => mapRef.current?.setBackdropRings(1)}
                title="More rings / stages"
              >
                +
              </Button>
            </>
          ) : null}
          <Button
            onClick={() => mapRef.current?.clearBackdrop()}
            title="Remove the diagram backdrop"
          >
            ✕ Backdrop
          </Button>
        </span>
      ) : null}
      <Button
        onClick={() => panels.setInfoOpen((v) => !v)}
        aria-pressed={panels.infoOpen}
        title="Topic info: note, markers, tags, style, and links for the selected node"
      >
        ℹ Info
      </Button>
      <Button
        onClick={() => {
          const id = canvas.selected?.id;
          const ok = id ? mapRef.current?.groupBranch(id) : false;
          showHint(
            ok
              ? "Branch grouped — double-click the boundary's label chip to rename it."
              : "Select a node first, then group its branch.",
          );
        }}
        title="Draw a boundary around the selected branch (a visual group)"
      >
        ⬚ Group
      </Button>
      <Button
        onClick={() => {
          const id = canvas.selected?.id;
          const ok = id ? mapRef.current?.groupSummary(id) : false;
          showHint(
            ok
              ? "Summary added — double-click its label to rename (or empty it to remove)."
              : "Select a node first, then summarise its branch.",
          );
        }}
        title="Add a labelled summary bracket beside the selected branch"
      >
        ⊐ Summary
      </Button>
      <Button
        onClick={() => {
          mapRef.current?.addStickyNote();
          showHint("Sticky note added — a free-floating topic you can drag anywhere.");
        }}
        title="Add a sticky note (a free-floating amber note topic)"
      >
        🗒 Note
      </Button>
      <Select
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          const ok = canvas.selected?.id
            ? mapRef.current?.setSelectedRollup(v === "none" ? "" : v)
            : false;
          if (!ok) {
            showHint("Select a node first, then bind it to a roll-up source.");
            return;
          }
          showHint(
            v === "none" ? "Roll-up unbound." : "Bound — click 🔄 Roll-ups to pull the latest.",
          );
        }}
        style={controlStyle}
        title="Mirror another map's branches under the selected node (a roll-up source)"
      >
        <option value="">⤵ Roll-up…</option>
        {map.maps
          .filter((m) => m.id !== liveDoc.id)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.title || "(untitled)"}
            </option>
          ))}
        <option value="none">— Unbind</option>
      </Select>
      <Button
        onClick={map.refreshRollupsNow}
        title="Refresh all roll-ups — pull the latest branches from their source maps"
      >
        🔄 Roll-ups
      </Button>
      <form onSubmit={find.runSearch} style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Input
          value={find.query}
          onChange={(e) => find.setQuery(e.target.value)}
          placeholder="Find…"
          aria-label="Find node"
          style={{ width: 100 }}
        />
        <Input
          value={find.replaceWith}
          onChange={(e) => find.setReplaceWith(e.target.value)}
          placeholder="Replace…"
          aria-label="Replace with"
          style={{ width: 100 }}
        />
        <Button
          onClick={find.runReplace}
          style={{ padding: "6px 8px" }}
          title="Replace the find text in every matching topic"
        >
          Replace all
        </Button>
        {find.matchInfo && (
          <span style={{ fontSize: 11, color: colors.muted }}>{find.matchInfo}</span>
        )}
      </form>
      <span style={{ width: 1, height: 22, background: colors.border, margin: "0 2px" }} />
      <Select
        value=""
        onChange={(e) => {
          const fn = {
            json: io.exportJson,
            md: io.exportMarkdown,
            opml: io.exportOpml,
            png: io.exportPng,
            svg: io.exportSvg,
            mermaid: io.exportMermaid,
            mm: io.exportFreemind,
            xmind: io.exportXmind,
            smmx: io.exportSmmx,
            html: io.exportHtml,
            ihtml: io.exportInteractiveHtml,
            deck: io.exportDeck,
            pdf: io.exportPdf,
            docx: io.exportDocx,
            pptx: io.exportPptx,
            xlsx: io.exportXlsx,
          }[e.target.value];
          fn?.();
        }}
        style={controlStyle}
        aria-label="Export the map"
        title="Export the map"
      >
        <option value="">⬆ Export…</option>
        <optgroup label="Data &amp; outline">
          <option value="json">.json (lossless)</option>
          <option value="md">.md (Markdown)</option>
          <option value="opml">.opml (outline)</option>
          <option value="mm">.mm (FreeMind/Freeplane)</option>
          <option value="mermaid">.mmd (Mermaid)</option>
          <option value="xmind">.xmind (XMind)</option>
          <option value="smmx">.smmx (SimpleMind)</option>
        </optgroup>
        <optgroup label="Image">
          <option value="png">.png (image)</option>
          <option value="svg">.svg (vector)</option>
        </optgroup>
        <optgroup label="Document">
          <option value="html">.html (standalone)</option>
          <option value="ihtml">.html (interactive)</option>
          <option value="pdf">.pdf (print)</option>
          <option value="docx">.docx (Word)</option>
          <option value="xlsx">.xlsx (Excel)</option>
        </optgroup>
        <optgroup label="Presentation">
          <option value="deck">.html (slide deck)</option>
          <option value="pptx">.pptx (PowerPoint)</option>
        </optgroup>
      </Select>
      <Button
        onClick={io.exportLibrary}
        title="Back up every map to one .json file (restore by opening it)"
      >
        ⬇ Backup
      </Button>
      <Button onClick={io.copyOutline} title="Copy the map as a Markdown outline to the clipboard">
        ⧉ Copy outline
      </Button>
      <label style={controlStyle}>
        Open files
        <input
          id="mmap-input"
          type="file"
          accept=".mmap,.mmp,.md,.markdown,.json,.opml,.mm,.mmd,.mermaid,.xmind,.smmx,.docx,.xlsx,.itmz,.mind,.mup,.textpack,.textbundle"
          multiple
          onChange={io.handleFile}
          style={{ display: "none" }}
        />
      </label>
      <Button
        onClick={nav.openPaste}
        title="Paste an outline, bullet list, or Markdown and turn it into topics"
      >
        📋 Paste text
      </Button>
      <Input
        placeholder="Quick add… ⏎"
        aria-label="Quick add topic"
        title="Type a topic and press Enter to add it under the selected node (or the central topic). Keeps focus for rapid capture."
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const v = e.currentTarget.value.trim();
            if (v) {
              mapRef.current?.quickAdd(v);
              e.currentTarget.value = "";
            }
          }
        }}
        style={{ width: 130 }}
      />
      <BrainstormTimer />
    </header>
  );
}
