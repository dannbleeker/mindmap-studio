import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { type RefObject, createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MindMap } from "../src/mindmap";
import { FlowMindMap } from "../src/mindmap/FlowMindMap";
import type { MindMapHandle } from "../src/mindmap/contract";
import type { MindMapDoc } from "../src/model/types";

// FlowMindMap — the React Flow canvas. Most of its body is the imperative MindMapHandle (the app's
// contract surface) plus apply/sync/undo-redo/keyboard, which run when CALLED via the ref; the rest
// (context menu, node/pane handlers, popover, inline editing) needs React Flow to actually render
// nodes + route pointer events — which it only does with a real viewport. The shim below gives it
// one in jsdom (the documented RF test mock), scoped to this file (vitest isolates each file's env).

class FiringResizeObserver {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe(target: Element) {
    const contentRect = {
      width: 1000,
      height: 800,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
    this.cb([{ target, contentRect } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = FiringResizeObserver as unknown as typeof ResizeObserver;

class DOMMatrixReadOnlyStub {
  m22: number;
  constructor(transform?: string) {
    const m = transform?.match(/scale\(([0-9.]+)\)/);
    this.m22 = m ? Number(m[1]) : 1;
  }
}
(globalThis as unknown as { DOMMatrixReadOnly: unknown }).DOMMatrixReadOnly = DOMMatrixReadOnlyStub;

const FULL_RECT = {
  x: 0,
  y: 0,
  width: 1000,
  height: 800,
  top: 0,
  left: 0,
  right: 1000,
  bottom: 800,
  toJSON: () => ({}),
};
Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
  configurable: true,
  value: () => FULL_RECT,
});
Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  get: () => 1000,
});
Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  get: () => 800,
});
if (typeof SVGElement !== "undefined") {
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 100, height: 100 }),
  });
}

// Each render gets a unique doc id: FlowMindMap keys its inner tree on doc.id.
let seq = 0;
const baseDoc = (id = `m${++seq}`): MindMapDoc => ({
  schemaVersion: 1,
  id,
  title: "Map",
  root: {
    id: "root",
    topic: "Root",
    children: [
      { id: "a", topic: "Alpha", children: [{ id: "a1", topic: "Alpha 1", children: [] }] },
      { id: "b", topic: "Beta", children: [] },
    ],
  },
});

// Always return void from the act callback: some handle methods (fit → fitView) return a Promise,
// and letting that escape into act() turns it async-without-await and corrupts the act scope.
const run = (fn: () => unknown) => {
  act(() => {
    fn();
  });
};

function mount(
  doc: MindMapDoc = baseDoc(),
  over: Partial<React.ComponentProps<typeof FlowMindMap>> = {},
) {
  const onChange = vi.fn();
  const onSelect = vi.fn();
  const onMapLink = vi.fn();
  const ref = createRef<MindMapHandle>() as RefObject<MindMapHandle | null>;
  const utils = render(
    <FlowMindMap
      doc={doc}
      onChange={onChange}
      onSelect={onSelect}
      onMapLink={onMapLink}
      ref={ref}
      {...over}
    />,
  );
  if (!ref.current) throw new Error("FlowMindMap did not expose its imperative handle");
  return { ...utils, ref, onChange, onSelect, onMapLink, h: ref.current };
}

const nodeEl = (container: HTMLElement, id: string): Element => {
  const el = container.querySelector(`.react-flow__node[data-id="${id}"]`);
  if (!el) throw new Error(`node ${id} not rendered`);
  return el;
};
const openMenu = () => document.querySelector("[data-mm-menu]") as HTMLElement | null;

describe("FlowMindMap canvas", () => {
  beforeEach(() => {
    vi.spyOn(window, "prompt").mockReturnValue("Label");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "open").mockReturnValue(null);
  });
  afterEach(() => vi.restoreAllMocks());

  it("mounts and exposes the imperative handle", () => {
    const { h } = mount();
    expect(typeof h.exportSvg).toBe("function");
    expect(typeof h.focusNode).toBe("function");
  });

  it("runs the selection-free handle actions, mutating the doc via onChange", () => {
    const { h, onChange } = mount();
    run(() => h.setAllExpanded(false));
    run(() => h.setAllExpanded(true));
    run(() => h.setBackground("#fef9c3"));
    run(() => h.setBackgroundImage("data:image/png;base64,AAAA"));
    run(() => h.setLineJumps(true));
    run(() => h.renameMap("Renamed map"));
    run(() => h.setRules([{ id: "r1", kind: "completed", style: { background: "#dcfce7" } }]));
    run(() => h.addStickyNote());
    run(() => h.quickAdd("Quick capture"));
    run(() => h.setFreeform(true));
    run(() => h.setFreeform(false));
    run(() => h.setBackdrop("onion"));
    run(() => h.setBackdropRings(1));
    run(() => h.clearBackdrop());
    run(() => h.fit());
    expect(onChange).toHaveBeenCalled();

    const blob = h.exportSvg();
    expect(blob).toBeInstanceOf(Blob);
    let count = 0;
    run(() => {
      count = h.replaceTopics("Alpha", "Omega");
    });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("focuses a node and applies the selection-dependent handle actions to it", () => {
    const { h, onSelect, onChange } = mount();
    run(() => h.focusNode("a"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));

    let noted = false;
    run(() => {
      noted = h.setSelectedNote("hello");
    });
    expect(noted).toBe(true); // a node is selected → the withSelected actions take effect

    run(() => h.setSelectedImage({ url: "data:image/png;base64,AAAA" }));
    run(() => h.toggleSelectedIcon("⭐"));
    run(() => h.setSelectedStyle({ shape: "diamond" }));
    run(() => h.setSelectedHyperlink("https://example.com"));
    run(() => h.setSelectedTags(["tag"]));
    run(() => h.setSelectedProgress(0.5));
    run(() => h.setSelectedDue("2026-06-20"));
    run(() => h.setSelectedStart("2026-06-19"));
    run(() => h.setSelectedPriority(1));
    run(() =>
      h.addSelectedAttachment({ name: "f.txt", dataUrl: "data:text/plain;base64,AA", size: 3 }),
    );
    run(() => h.removeSelectedAttachment(0));
    run(() => h.addSubtreeToSelected([{ id: "x", topic: "Grafted", children: [] }]));
    run(() => h.setSelectedRollup("m99"));
    run(() => h.groupBranch("a"));
    run(() => h.groupSummary("a"));
    expect(onChange).toHaveBeenCalled();
  });

  it("drives keyboard tree-building and undo / redo", () => {
    const { h, onChange } = mount();
    run(() => h.focusNode("a"));
    onChange.mockClear();
    run(() => fireEvent.keyDown(document, { key: "Enter" })); // add sibling
    run(() => fireEvent.keyDown(document, { key: "Tab" })); // add child
    run(() => fireEvent.keyDown(document, { key: "Tab", shiftKey: true })); // outdent
    run(() => fireEvent.keyDown(document, { key: "F2" })); // begin edit
    run(() => h.focusNode("b"));
    run(() => fireEvent.keyDown(document, { key: "Delete" })); // delete
    expect(onChange).toHaveBeenCalled();
    // Undo/redo work regardless of selection.
    run(() => fireEvent.keyDown(document, { key: "z", ctrlKey: true }));
    run(() => fireEvent.keyDown(document, { key: "z", ctrlKey: true, shiftKey: true }));
    run(() => fireEvent.keyDown(document, { key: "y", ctrlKey: true }));
  });

  it("drops a URL onto the canvas as a floating topic", () => {
    const { container, onChange } = mount();
    const surface = container.querySelector("div");
    if (!surface) throw new Error("no canvas surface");
    const dataTransfer = {
      types: ["text/uri-list"],
      getData: (t: string) => (t === "text/uri-list" ? "https://dropped.example.com" : ""),
      dropEffect: "",
    };
    run(() => {
      fireEvent.dragOver(surface, { dataTransfer });
      fireEvent.drop(surface, { dataTransfer });
    });
    expect(onChange).toHaveBeenCalled();
  });

  it("renders overlays for a doc with boundaries / summaries / callouts / backdrop in brace layout", () => {
    const richDoc: MindMapDoc = {
      schemaVersion: 1,
      id: "rich1",
      title: "Rich",
      root: {
        id: "root",
        topic: "R",
        children: [
          {
            id: "a",
            topic: "A",
            callouts: [{ id: "c1", text: "hi", dx: 10, dy: 0 }],
            children: [{ id: "a1", topic: "A1", children: [] }],
          },
          { id: "b", topic: "B", children: [] },
        ],
      },
      boundaries: [{ id: "bd1", nodeIds: ["a"], label: "Box" }],
      summaries: [{ id: "s1", nodeIds: ["a"], label: "Sum" }],
      links: [{ id: "l1", from: "a", to: "b", label: "rel" }],
      floatingTopics: [{ id: "f1", topic: "Float", children: [] }],
      backdrop: { kind: "onion", rings: 2 },
      meta: { lineJumps: true },
    };
    const { h } = mount(richDoc, { direction: "brace" });
    // Selecting a node renders the on-node quick-action popover block.
    run(() => h.focusNode("a"));
    run(() => h.fit());
    expect(h).toBeTruthy();
  });

  it("mounts through the lazy MindMap entry seam (index.tsx)", async () => {
    const ref = createRef<MindMapHandle>() as RefObject<MindMapHandle | null>;
    render(<MindMap doc={baseDoc()} ref={ref} />);
    // <MindMap> code-splits FlowMindMap behind Suspense; wait for the chunk to resolve + commit.
    await waitFor(() => expect(ref.current).toBeTruthy());
  });

  it("opens the right-click context menu and runs its actions", () => {
    const { container, onChange } = mount();
    const reopen = () => run(() => fireEvent.contextMenu(nodeEl(container, "a")));
    reopen();
    const menu = openMenu();
    expect(menu).toBeTruthy();
    // The items builder produced the full set.
    for (const label of [
      "Add child",
      "Add sibling",
      "Rename",
      "Link to…",
      "Add callout",
      "Group in boundary",
      "Summarize branch",
      "Copy branch",
      "Collapse / expand",
      "Delete",
    ]) {
      expect(within(menu as HTMLElement).getByText(label)).toBeTruthy();
    }

    const clickItem = (label: string) => {
      const m = openMenu();
      if (m) run(() => fireEvent.click(within(m).getByText(label)));
    };
    clickItem("Add callout");
    reopen();
    clickItem("Group in boundary");
    reopen();
    clickItem("Summarize branch");
    reopen();
    clickItem("Copy branch"); // → branch clipboard now has something
    reopen();
    expect(within(openMenu() as HTMLElement).getByText("Paste branch here")).toBeTruthy();
    clickItem("Paste branch here");
    reopen();
    clickItem("Add child");
    reopen();
    clickItem("Add sibling");
    reopen();
    clickItem("Collapse / expand");
    reopen();
    // Branch-layout override <select>.
    run(() =>
      fireEvent.change(within(openMenu() as HTMLElement).getByRole("combobox"), {
        target: { value: "org-down" },
      }),
    );
    // Esc closes the menu (the close-on-Escape effect).
    reopen();
    run(() => fireEvent.keyDown(document, { key: "Escape" }));
    expect(openMenu()).toBeNull();
    // Delete last (it removes node "a").
    reopen();
    clickItem("Delete");
    expect(onChange).toHaveBeenCalled();
  });

  it("selects on node click, shows the quick-action popover, and deselects on pane click", () => {
    const { container, onSelect, onChange } = mount();
    const sel = (id: string) => run(() => fireEvent.click(nodeEl(container, id)));
    const pop = (name: string) => run(() => fireEvent.click(screen.getByRole("button", { name })));
    sel("a");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
    // Popover quick actions (NodeToolbar) — aria-labelled buttons. Add-child/sibling/Rename each
    // enter edit (hiding the popover), so re-select before each to keep one visible.
    pop("Collapse / expand"); // toggleCollapse — popover stays
    sel("a");
    pop("Rename"); // editingId = a
    sel("b");
    pop("Add child");
    sel("a");
    pop("Add sibling");
    sel("b");
    pop("Delete");
    // Pane click clears the selection.
    const pane = container.querySelector(".react-flow__pane");
    if (pane) run(() => fireEvent.click(pane));
    expect(onChange).toHaveBeenCalled();
  });

  it("draws a relationship via the Link to… gesture", () => {
    const { container, onChange } = mount();
    run(() => fireEvent.contextMenu(nodeEl(container, "a")));
    run(() => fireEvent.click(within(openMenu() as HTMLElement).getByText("Link to…")));
    expect(screen.getByText(/Click a target node/)).toBeTruthy();
    run(() => fireEvent.click(nodeEl(container, "b"))); // completes the link (prompt → "Label")
    expect(onChange).toHaveBeenCalled();
  });

  it("commits inline edits and runs the node affordances (link / progress / collapse)", () => {
    const doc: MindMapDoc = {
      schemaVersion: 1,
      id: "edit1",
      title: "Edit",
      root: {
        id: "root",
        topic: "Root",
        children: [
          {
            id: "a",
            topic: "Alpha",
            hyperlink: "https://example.com",
            note: "a note",
            task: { progress: 0.25 },
            children: [{ id: "a1", topic: "Alpha 1", children: [] }],
          },
        ],
      },
    };
    const onOpenNote = vi.fn();
    const { container, onChange, h } = mount(doc, { onOpenNote });
    const editable = (): Element => {
      const e = container.querySelector('[contenteditable="true"]');
      if (!e) throw new Error("no contenteditable in edit mode");
      return e;
    };

    // Inline edit: double-click the topic text → contenteditable (covers editingApi.beginEdit) →
    // Enter commits + adds a sibling. The onDoubleClick lives on TopicNode's inner div, so fire on
    // the text element and let it bubble.
    run(() =>
      fireEvent.doubleClick(within(nodeEl(container, "a") as HTMLElement).getByText("Alpha")),
    );
    run(() => fireEvent.keyDown(editable(), { key: "Enter" })); // commitAndAdd sibling

    // Re-enter edit via F2 for the Tab / Escape / blur commit paths.
    const editA = () => {
      run(() => h.focusNode("a"));
      run(() => fireEvent.keyDown(document, { key: "F2" }));
    };
    editA();
    run(() => fireEvent.keyDown(editable(), { key: "Tab" })); // commitAndAdd child
    editA();
    run(() => fireEvent.keyDown(editable(), { key: "Escape" })); // cancelEdit
    editA();
    run(() => fireEvent.blur(editable())); // commitEdit

    // Node affordances: follow the hyperlink (openLink → window.open, stubbed), step the task pie
    // (cycleProgress), and toggle collapse (the root also has a collapse button → take the first).
    run(() => fireEvent.click(screen.getByTitle(/Follow link/)));
    expect(window.open).toHaveBeenCalled();
    run(() => fireEvent.click(screen.getByTitle(/click to change/)));
    // 📝 indicator (present only because the node has a note) → asks the app to open the Notes tab.
    // Do this before the collapse below, which collapses the root and hides the node.
    run(() => fireEvent.click(screen.getByTitle("Show note")));
    expect(onOpenNote).toHaveBeenCalled();
    run(() => fireEvent.click(screen.getAllByTitle(/Collapse|Expand/)[0]));
    expect(onChange).toHaveBeenCalled();
  });

  it("toggles the minimap, follows in-map / map links, and edits a relationship edge", () => {
    const doc: MindMapDoc = {
      schemaVersion: 1,
      id: "links1",
      title: "Links",
      root: {
        id: "root",
        topic: "Root",
        children: [
          { id: "a", topic: "A", hyperlink: "#node=b", children: [] },
          { id: "b", topic: "B", hyperlink: "#map=m2", children: [] },
        ],
      },
      links: [{ id: "l1", from: "a", to: "b", label: "rel" }],
    };
    const onSelectEdge = vi.fn();
    const { container, onMapLink, onChange, h } = mount(doc, { onSelectEdge });
    // Minimap toggle (the bottom-right Panel button) — covers toggleMinimap + its localStorage write.
    run(() => fireEvent.click(screen.getByText(/Minimap/)));
    run(() => fireEvent.click(screen.getByText(/Minimap/)));
    // openLink kinds: in-map jump (#node= → focusNodeById) and map link (#map= → onMapLink).
    run(() =>
      fireEvent.click(within(nodeEl(container, "a") as HTMLElement).getByTitle(/Follow link/)),
    );
    run(() =>
      fireEvent.click(within(nodeEl(container, "b") as HTMLElement).getByTitle(/Follow link/)),
    );
    expect(onMapLink).toHaveBeenCalledWith("m2");

    // Relationship edge: clicking it selects the edge and surfaces the resolved SelectedEdge. RF
    // wires the edge click on the wide invisible interaction path (the visible <g> has none).
    const edgeHit = () =>
      (container.querySelector(".react-flow__edge-interaction") ??
        container.querySelector(".react-flow__edge-path")) as Element;
    run(() => fireEvent.click(edgeHit()));
    expect(onSelectEdge).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "l1", label: "rel", arrow: "to", dash: "dashed" }),
    );

    // The imperative edge mutators apply to the selected edge.
    run(() => h.setLinkArrow("both"));
    run(() => h.setLinkStyle({ color: "#ff0000", dash: "dotted" }));
    run(() => h.setLinkLabel("depends on"));
    const link = () => (onChange.mock.calls.at(-1)?.[0] as MindMapDoc).links?.[0];
    expect(link()).toMatchObject({
      arrow: "both",
      color: "#ff0000",
      dash: "dotted",
      label: "depends on",
    });

    // Selecting a node clears the edge selection (mutually exclusive).
    run(() => fireEvent.click(nodeEl(container, "a")));
    expect(onSelectEdge).toHaveBeenLastCalledWith(null);
    // With no edge selected, the edge mutators are no-ops returning false.
    let ret: boolean | undefined;
    run(() => {
      ret = h.deleteLink();
    });
    expect(ret).toBe(false);

    // Re-select + delete the edge via the handle.
    run(() => fireEvent.click(edgeHit()));
    run(() => h.deleteLink());
    expect((onChange.mock.calls.at(-1)?.[0] as MindMapDoc).links).toBeUndefined();
  });

  it("re-syncs on live direction / numbering / filter prop changes", () => {
    const doc = baseDoc();
    const { rerender, ref } = mount(doc);
    const view = (over: Partial<React.ComponentProps<typeof FlowMindMap>>) => (
      <FlowMindMap doc={doc} ref={ref} {...over} />
    );
    run(() => rerender(view({ direction: "brace" }))); // direction effect → sync(brace)
    run(() => rerender(view({ direction: "brace", numbered: true }))); // numbering effect → sync
    run(() => rerender(view({ direction: "brace", numbered: true, litIds: new Set(["a"]) }))); // filter
    run(() => rerender(view({ direction: "side", numbered: false, litIds: null })));
    expect(ref.current).toBeTruthy();
  });

  it("selects + edits overlays (boundary/summary/callout) with 4-way mutual exclusivity", () => {
    const doc: MindMapDoc = {
      schemaVersion: 1,
      id: "ov1",
      title: "Overlays",
      root: {
        id: "root",
        topic: "R",
        children: [
          {
            id: "a",
            topic: "A",
            callouts: [{ id: "c1", text: "note", dx: 10, dy: 0 }],
            children: [],
          },
          { id: "b", topic: "B", children: [] },
        ],
      },
      boundaries: [{ id: "bd1", nodeIds: ["a"], label: "Box" }],
      summaries: [{ id: "s1", nodeIds: ["a"], label: "Sum" }],
      links: [{ id: "l1", from: "a", to: "b", label: "rel" }],
    };
    const onSelectOverlay = vi.fn();
    const onSelectEdge = vi.fn();
    const { container, onChange, h } = mount(doc, { onSelectOverlay, onSelectEdge });
    const lastDoc = () => onChange.mock.calls.at(-1)?.[0] as MindMapDoc;

    // Click the boundary's label chip → selects the boundary.
    run(() => fireEvent.click(screen.getByText("Box")));
    expect(onSelectOverlay).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "boundary", id: "bd1" }),
    );
    // Edit + delete via the handle act on the selected overlay.
    run(() => h.setOverlayLabel("Scope"));
    expect(lastDoc().boundaries?.[0]?.label).toBe("Scope");

    // Selecting the summary clears the boundary (overlay→overlay).
    run(() => fireEvent.click(screen.getByText("Sum")));
    expect(onSelectOverlay).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "summary", id: "s1" }),
    );

    // Selecting a node clears the overlay (mutual exclusivity).
    run(() => fireEvent.click(nodeEl(container, "a")));
    expect(onSelectOverlay).toHaveBeenLastCalledWith(null);
    // With no overlay selected, the overlay mutators are no-ops returning false.
    let ret: boolean | undefined;
    run(() => {
      ret = h.deleteOverlay();
    });
    expect(ret).toBe(false);

    // Selecting an edge then an overlay each clears the other (4-way exclusivity).
    const edgeHit = () =>
      (container.querySelector(".react-flow__edge-interaction") ??
        container.querySelector(".react-flow__edge-path")) as Element;
    run(() => fireEvent.click(edgeHit()));
    expect(onSelectEdge).toHaveBeenLastCalledWith(expect.objectContaining({ id: "l1" }));
    run(() => fireEvent.click(screen.getByText("Sum")));
    expect(onSelectEdge).toHaveBeenLastCalledWith(null); // overlay select cleared the edge

    // deleteOverlay on the selected summary removes it + fires null.
    run(() => h.deleteOverlay());
    expect(lastDoc().summaries).toBeUndefined();
    expect(onSelectOverlay).toHaveBeenLastCalledWith(null);
  });
});
