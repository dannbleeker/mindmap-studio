import { describe, expect, it } from "vitest";
import {
  addChild,
  addSibling,
  deleteNode,
  findNode,
  indent,
  mergeStyle,
  outdent,
  reparent,
  setAllExpanded,
  setNote,
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
});

describe("flow ops — immutability", () => {
  it("never mutates the input doc", () => {
    const doc = base();
    const snap = JSON.stringify(doc);
    addChild(doc, "a");
    deleteNode(doc, "b");
    setTopic(doc, "a", "Z");
    expect(JSON.stringify(doc)).toBe(snap);
  });
});
