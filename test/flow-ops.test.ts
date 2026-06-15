import { describe, expect, it } from "vitest";
import {
  addAttachment,
  addChild,
  addFloatingTopic,
  addSibling,
  addSubtree,
  deleteNode,
  deleteSummary,
  findNode,
  groupSummary,
  indent,
  mergeStyle,
  outdent,
  removeAttachment,
  reparent,
  setAllExpanded,
  setBackground,
  setDue,
  setFreeform,
  setNodePos,
  setNote,
  setPriority,
  setProgress,
  setRules,
  setStart,
  setSummaryLabel,
  setTags,
  setTopic,
  toggleCollapse,
  toggleIcon,
} from "../src/mindmap/flow/ops";
import type { MindMapDoc } from "../src/model/types";

const base = (): MindMapDoc => ({
  schemaVersion: 1,
  id: "d",
  title: "Root",
  root: {
    id: "r",
    topic: "Root",
    children: [
      {
        id: "a",
        topic: "A",
        children: [
          { id: "a1", topic: "A1", children: [] },
          { id: "a2", topic: "A2", children: [] },
        ],
      },
      { id: "b", topic: "B", children: [] },
    ],
  },
  links: [{ id: "l", from: "a1", to: "b", label: "x" }],
  boundaries: [{ id: "bd", nodeIds: ["a1", "a2"], label: "grp" }],
});

const kids = (doc: MindMapDoc, id: string) => findNode(doc, id)?.children.map((c) => c.id) ?? [];

describe("flow ops — structural", () => {
  it("addSibling inserts after the target under the same parent", () => {
    const { doc, selectId } = addSibling(base(), "a1");
    expect(kids(doc, "a")).toEqual(["a1", selectId, "a2"]);
    expect(findNode(doc, selectId as string)?.topic).toBe("");
  });

  it("addSibling on the root adds a child instead", () => {
    const { doc, selectId } = addSibling(base(), "r");
    expect(kids(doc, "r")).toContain(selectId);
  });

  it("addChild appends and expands the parent", () => {
    const start = base();
    if (findNode(start, "b")) (findNode(start, "b") as { collapsed?: boolean }).collapsed = true;
    const { doc, selectId } = addChild(start, "b");
    expect(kids(doc, "b")).toEqual([selectId]);
    expect(findNode(doc, "b")?.collapsed).toBe(false);
  });

  it("outdent moves a node up to be a sibling of its parent", () => {
    const { doc } = outdent(base(), "a1");
    expect(kids(doc, "a")).toEqual(["a2"]);
    expect(kids(doc, "r")).toEqual(["a", "a1", "b"]);
  });

  it("outdent is a no-op when the parent is the root", () => {
    expect(kids(outdent(base(), "a").doc, "r")).toEqual(["a", "b"]);
  });

  it("indent moves a node under its previous sibling", () => {
    const { doc } = indent(base(), "a2");
    expect(kids(doc, "a")).toEqual(["a1"]);
    expect(kids(doc, "a1")).toEqual(["a2"]);
  });

  it("deleteNode removes the subtree and prunes dangling links + boundaries", () => {
    const { doc } = deleteNode(base(), "a1");
    expect(findNode(doc, "a1")).toBeNull();
    expect(doc.links).toEqual([]); // l referenced a1
    expect(doc.boundaries?.[0]?.nodeIds).toEqual(["a2"]);
  });

  it("deleteNode refuses to delete the root", () => {
    expect(deleteNode(base(), "r").doc.root.id).toBe("r");
  });

  it("reparent moves a subtree and guards against cycles", () => {
    const { doc } = reparent(base(), "b", "a");
    expect(kids(doc, "r")).toEqual(["a"]);
    expect(kids(doc, "a")).toContain("b");
    // cycle: can't move a under its own descendant a1
    expect(kids(reparent(base(), "a", "a1").doc, "r")).toEqual(["a", "b"]);
  });
});

describe("flow ops — content", () => {
  it("setTopic renames a node; renaming the root updates the title", () => {
    expect(findNode(setTopic(base(), "a", "AA").doc, "a")?.topic).toBe("AA");
    expect(setTopic(base(), "r", "New").doc.title).toBe("New");
  });

  it("toggleCollapse flips a parent and is a no-op for a leaf", () => {
    expect(findNode(toggleCollapse(base(), "a").doc, "a")?.collapsed).toBe(true);
    expect(findNode(toggleCollapse(base(), "b").doc, "b")?.collapsed).toBeUndefined();
  });

  it("setAllExpanded collapses/expands every non-root branch", () => {
    const collapsed = setAllExpanded(base(), false).doc;
    expect(findNode(collapsed, "a")?.collapsed).toBe(true);
    expect(findNode(collapsed, "r")?.collapsed).toBeUndefined(); // root stays open
    expect(findNode(setAllExpanded(collapsed, true).doc, "a")?.collapsed).toBe(false);
  });

  it("setNote / toggleIcon / mergeStyle update and clear cleanly", () => {
    expect(findNode(setNote(base(), "a", "hi").doc, "a")?.note).toBe("hi");
    expect(
      findNode(setNote(setNote(base(), "a", "hi").doc, "a", "").doc, "a")?.note,
    ).toBeUndefined();
    // a whitespace-only note is "no note" — cleared so the 📝 indicator disappears
    expect(
      findNode(setNote(setNote(base(), "a", "hi").doc, "a", "   ").doc, "a")?.note,
    ).toBeUndefined();
    expect(findNode(toggleIcon(base(), "a", "⭐").doc, "a")?.icons).toEqual(["⭐"]);
    expect(
      findNode(toggleIcon(toggleIcon(base(), "a", "⭐").doc, "a", "⭐").doc, "a")?.icons,
    ).toBeUndefined();
    const styled = mergeStyle(base(), "a", { background: "#fff", color: "#000" }).doc;
    expect(findNode(styled, "a")?.style).toEqual({ background: "#fff", color: "#000" });
    expect(findNode(mergeStyle(styled, "a", { background: "" }).doc, "a")?.style).toEqual({
      color: "#000",
    });
  });

  it("addSubtree grafts a re-id'd forest under a node and expands it", () => {
    const start = base();
    const target = findNode(start, "b");
    if (target) (target as { collapsed?: boolean }).collapsed = true;
    const { doc, selectId } = addSubtree(start, "b", [
      { id: "x", topic: "X", children: [{ id: "y", topic: "Y", children: [] }] },
    ]);
    const b = findNode(doc, "b");
    expect(b?.children.map((c) => c.topic)).toEqual(["X"]);
    expect(b?.children[0].children.map((c) => c.topic)).toEqual(["Y"]);
    expect(b?.collapsed).toBe(false);
    expect(b?.children[0].id).not.toBe("x"); // re-id'd, so repeated pastes can't collide
    expect(selectId).toBe(b?.children[0].id);
    // empty forest → the same doc, untouched
    const d = base();
    expect(addSubtree(d, "b", []).doc).toBe(d);
  });

  it("setTags replaces a node's tags and clears them on an empty array", () => {
    expect(findNode(setTags(base(), "a", ["x", "y"]).doc, "a")?.tags).toEqual(["x", "y"]);
    expect(
      findNode(setTags(setTags(base(), "a", ["x"]).doc, "a", []).doc, "a")?.tags,
    ).toBeUndefined();
  });

  it("setBackground sets the per-map background and clears it on empty", () => {
    expect(setBackground(base(), "#fee").doc.meta?.background).toBe("#fee");
    expect(
      setBackground(setBackground(base(), "#fee").doc, "").doc.meta?.background,
    ).toBeUndefined();
  });

  it("setPriority sets task priority and clears it on undefined", () => {
    expect(findNode(setPriority(base(), "a", 1).doc, "a")?.task?.priority).toBe(1);
    const set = setPriority(base(), "a", 2).doc;
    expect(findNode(setPriority(set, "a", undefined).doc, "a")?.task).toBeUndefined();
  });

  it("groupSummary brackets a node's subtree, labelled, and setSummaryLabel / deleteSummary edit it", () => {
    const grouped = groupSummary(base(), "a").doc;
    expect(grouped.summaries?.length).toBe(1);
    const s = grouped.summaries?.[0];
    expect(s?.nodeIds.sort()).toEqual(["a", "a1", "a2"]); // node + whole subtree
    expect(s?.label).toBe("Summary");
    // rename
    const renamed = setSummaryLabel(grouped, s?.id ?? "", "Phase 1").doc;
    expect(renamed.summaries?.[0]?.label).toBe("Phase 1");
    // clearing the label leaves the summary (label undefined → renders the default)
    expect(setSummaryLabel(grouped, s?.id ?? "", "").doc.summaries?.[0]?.label).toBeUndefined();
    // delete drops the array
    expect(deleteSummary(grouped, s?.id ?? "").doc.summaries).toBeUndefined();
  });

  it("deleteNode prunes a summary's member ids and drops an emptied summary", () => {
    const grouped = groupSummary(base(), "a").doc; // summary over a, a1, a2
    const afterDelA1 = deleteNode(grouped, "a1").doc;
    expect(afterDelA1.summaries?.[0]?.nodeIds.sort()).toEqual(["a", "a2"]);
    // deleting the whole branch empties + drops the summary
    expect(deleteNode(grouped, "a").doc.summaries).toBeUndefined();
  });

  it("setRules sets conditional-formatting rules and clears them on an empty array", () => {
    const r = { id: "r1", kind: "tag" as const, value: "risk", style: { background: "#fee" } };
    expect(setRules(base(), [r]).doc.rules).toEqual([r]);
    expect(setRules(setRules(base(), [r]).doc, []).doc.rules).toBeUndefined();
  });

  it("setProgress sets task completion, clamps, and clears task on undefined", () => {
    expect(findNode(setProgress(base(), "a", 0.5).doc, "a")?.task?.progress).toBe(0.5);
    expect(findNode(setProgress(base(), "a", 0).doc, "a")?.task?.progress).toBe(0); // 0% is kept, not dropped
    expect(findNode(setProgress(base(), "a", -1).doc, "a")?.task?.progress).toBe(0); // clamped up
    expect(findNode(setProgress(base(), "a", 9).doc, "a")?.task?.progress).toBe(1); // clamped down
    // Clearing drops the whole task object once it carries nothing else.
    const set = setProgress(base(), "a", 0.5).doc;
    expect(findNode(setProgress(set, "a", undefined).doc, "a")?.task).toBeUndefined();
  });

  it("setProgress preserves other task fields when clearing only progress", () => {
    const withTask = structuredClone(base());
    const a = findNode(withTask, "a");
    if (a) a.task = { progress: 0.5, priority: 2 };
    const cleared = findNode(setProgress(withTask, "a", undefined).doc, "a");
    expect(cleared?.task).toEqual({ priority: 2 });
  });

  it("addAttachment / removeAttachment append and drop files, clearing an emptied array", () => {
    const a = { name: "spec.pdf", dataUrl: "data:application/pdf;base64,AA==", size: 12 };
    const b = { name: "notes.txt", dataUrl: "data:text/plain;base64,QQ==", size: 3 };
    const withTwo = addAttachment(addAttachment(base(), "a", a).doc, "a", b).doc;
    expect(findNode(withTwo, "a")?.attachments?.map((x) => x.name)).toEqual([
      "spec.pdf",
      "notes.txt",
    ]);
    const afterRemove = removeAttachment(withTwo, "a", 0).doc;
    expect(findNode(afterRemove, "a")?.attachments?.map((x) => x.name)).toEqual(["notes.txt"]);
    // Removing the last one drops the array entirely.
    expect(findNode(removeAttachment(afterRemove, "a", 0).doc, "a")?.attachments).toBeUndefined();
  });

  it("addFloatingTopic appends a detached topic, with an optional link, and selects it", () => {
    const r = addFloatingTopic(base(), "Docs", "https://example.com");
    expect(r.doc.floatingTopics?.length).toBe(1);
    expect(r.doc.floatingTopics?.[0]?.topic).toBe("Docs");
    expect(r.doc.floatingTopics?.[0]?.hyperlink).toBe("https://example.com");
    expect(r.selectId).toBe(r.doc.floatingTopics?.[0]?.id);
    expect(addFloatingTopic(base(), "Idea").doc.floatingTopics?.[0]?.hyperlink).toBeUndefined();
  });

  it("setDue / setStart set dates and clear them on empty, dropping an emptied task", () => {
    expect(findNode(setDue(base(), "a", "2026-07-01").doc, "a")?.task?.due).toBe("2026-07-01");
    expect(findNode(setStart(base(), "a", "2026-06-01").doc, "a")?.task?.start).toBe("2026-06-01");
    // The two dates coexist on one task...
    const both = setStart(setDue(base(), "a", "2026-07-01").doc, "a", "2026-06-01").doc;
    expect(findNode(both, "a")?.task).toEqual({ due: "2026-07-01", start: "2026-06-01" });
    // ...and clearing the only field drops the whole task object.
    expect(findNode(setDue(setDue(base(), "a", "2026-07-01").doc, "a", "").doc, "a")?.task).toBe(
      undefined,
    );
  });
});

describe("flow ops — free-canvas (whiteboard) mode", () => {
  it("setNodePos sets an explicit position on a tree node", () => {
    const doc = setNodePos(base(), "a1", 120, 80).doc;
    expect(findNode(doc, "a1")?.pos).toEqual({ x: 120, y: 80 });
  });

  it("setNodePos also reaches floating topics", () => {
    const withFloat = addFloatingTopic(base(), "Free").doc;
    const fid = withFloat.floatingTopics?.[0]?.id as string;
    const doc = setNodePos(withFloat, fid, 5, 6).doc;
    expect(doc.floatingTopics?.[0]?.pos).toEqual({ x: 5, y: 6 });
  });

  it("setNodePos is a no-op (same doc) for an unknown id", () => {
    const doc = base();
    expect(setNodePos(doc, "nope", 1, 2).doc).toBe(doc);
  });

  it("setFreeform on seeds pos from the map + flags meta.freeform", () => {
    const positions = new Map([
      ["r", { x: 0, y: 0 }],
      ["a", { x: 10, y: 10 }],
      ["a1", { x: 20, y: 20 }],
    ]);
    const doc = setFreeform(base(), true, positions).doc;
    expect(doc.meta?.freeform).toBe(true);
    expect(findNode(doc, "a")?.pos).toEqual({ x: 10, y: 10 });
    expect(findNode(doc, "a1")?.pos).toEqual({ x: 20, y: 20 });
    expect(findNode(doc, "b")?.pos).toBeUndefined(); // not in the map → untouched
  });

  it("setFreeform off clears the flag but retains positions (for re-enabling)", () => {
    const on = setFreeform(base(), true, new Map([["a", { x: 9, y: 9 }]])).doc;
    const off = setFreeform(on, false).doc;
    expect(off.meta?.freeform).toBeUndefined();
    expect(findNode(off, "a")?.pos).toEqual({ x: 9, y: 9 });
  });
});

describe("flow ops — immutability", () => {
  it("never mutates the input doc", () => {
    const doc = base();
    const snap = JSON.stringify(doc);
    addChild(doc, "a");
    deleteNode(doc, "b");
    setTopic(doc, "a", "Z");
    setNodePos(doc, "a", 1, 1);
    setFreeform(doc, true, new Map([["a", { x: 2, y: 2 }]]));
    expect(JSON.stringify(doc)).toBe(snap);
  });
});
