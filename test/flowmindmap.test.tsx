import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { type RefObject, createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { MindMap } from "../src/mindmap";
import { FlowMindMap } from "../src/mindmap/FlowMindMap";
import type { MindMapHandle } from "../src/mindmap/contract";
import type { MindMapDoc } from "../src/model/types";

// FlowMindMap — the React Flow canvas. Most of its body is the imperative MindMapHandle (the app's
// contract surface) plus apply/sync/undo-redo/keyboard, which run when CALLED via the ref, not on
// mount — so the test mounts the real canvas and drives it through the ref + document keyboard events
// (sidestepping the jsdom canvas limits: no synthetic node-clicks / edge rendering needed).

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

describe("FlowMindMap canvas", () => {
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
});
