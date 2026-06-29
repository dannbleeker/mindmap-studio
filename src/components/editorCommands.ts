import { MARKER_PALETTE } from "../icons";
import { MAP_PARTS, buildMapPart } from "../mapParts";
import type { LayoutKind } from "../mindmap";
import type { MapNode } from "../model/types";
import { PRIORITY_LABEL, PRIORITY_LEVELS } from "../priority";
import { SHORTCUT_BINDINGS } from "../shortcuts";
import type { Command } from "./CommandPalette";
import type { ToolbarProps } from "./Toolbar";

/** Walk every topic in the doc (central tree + floating subtrees) for the jump-to-topic palette. */
function* walkTopics(node: MapNode): Generator<MapNode> {
  yield node;
  for (const c of node.children) yield* walkTopics(c);
}

/** A one-line, length-capped preview of a topic for a palette row. */
function topicLabel(topic: string): string {
  const t = topic.replace(/\s+/g, " ").trim() || "(untitled)";
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

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
  ["mmap", ".mmap (MindManager)", io.exportMmap],
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
  const { mapRef, nav, panels, map, canvas, io, history, showHint } = props;
  const m = () => mapRef.current;
  const sel = canvas.selected;
  const cmds: Command[] = [];
  const add = (
    id: string,
    label: string,
    kind: string,
    run: () => void,
    enabled = true,
    extra?: { keywords?: string },
  ) => cmds.push({ id, label, kind, run, enabled, shortcut: SHORTCUT_BINDINGS[id], ...extra });

  // Map / file
  add("open-file", "Open file…", "map", () => io.openFile());
  add("save-file", "Save to file", "map", () => io.saveFile());
  add("save-file-as", "Save to file as…", "map", () => io.saveFileAs());
  add("present", "Present", "map", () => map.present());
  add("duplicate-map", "Duplicate map", "map", () => map.duplicateMap());
  add("delete-map", "Delete map", "map", () => map.deleteCurrent());
  add("refresh-rollups", "Refresh all roll-ups", "map", () => map.refreshRollupsNow());
  add("search-all", "Search across every map", "map", () => nav.openSearchAll());
  add("paste-topics", "Paste text → topics", "map", () => nav.openPaste());
  add("copy-outline", "Copy outline to clipboard", "map", () => io.copyOutline());
  add("copy-table", "Copy as table (TSV)", "map", () => io.copyTable());
  add("backup", "Back up whole library", "map", () => io.exportLibrary());
  add("shortcuts", "Keyboard shortcuts", "map", () => nav.openShortcuts());
  add("settings", "Settings & preferences", "map", () => nav.openSettings());
  add("about", "About MindMap Studio", "map", () => nav.openAbout());
  add(
    "getting-started",
    "Show getting-started tips again",
    "map",
    () => nav.reShowGettingStarted(),
    true,
    {
      keywords: "onboarding tutorial first run 3 things to try help tips",
    },
  );

  // Edit history
  add("undo", "Undo", "edit", () => history.undo(), history.canUndo);
  add("redo", "Redo", "edit", () => history.redo(), history.canRedo);

  // View
  add("fit", "Fit map to screen", "view", () => m()?.fit());
  add(
    "balance-map",
    "Balance map (even out both sides)",
    "view",
    () => m()?.balanceMap(),
    canvas.layout === "side" && !map.liveDoc.meta?.freeform,
  );
  add("guided-walk", "Start guided walk", "view", () => canvas.startWalk());
  add(
    "isolate-branch",
    "Isolate branch (collapse others)",
    "view",
    () => {
      if (sel) m()?.isolateBranch(sel.id);
    },
    !!sel,
  );
  for (const p of MAP_PARTS)
    add(
      `map-part:${p.id}`,
      `Insert map part: ${p.name}`,
      "view",
      () => {
        const part = buildMapPart(p.id);
        const ok = part ? m()?.addSubtreeToSelected(part) : false;
        showHint(ok ? `Inserted the ${p.name} map part.` : "Select a topic first.");
      },
      !!sel,
    );
  add("collapse-all", "Collapse all branches", "view", () => m()?.setAllExpanded(false));
  add("expand-all", "Expand all branches", "view", () => m()?.setAllExpanded(true));
  for (const n of [1, 2, 3, 4, 5])
    add(`expand-level:${n}`, `Show detail level ${n}`, "view", () => m()?.setExpandedToLevel(n));
  add("copy-format", "Copy format", "view", () => canvas.copyFormat(), !!sel);
  add(
    "paste-format",
    "Paste format",
    "view",
    () => canvas.pasteFormat(),
    !!sel && canvas.canPasteFormat,
  );
  add("auto-colour-branches", "Auto-colour branches", "view", () => canvas.shuffleBranchColors());
  add(
    "focus-branch",
    "Focus the selected branch",
    "view",
    () => {
      if (sel) canvas.setFocus({ id: sel.id, topic: sel.topic });
    },
    !!sel,
  );
  add("drill-in", "Drill into the selected topic", "view", () => canvas.drillIn(), !!sel);
  // Arrange (free-canvas only) — needs 2+ selected to align, 3+ to distribute.
  const canAlign = canvas.freeform && canvas.selectedCount >= 2;
  const canDistribute = canvas.freeform && canvas.selectedCount >= 3;
  for (const [mode, label] of [
    ["left", "Align left"],
    ["hcenter", "Align centres (horizontal)"],
    ["right", "Align right"],
    ["top", "Align top"],
    ["vmiddle", "Align middles (vertical)"],
    ["bottom", "Align bottom"],
  ] as const)
    add(`align:${mode}`, label, "view", () => canvas.alignSelection(mode), canAlign);
  add(
    "distribute-h",
    "Distribute horizontally",
    "view",
    () => canvas.distributeSelection("h"),
    canDistribute,
  );
  add(
    "distribute-v",
    "Distribute vertically",
    "view",
    () => canvas.distributeSelection("v"),
    canDistribute,
  );
  add("toggle-numbering", "Toggle outline numbering", "view", () => panels.setNumbered((v) => !v));
  add("toggle-spellcheck", "Toggle spell-check", "view", () => panels.setSpellcheck((v) => !v));
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
  add("panel-stats", "Toggle Map statistics", "panel", () => panels.setStatsOpen((v) => !v));
  add("panel-note-editor", "Toggle Note editor (dockable)", "panel", () =>
    panels.setNoteEditorOpen((v) => !v),
  );
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
    "insert-group-selection",
    "Group selection (boundary)",
    "insert",
    () => {
      m()?.groupSelection();
    },
    canvas.selectedCount >= 2,
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

  // Selected node — shown only when a node is selected (Command.enabled). These give mouse-free
  // parity with the right-click menu: add a child, set a marker/priority, or delete. (#12)
  add(
    "node-add-child",
    "Add child to selected topic",
    "node",
    () => m()?.addChildToSelected(),
    !!sel,
  );
  add("node-delete", "Delete selected topic", "node", () => m()?.deleteSelected(), !!sel);
  for (const marker of MARKER_PALETTE)
    add(
      `node-marker:${marker}`,
      `Marker: ${marker} on selected topic`,
      "marker",
      () => m()?.toggleSelectedIcon(marker),
      !!sel,
    );
  for (const p of PRIORITY_LEVELS)
    add(
      `node-priority:${p}`,
      `Priority: ${PRIORITY_LABEL[p]} on selected topic`,
      "priority",
      () => m()?.setSelectedPriority(p),
      !!sel,
    );
  add(
    "node-priority:clear",
    "Priority: clear on selected topic",
    "priority",
    () => m()?.setSelectedPriority(undefined),
    !!sel,
  );

  // Jump to any topic — fuzzy over the topic text AND its note (keywords), then select + centre it.
  for (const n of walkTopics(map.liveDoc.root))
    add(
      `jump:${n.id}`,
      `Go to: ${topicLabel(n.topic)}`,
      "topic",
      () => m()?.focusNode(n.id),
      true,
      {
        keywords: `${n.topic} ${n.note ?? ""}`,
      },
    );
  for (const f of map.liveDoc.floatingTopics ?? [])
    for (const n of walkTopics(f))
      add(
        `jump:${n.id}`,
        `Go to: ${topicLabel(n.topic)}`,
        "topic",
        () => m()?.focusNode(n.id),
        true,
        { keywords: `${n.topic} ${n.note ?? ""}` },
      );

  // Layout
  for (const l of LAYOUTS)
    add(`layout:${l.id}`, `Layout: ${l.label}`, "layout", () => canvas.changeLayout(l.id));

  // Export
  for (const [id, label, fn] of EXPORTS(io)) add(`export:${id}`, `Export ${label}`, "export", fn);

  return cmds;
}
