import { type RefObject, createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ToolbarProps } from "../src/components/Toolbar";
import { buildEditorCommands } from "../src/components/editorCommands";
import type { MindMapHandle, SelectedNode } from "../src/mindmap";
import { themeById } from "../src/mindmap/theme";
import type { MindMapDoc } from "../src/model/types";

// buildEditorCommands — the editor's ⌘K registry. It's a pure function over the toolbar prop groups,
// so the test drives it with mocked groups and asserts: the catalogue is exhaustive (every export
// format / panel / layout), each command defers to the right handler, ids are unique, and the
// selection-dependent actions carry `enabled` that tracks the selection.

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "m1",
  title: "Map",
  root: { id: "root", topic: "Map", children: [] },
};

function mockHandle(): MindMapHandle {
  const cache = new Map<PropertyKey, ReturnType<typeof vi.fn>>();
  return new Proxy({} as MindMapHandle, {
    get: (_t, prop) => {
      if (!cache.has(prop)) cache.set(prop, vi.fn());
      return cache.get(prop);
    },
  });
}

function mkProps(selected: SelectedNode | null = null): ToolbarProps {
  const handle = mockHandle();
  const mapRef = createRef<MindMapHandle>() as RefObject<MindMapHandle | null>;
  mapRef.current = handle;
  const io = Object.fromEntries(
    [
      "exportJson",
      "exportMarkdown",
      "exportMermaid",
      "exportXmind",
      "exportSmmx",
      "exportMmap",
      "exportOpml",
      "exportFreemind",
      "exportPng",
      "exportSvg",
      "exportHtml",
      "exportInteractiveHtml",
      "exportDeck",
      "exportPdf",
      "exportDocx",
      "exportPptx",
      "exportXlsx",
      "exportLibrary",
      "copyOutline",
      "copyTable",
      "handleFile",
    ].map((k) => [k, vi.fn()]),
  ) as unknown as ToolbarProps["io"];
  return {
    isMobile: false,
    mapRef,
    nav: {
      goHome: vi.fn(),
      openAbout: vi.fn(),
      openShortcuts: vi.fn(),
      openSearchAll: vi.fn(),
      openPaste: vi.fn(),
    },
    panels: {
      outlineOpen: false,
      setOutlineOpen: vi.fn(),
      indexOpen: false,
      setIndexOpen: vi.fn(),
      filterOpen: false,
      toggleFilter: vi.fn(),
      stylesOpen: false,
      setStylesOpen: vi.fn(),
      historyOpen: false,
      setHistoryOpen: vi.fn(),
      boardOpen: false,
      setBoardOpen: vi.fn(),
      statsOpen: false,
      setStatsOpen: vi.fn(),
      infoOpen: false,
      setInfoOpen: vi.fn(),
      infoMinimized: false,
      setInfoMinimized: vi.fn(),
      numbered: false,
      setNumbered: vi.fn(),
    },
    map: {
      doc,
      liveDoc: doc,
      maps: [],
      mapOptions: [],
      switchMap: vi.fn(),
      load: vi.fn(),
      duplicateMap: vi.fn(),
      deleteCurrent: vi.fn(),
      present: vi.fn(),
      refreshRollupsNow: vi.fn(),
    },
    canvas: {
      theme: themeById("light"),
      setThemeId: vi.fn(),
      layout: "side",
      changeLayout: vi.fn(),
      selected,
      setFocus: vi.fn(),
      handleImage: vi.fn(),
      handleBackgroundImage: vi.fn(),
      copyFormat: vi.fn(),
      pasteFormat: vi.fn(),
      canPasteFormat: false,
      shuffleBranchColors: vi.fn(),
      applyDesign: vi.fn(),
      drillIn: vi.fn(),
      startWalk: vi.fn(),
      alignSelection: vi.fn(),
      distributeSelection: vi.fn(),
      selectedCount: 0,
      freeform: false,
    },
    find: {
      query: "",
      setQuery: vi.fn(),
      replaceWith: "",
      setReplaceWith: vi.fn(),
      matchInfo: "",
      runSearch: vi.fn(),
      runReplace: vi.fn(),
    },
    io,
    history: { canUndo: false, canRedo: false, undo: vi.fn(), redo: vi.fn() },
    showHint: vi.fn(),
  };
}

const byId = (props: ToolbarProps) => new Map(buildEditorCommands(props).map((c) => [c.id, c]));

describe("buildEditorCommands", () => {
  it("has unique ids and a non-trivial command set", () => {
    const cmds = buildEditorCommands(mkProps());
    const ids = cmds.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(cmds.length).toBeGreaterThan(40);
  });

  it("covers every export format (17) and each defers to its io handler", () => {
    const props = mkProps();
    const cmds = buildEditorCommands(props);
    const exports = cmds.filter((c) => c.kind === "export");
    expect(exports).toHaveLength(17);
    byId(props).get("export:json")?.run();
    expect(props.io.exportJson).toHaveBeenCalled();
    byId(props).get("export:pptx")?.run();
    expect(props.io.exportPptx).toHaveBeenCalled();
  });

  it("covers all 8 side-panel toggles and all 10 layouts", () => {
    const cmds = buildEditorCommands(mkProps());
    expect(cmds.filter((c) => c.kind === "panel")).toHaveLength(8);
    expect(cmds.filter((c) => c.kind === "layout")).toHaveLength(10);
  });

  it("view + map commands defer to the handle / handlers", () => {
    const props = mkProps();
    const cmds = byId(props);
    cmds.get("fit")?.run();
    expect(props.mapRef.current?.fit).toHaveBeenCalled();
    cmds.get("collapse-all")?.run();
    expect(props.mapRef.current?.setAllExpanded).toHaveBeenCalledWith(false);
    cmds.get("present")?.run();
    expect(props.map.present).toHaveBeenCalled();
    cmds.get("layout:timeline")?.run();
    expect(props.canvas.changeLayout).toHaveBeenCalledWith("timeline");
    cmds.get("panel-outline")?.run();
    expect(props.panels.setOutlineOpen).toHaveBeenCalled();
  });

  it("focus / group / summary are disabled without a selection, enabled with one", () => {
    const none = byId(mkProps(null));
    for (const id of ["focus-branch", "insert-group", "insert-summary"])
      expect(none.get(id)?.enabled, id).toBe(false);

    const withSel = byId(mkProps({ id: "n1", topic: "N", note: "" }));
    for (const id of ["focus-branch", "insert-group", "insert-summary"])
      expect(withSel.get(id)?.enabled, id).toBe(true);
  });

  it("a selection-gated command acts on the selected node when run", () => {
    const props = mkProps({ id: "n1", topic: "N", note: "" });
    byId(props).get("insert-group")?.run();
    expect(props.mapRef.current?.groupBranch).toHaveBeenCalledWith("n1");
  });

  it("exposes a 'Keyboard shortcuts' command that opens the cheat-sheet (#2)", () => {
    const props = mkProps();
    byId(props).get("shortcuts")?.run();
    expect(props.nav.openShortcuts).toHaveBeenCalled();
  });

  it("offers a jump-to-topic command per topic that selects + centres on run (#12)", () => {
    const props = mkProps();
    const jump = byId(props).get("jump:root");
    expect(jump?.kind).toBe("topic");
    expect(jump?.enabled).toBe(true); // jump is always available
    jump?.run();
    expect(props.mapRef.current?.focusNode).toHaveBeenCalledWith("root");
  });

  it("gates add-child / delete / marker / priority on a selection and routes them (#12)", () => {
    const gatedIds = ["node-add-child", "node-delete", "node-marker:⭐", "node-priority:1"];
    const none = byId(mkProps(null));
    for (const id of gatedIds) expect(none.get(id)?.enabled, id).toBe(false);

    const props = mkProps({ id: "n1", topic: "N", note: "" });
    const cmds = byId(props);
    for (const id of gatedIds) expect(cmds.get(id)?.enabled, id).toBe(true);
    cmds.get("node-add-child")?.run();
    expect(props.mapRef.current?.addChildToSelected).toHaveBeenCalled();
    cmds.get("node-delete")?.run();
    expect(props.mapRef.current?.deleteSelected).toHaveBeenCalled();
    cmds.get("node-marker:⭐")?.run();
    expect(props.mapRef.current?.toggleSelectedIcon).toHaveBeenCalledWith("⭐");
    cmds.get("node-priority:1")?.run();
    expect(props.mapRef.current?.setSelectedPriority).toHaveBeenCalledWith(1);
  });
});
