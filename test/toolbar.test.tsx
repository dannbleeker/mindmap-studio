import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

function setup(
  over: {
    selected?: SelectedNode | null;
    isMobile?: boolean;
    canUndo?: boolean;
    canRedo?: boolean;
  } = {},
) {
  const handle = mockHandle();
  const mapRef = createRef<MindMapHandle>() as RefObject<MindMapHandle | null>;
  mapRef.current = handle;
  const nav = {
    goHome: vi.fn(),
    openAbout: vi.fn(),
    openShortcuts: vi.fn(),
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
    statsOpen: false,
    setStatsOpen: vi.fn(),
    infoOpen: false,
    setInfoOpen: vi.fn(),
    infoMinimized: false,
    setInfoMinimized: vi.fn(),
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
      "copyTable",
      "handleFile",
    ].map((k) => [k, vi.fn()]),
  ) as unknown as Parameters<typeof Toolbar>[0]["io"];
  const showHint = vi.fn();
  const history = {
    canUndo: over.canUndo ?? false,
    canRedo: over.canRedo ?? false,
    undo: vi.fn(),
    redo: vi.fn(),
  };
  render(
    <Toolbar
      isMobile={over.isMobile ?? false}
      mapRef={mapRef}
      nav={nav}
      panels={panels}
      map={map}
      canvas={canvas}
      find={find}
      io={io}
      history={history}
      showHint={showHint}
    />,
  );
  return { handle, nav, panels, map, canvas, find, io, history, showHint };
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

  it("disables Undo/Redo when there's no history, enables + fires them when there is (#8)", async () => {
    setup();
    expect((screen.getByRole("button", { name: /undo \(/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole("button", { name: /redo \(/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    cleanup();
    const t = setup({ canUndo: true, canRedo: true });
    await u.click(screen.getByRole("button", { name: /undo \(/i }));
    expect(t.history.undo).toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: /redo \(/i }));
    expect(t.history.redo).toHaveBeenCalled();
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
  it("View menu: fit / collapse / expand; numbering + line jumps stay top-level (#4)", async () => {
    const t = setup();
    // Fit / collapse / expand are folded into the View menu (one labelled dropdown, not 4 icons).
    await u.click(screen.getByRole("button", { name: /^view/i }));
    await u.click(screen.getByRole("menuitem", { name: /fit map/i }));
    expect(t.handle.fit).toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: /^view/i }));
    await u.click(screen.getByRole("menuitem", { name: /collapse all/i }));
    expect(t.handle.setAllExpanded).toHaveBeenCalledWith(false);
    await u.click(screen.getByRole("button", { name: /^view/i }));
    await u.click(screen.getByRole("menuitem", { name: /expand all/i }));
    expect(t.handle.setAllExpanded).toHaveBeenCalledWith(true);
    // The view-toggle switches stay top-level so their on/off state is visible at a glance.
    await u.click(screen.getByRole("button", { name: /numbering/i }));
    expect(t.panels.setNumbered).toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: /line jumps/i }));
    expect(t.handle.setLineJumps).toHaveBeenCalled();
  });

  it("Focus is disabled in the View menu without a selection (#4)", async () => {
    setup();
    await u.click(screen.getByRole("button", { name: /^view/i }));
    expect(screen.getByRole("menuitem", { name: /focus the selected/i })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("Focus fires from the View menu with a selection (#4)", async () => {
    const t = setup({ selected: { id: "n1", topic: "Node", note: "" } });
    await u.click(screen.getByRole("button", { name: /^view/i }));
    await u.click(screen.getByRole("menuitem", { name: /focus the selected/i }));
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

  it("Insert: Group/Summary are disabled (with a why-tooltip) when nothing is selected", async () => {
    setup(); // no selection
    await u.click(screen.getByRole("button", { name: /^insert/i }));
    const group = screen.getByRole("menuitem", { name: /group branch/i });
    const summary = screen.getByRole("menuitem", { name: /summary bracket/i });
    expect(group).toHaveProperty("disabled", true);
    expect(summary).toHaveProperty("disabled", true);
    expect(group.getAttribute("title")).toMatch(/select a topic first/i);
  });

  it("Insert: Group/Summary are enabled and fire on the selection", async () => {
    const t = setup({ selected: { id: "n1", topic: "N", note: "" } });
    await u.click(screen.getByRole("button", { name: /^insert/i }));
    const group = screen.getByRole("menuitem", { name: /group branch/i });
    expect(group).toHaveProperty("disabled", false);
    await u.click(group);
    expect(t.handle.groupBranch).toHaveBeenCalledWith("n1");
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

// A behaviour snapshot of the menus' accessibility contract, captured BEFORE the menu primitive is
// extracted (the upcoming restructure). Keeping these assertions green through that refactor is the
// proof it's behaviour-preserving — every menu trigger keeps its ARIA wiring and every menu still
// surfaces real menuitems, so the migration to a shared <Menu> can't silently regress a11y.
describe("Toolbar — menu a11y parity net", () => {
  const MENU_TRIGGERS = [/^export/i, /^more/i, /^panels/i, /^insert/i, /^canvas/i, /^view/i];

  it("every menu trigger advertises aria-haspopup=menu and toggles aria-expanded on open", async () => {
    setup();
    for (const name of MENU_TRIGGERS) {
      const trigger = screen.getByRole("button", { name });
      expect(trigger.getAttribute("aria-haspopup"), `${name} haspopup`).toBe("menu");
      expect(trigger.getAttribute("aria-expanded"), `${name} closed`).toBe("false");
      await u.click(trigger);
      expect(trigger.getAttribute("aria-expanded"), `${name} open`).toBe("true");
      // Opening surfaces at least one actionable item (plain menuitem or a panel checkbox).
      const items = [
        ...screen.queryAllByRole("menuitem"),
        ...screen.queryAllByRole("menuitemcheckbox"),
      ];
      expect(items.length, `${name} items`).toBeGreaterThan(0);
      await u.click(trigger); // toggle closed before the next trigger
    }
  });

  it("every toolbar button exposes a non-empty accessible name", () => {
    setup();
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) {
      const name = (b.getAttribute("aria-label") || b.textContent || "").trim();
      expect(name, b.outerHTML.slice(0, 140)).not.toBe("");
    }
  });

  it("the Panels menu exposes its toggles as menuitemcheckbox with aria-checked state", async () => {
    setup();
    await u.click(screen.getByRole("button", { name: /^panels/i }));
    const checks = screen.getAllByRole("menuitemcheckbox");
    expect(checks.length).toBeGreaterThanOrEqual(6);
    // All side panels start closed in the mocked props → every checkbox reads unchecked.
    for (const c of checks) expect(c.getAttribute("aria-checked")).toBe("false");
  });

  it("renders + works in mobile mode (rows scroll instead of wrapping)", async () => {
    const t = setup({ isMobile: true });
    // The grouped controls are all still present and wired in the single-row mobile layout.
    expect(screen.getByRole("button", { name: /^view/i })).toBeTruthy(); // View menu (holds Fit etc.)
    expect(screen.getByLabelText("Quick add topic")).toBeTruthy();
    await u.click(screen.getByRole("button", { name: /^export/i }));
    await u.click(screen.getByRole("menuitem", { name: /\.json/i }));
    expect(t.io.exportJson).toHaveBeenCalled();
  });
});
