import type { LayoutKind } from "../mindmap";
import type { Command } from "./CommandPalette";
import type { ToolbarProps } from "./Toolbar";

// The editor command registry — one flat `Command[]`, 1:1 with the toolbar's actions, built from the
// SAME prop groups App already hands `<Toolbar>` (so there's no second source of truth). Drives the
// in-editor ⌘K palette. Selection-dependent actions carry `enabled` so the palette hides them when
// nothing is selected. Pure + side-effect-free to build (each `run` defers to the existing handler),
// so it's trivially unit-testable.

const LAYOUTS: { id: LayoutKind; label: string }[] = [
  { id: "side", label: "Both sides" },
  { id: "right", label: "Right" },
  { id: "left", label: "Left" },
  { id: "radial", label: "Radial / hub" },
  { id: "org-down", label: "Org chart down" },
  { id: "org-up", label: "Org chart up" },
  { id: "timeline", label: "Timeline" },
  { id: "fishbone", label: "Fishbone" },
  { id: "grid", label: "Grid / matrix" },
  { id: "brace", label: "Brace map" },
];

const EXPORTS = (io: ToolbarProps["io"]): [string, string, () => void][] => [
  ["json", ".json (lossless)", io.exportJson],
  ["md", ".md (Markdown)", io.exportMarkdown],
  ["opml", ".opml (outline)", io.exportOpml],
  ["freemind", ".mm (FreeMind/Freeplane)", io.exportFreemind],
  ["mermaid", ".mmd (Mermaid)", io.exportMermaid],
  ["xmind", ".xmind (XMind)", io.exportXmind],
  ["smmx", ".smmx (SimpleMind)", io.exportSmmx],
  ["png", ".png (image)", io.exportPng],
  ["svg", ".svg (vector)", io.exportSvg],
  ["html", ".html (standalone)", io.exportHtml],
  ["ihtml", ".html (interactive)", io.exportInteractiveHtml],
  ["pdf", ".pdf (print)", io.exportPdf],
  ["docx", ".docx (Word)", io.exportDocx],
  ["xlsx", ".xlsx (Excel)", io.exportXlsx],
  ["deck", ".html (slide deck)", io.exportDeck],
  ["pptx", ".pptx (PowerPoint)", io.exportPptx],
];

/** Build the editor's command list from the toolbar prop groups (the same object App passes Toolbar). */
export function buildEditorCommands(props: ToolbarProps): Command[] {
  const { mapRef, nav, panels, map, canvas, io, showHint } = props;
  const m = () => mapRef.current;
  const sel = canvas.selected;
  const cmds: Command[] = [];
  const add = (id: string, label: string, kind: string, run: () => void, enabled = true) =>
    cmds.push({ id, label, kind, run, enabled });

  // Map / file
  add("present", "Present", "map", () => map.present());
  add("duplicate-map", "Duplicate map", "map", () => map.duplicateMap());
  add("add-sheet", "Add sheet to workbook", "map", () => map.addSheet());
  add("delete-map", "Delete map", "map", () => map.deleteCurrent());
  add("refresh-rollups", "Refresh all roll-ups", "map", () => map.refreshRollupsNow());
  add("search-all", "Search across every map", "map", () => nav.openSearchAll());
  add("paste-topics", "Paste text → topics", "map", () => nav.openPaste());
  add("copy-outline", "Copy outline to clipboard", "map", () => io.copyOutline());
  add("backup", "Back up whole library", "map", () => io.exportLibrary());
  add("about", "About MindMap Studio", "map", () => nav.openAbout());

  // View
  add("fit", "Fit map to screen", "view", () => m()?.fit());
  add("collapse-all", "Collapse all branches", "view", () => m()?.setAllExpanded(false));
  add("expand-all", "Expand all branches", "view", () => m()?.setAllExpanded(true));
  add(
    "focus-branch",
    "Focus the selected branch",
    "view",
    () => {
      if (sel) canvas.setFocus({ id: sel.id, topic: sel.topic });
    },
    !!sel,
  );
  add("toggle-numbering", "Toggle outline numbering", "view", () => panels.setNumbered((v) => !v));
  add("toggle-line-jumps", "Toggle line jumps", "view", () =>
    m()?.setLineJumps(!map.liveDoc.meta?.lineJumps),
  );

  // Side panels
  add("panel-outline", "Toggle Outline panel", "panel", () => panels.setOutlineOpen((v) => !v));
  add("panel-index", "Toggle Markers & tags index", "panel", () => panels.setIndexOpen((v) => !v));
  add("panel-filter", "Toggle Power Filter", "panel", () => panels.toggleFilter());
  add("panel-styles", "Toggle Conditional styles", "panel", () => panels.setStylesOpen((v) => !v));
  add("panel-history", "Toggle Version history", "panel", () => panels.setHistoryOpen((v) => !v));
  add("panel-board", "Toggle Board (Kanban)", "panel", () => panels.setBoardOpen((v) => !v));
  add("panel-info", "Toggle Topic info / inspector", "panel", () => {
    const shown = panels.infoOpen || panels.infoMinimized;
    panels.setInfoMinimized(() => false);
    panels.setInfoOpen(() => !shown);
  });

  // Insert
  add("insert-sticky", "Insert sticky note", "insert", () => {
    m()?.addStickyNote();
    showHint("Sticky note added — drag it anywhere.");
  });
  add(
    "insert-group",
    "Group branch (boundary)",
    "insert",
    () => {
      if (sel) m()?.groupBranch(sel.id);
    },
    !!sel,
  );
  add(
    "insert-summary",
    "Summary bracket",
    "insert",
    () => {
      if (sel) m()?.groupSummary(sel.id);
    },
    !!sel,
  );

  // Layout
  for (const l of LAYOUTS)
    add(`layout:${l.id}`, `Layout: ${l.label}`, "layout", () => canvas.changeLayout(l.id));

  // Export
  for (const [id, label, fn] of EXPORTS(io)) add(`export:${id}`, `Export ${label}`, "export", fn);

  return cmds;
}
