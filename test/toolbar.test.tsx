import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type RefObject, createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Toolbar } from "../src/components/Toolbar";
import type { MindMapHandle, SelectedNode } from "../src/mindmap";
import { themeById } from "../src/mindmap/theme";
import type { MindMapDoc } from "../src/model/types";

// Toolbar — the redesigned two-row top bar. A pure prop-driven view, so the test drives it entirely
// through mocked prop groups + a mocked canvas handle and asserts each control / menu item calls the
// right callback. Covers row 1 (file/identity), row 2 (view/edit/canvas menus), find + quick-add.

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "m1",
  title: "Map One",
  root: { id: "root", topic: "Map One", children: [] },
};

function mockHandle(): MindMapHandle {
  // Memoise one spy per method so the test asserts the same spy the component called.
  const cache = new Map<PropertyKey, ReturnType<typeof vi.fn>>();
  return new Proxy({} as MindMapHandle, {
    get: (_t, prop) => {
      if (!cache.has(prop)) cache.set(prop, vi.fn());
      return cache.get(prop);
    },
  });
}

function setup(over: { selected?: SelectedNode | null } = {}) {
  const handle = mockHandle();
  const mapRef = createRef<MindMapHandle>() as RefObject<MindMapHandle | null>;
  mapRef.current = handle;
  const nav = {
    goHome: vi.fn(),
    openAbout: vi.fn(),
    openSearchAll: vi.fn(),
    openPaste: vi.fn(),
  };
  const panels = {
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
    infoOpen: false,
    setInfoOpen: vi.fn(),
    numbered: false,
    setNumbered: vi.fn(),
  };
  const map = {
    doc,
    liveDoc: doc,
    maps: [
      { id: "m1", title: "Map One" },
      { id: "m2", title: "Map Two" },
    ],
    mapOptions: [
      { id: "m1", title: "Map One" },
      { id: "m2", title: "Map Two" },
    ],
    switchMap: vi.fn(),
    addSheet: vi.fn(),
    load: vi.fn(),
    duplicateMap: vi.fn(),
    deleteCurrent: vi.fn(),
    present: vi.fn(),
    refreshRollupsNow: vi.fn(),
  };
  const canvas = {
    theme: themeById("light"),
    setThemeId: vi.fn(),
    layout: "side" as const,
    changeLayout: vi.fn(),
    selected: over.selected ?? null,
    setFocus: vi.fn(),
    handleImage: vi.fn(),
    handleBackgroundImage: vi.fn(),
  };
  const find = {
    query: "",
    setQuery: vi.fn(),
    replaceWith: "",
    setReplaceWith: vi.fn(),
    matchInfo: "",
    runSearch: vi.fn((e: { preventDefault: () => void }) => e.preventDefault()),
    runReplace: vi.fn(),
  };
  const io = Object.fromEntries(
    [
      "exportJson",
      "exportMarkdown",
      "exportMermaid",
      "exportXmind",
      "exportSmmx",
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
      "handleFile",
    ].map((k) => [k, vi.fn()]),
  ) as unknown as Parameters<typeof Toolbar>[0]["io"];
  const showHint = vi.fn();
  render(
    <Toolbar
      isMobile={false}
      mapRef={mapRef}
      nav={nav}
      panels={panels}
      map={map}
      canvas={canvas}
      find={find}
      io={io}
      showHint={showHint}
    />,
  );
  return { handle, nav, panels, map, canvas, find, io, showHint };
}

const u = userEvent.setup();

describe("Toolbar — row 1 (file/identity)", () => {
  it("renders the map switcher, +New, All maps, Export and More", () => {
    setup();
    expect(screen.getByLabelText("Open map")).toBeTruthy();
    expect(screen.getByLabelText(/New map from a template/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /all maps/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^export/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^more/i })).toBeTruthy();
  });

  it("switches maps + opens All maps", async () => {
    const t = setup();
    await u.selectOptions(screen.getByLabelText("Open map"), "m2");
    expect(t.map.switchMap).toHaveBeenCalledWith("m2");
    await u.click(screen.getByRole("button", { name: /all maps/i }));
    expect(t.nav.openSearchAll).toHaveBeenCalled();
  });

  it("loads a new map from the +New template menu", async () => {
    const t = setup();
    await u.selectOptions(screen.getByLabelText(/New map from a template/i), "swot");
    expect(t.map.load).toHaveBeenCalledTimes(1);
  });

  it("runs find + replace", async () => {
    const t = setup();
    const input = screen.getByLabelText("Find node");
    await u.type(input, "x");
    // The find row is a <form> with no submit button (implicit submit), so submit it directly.
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(t.find.runSearch).toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: /replace all/i }));
    expect(t.find.runReplace).toHaveBeenCalled();
  });
});

describe("Toolbar — Export menu", () => {
  it("opens and dispatches per-format handlers", async () => {
    const t = setup();
    await u.click(screen.getByRole("button", { name: /^export/i }));
    await u.click(screen.getByRole("menuitem", { name: /\.json/i }));
    expect(t.io.exportJson).toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: /^export/i }));
    await u.click(screen.getByRole("menuitem", { name: /\.pptx/i }));
    expect(t.io.exportPptx).toHaveBeenCalled();
  });
});

describe("Toolbar — More menu", () => {
  it("dispatches map + file actions", async () => {
    const t = setup();
    const open = () => u.click(screen.getByRole("button", { name: /^more/i }));
    await open();
    await u.click(screen.getByRole("menuitem", { name: /^present/i }));
    expect(t.map.present).toHaveBeenCalled();
    await open();
    await u.click(screen.getByRole("menuitem", { name: /duplicate map/i }));
    expect(t.map.duplicateMap).toHaveBeenCalled();
    await open();
    await u.click(screen.getByRole("menuitem", { name: /delete map/i }));
    expect(t.map.deleteCurrent).toHaveBeenCalled();
    await open();
    await u.click(screen.getByRole("menuitem", { name: /copy outline/i }));
    expect(t.io.copyOutline).toHaveBeenCalled();
    await open();
    await u.click(screen.getByRole("menuitem", { name: /back up/i }));
    expect(t.io.exportLibrary).toHaveBeenCalled();
    await open();
    await u.click(screen.getByRole("menuitem", { name: /about/i }));
    expect(t.nav.openAbout).toHaveBeenCalled();
  });
});

describe("Toolbar — row 2 (view/edit/canvas)", () => {
  it("structure cluster: fit, collapse/expand all, numbering, line jumps", async () => {
    const t = setup();
    await u.click(screen.getByRole("button", { name: /fit map/i }));
    expect(t.handle.fit).toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: /collapse all/i }));
    expect(t.handle.setAllExpanded).toHaveBeenCalledWith(false);
    await u.click(screen.getByRole("button", { name: /expand all/i }));
    expect(t.handle.setAllExpanded).toHaveBeenCalledWith(true);
    await u.click(screen.getByRole("button", { name: /numbering/i }));
    expect(t.panels.setNumbered).toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: /line jumps/i }));
    expect(t.handle.setLineJumps).toHaveBeenCalled();
  });

  it("Focus is disabled without a selection", () => {
    setup();
    expect(screen.getByRole("button", { name: /focus the selected/i })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("Focus fires with a selection", async () => {
    const t = setup({ selected: { id: "n1", topic: "Node", note: "" } });
    await u.click(screen.getByRole("button", { name: /focus the selected/i }));
    expect(t.canvas.setFocus).toHaveBeenCalledWith({ id: "n1", topic: "Node" });
  });

  it("Panels menu toggles each side panel", async () => {
    const t = setup();
    // PanelToggle items don't close the menu, so open once and click several.
    await u.click(screen.getByRole("button", { name: /^panels/i }));
    await u.click(screen.getByRole("menuitemcheckbox", { name: /outline/i }));
    expect(t.panels.setOutlineOpen).toHaveBeenCalled();
    await u.click(screen.getByRole("menuitemcheckbox", { name: /power filter/i }));
    expect(t.panels.toggleFilter).toHaveBeenCalled();
    await u.click(screen.getByRole("menuitemcheckbox", { name: /board/i }));
    expect(t.panels.setBoardOpen).toHaveBeenCalled();
  });

  it("Insert menu: sticky note + roll-up refresh", async () => {
    const t = setup();
    const open = () => u.click(screen.getByRole("button", { name: /^insert/i }));
    await open();
    await u.click(screen.getByRole("menuitem", { name: /sticky note/i }));
    expect(t.handle.addStickyNote).toHaveBeenCalled();
    await open();
    await u.click(screen.getByRole("menuitem", { name: /refresh all roll-ups/i }));
    expect(t.map.refreshRollupsNow).toHaveBeenCalled();
  });

  it("Canvas menu: theme select + background reset", async () => {
    const t = setup();
    await u.click(screen.getByRole("button", { name: /^canvas/i }));
    await u.selectOptions(screen.getByLabelText("Canvas theme"), "dark");
    expect(t.canvas.setThemeId).toHaveBeenCalledWith("dark");
  });

  it("layout select + quick add", async () => {
    const t = setup();
    await u.selectOptions(screen.getByLabelText("Layout"), "radial");
    expect(t.canvas.changeLayout).toHaveBeenCalledWith("radial");
    const qa = screen.getByLabelText("Quick add topic");
    await u.type(qa, "New topic{Enter}");
    expect(t.handle.quickAdd).toHaveBeenCalledWith("New topic");
  });
});
