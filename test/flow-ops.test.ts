import { describe, expect, it } from "vitest";
import {
  addAttachment,
  addChild,
  addFloatingTopic,
  addSibling,
  addStickyNote,
  addSubtree,
  applyRollups,
  clearBackdrop,
  collectRollupMapIds,
  deleteNode,
  deleteSummary,
  findAnyNode,
  findNode,
  groupBranch,
  groupSummary,
  indent,
  mergeStyle,
  outdent,
  pasteBranch,
  removeAttachment,
  reparent,
  replaceTopics,
  setAllExpanded,
  setBackdrop,
  setBackdropRings,
  setBackground,
  setBackgroundImage,
  setDue,
  setFreeform,
  setHyperlink,
  setImage,
  setLineJumps,
  setNodeLayout,
  setNodePos,
  setNote,
  setPriority,
  setProgress,
  setRollup,
  setRules,
  setStart,
  setSummaryLabel,
  setTags,
  setTopic,
  setTopicRich,
  toggleCollapse,
  toggleIcon,
} from "../src/mindmap/flow/ops";
import type { MapNode, MindMapDoc } from "../src/model/types";

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

  it("setNodeLayout sets a per-branch layout override and clears it on undefined / empty", () => {
    const d1 = setNodeLayout(base(), "a", "org-down").doc;
    expect(findNode(d1, "a")?.layout).toBe("org-down");
    expect(findNode(setNodeLayout(d1, "a", undefined).doc, "a")?.layout).toBeUndefined();
    expect(findNode(setNodeLayout(d1, "a", "").doc, "a")?.layout).toBeUndefined();
    const noNode = base();
    expect(setNodeLayout(noNode, "nope", "grid").doc).toBe(noNode); // no-op for unknown id
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

describe("flow ops — diagram backdrops", () => {
  it("setBackdrop sets the frame; clearBackdrop removes it", () => {
    const d = setBackdrop(base(), "onion", 3).doc;
    expect(d.backdrop).toEqual({ kind: "onion", rings: 3 });
    expect(clearBackdrop(d).doc.backdrop).toBeUndefined();
    const noBackdrop = base();
    expect(clearBackdrop(noBackdrop).doc).toBe(noBackdrop); // no-op returns the same doc
  });

  it("setBackdropRings clamps to 2..6 and is a no-op for venn", () => {
    const o = setBackdrop(base(), "onion", 3).doc;
    expect(setBackdropRings(o, 5).doc.backdrop?.rings).toBe(6);
    expect(setBackdropRings(o, -5).doc.backdrop?.rings).toBe(2);
    const v = setBackdrop(base(), "venn2").doc;
    expect(setBackdropRings(v, 1).doc.backdrop).toEqual({ kind: "venn2" });
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

describe("flow ops — copy/paste branch", () => {
  it("findAnyNode finds tree nodes and floating-topic nodes", () => {
    const doc = base();
    doc.floatingTopics = [
      { id: "f", topic: "F", children: [{ id: "f1", topic: "F1", children: [] }] },
    ];
    expect(findAnyNode(doc, "a1")?.topic).toBe("A1"); // in the tree
    expect(findAnyNode(doc, "f1")?.topic).toBe("F1"); // inside a floating topic
    expect(findAnyNode(doc, "nope")).toBeNull();
  });

  it("pasteBranch grafts a re-id'd copy under a tree node and expands it", () => {
    const src = findNode(base(), "a") as MapNode; // A with A1, A2
    const { doc, selectId } = pasteBranch(base(), "b", src);
    const b = findNode(doc, "b");
    expect(b?.children).toHaveLength(1);
    expect(b?.children[0].topic).toBe("A");
    expect(b?.children[0].id).not.toBe("a"); // re-id'd, no clash
    expect(b?.children[0].children.map((c) => c.topic)).toEqual(["A1", "A2"]);
    expect(selectId).toBe(b?.children[0].id);
  });

  it("pasteBranch with no/unknown parent drops the copy in as a floating topic", () => {
    const src = findNode(base(), "b") as MapNode;
    expect(pasteBranch(base(), null, src).doc.floatingTopics?.[0]?.topic).toBe("B");
    expect(pasteBranch(base(), "ghost", src).doc.floatingTopics?.[0]?.topic).toBe("B");
  });

  it("pasteBranch re-ids every node so repeated pastes never collide", () => {
    const src = findNode(base(), "a") as MapNode;
    const once = pasteBranch(base(), "b", src);
    const twice = pasteBranch(once.doc, "b", src);
    const ids = new Set<string>();
    const count = (n: MapNode): number => {
      ids.add(n.id);
      return 1 + n.children.reduce((s, c) => s + count(c), 0);
    };
    const total = count(twice.doc.root);
    expect(ids.size).toBe(total); // every id is unique (no clash across two pastes)
  });

  it("pasteBranch mutates neither the input doc nor the source node", () => {
    const doc = base();
    const src = findNode(base(), "a") as MapNode;
    const docSnap = JSON.stringify(doc);
    const srcSnap = JSON.stringify(src);
    pasteBranch(doc, "b", src);
    expect(JSON.stringify(doc)).toBe(docSnap);
    expect(JSON.stringify(src)).toBe(srcSnap);
  });
});

describe("flow ops — sticky notes", () => {
  it("addStickyNote adds an amber floating topic with a position", () => {
    const { doc, selectId } = addStickyNote(base());
    expect(doc.floatingTopics).toHaveLength(1);
    const note = doc.floatingTopics?.[0];
    expect(note?.topic).toBe("Note");
    expect(note?.style?.background).toBe("#fef3c7");
    expect(note?.pos).toBeDefined();
    expect(selectId).toBe(note?.id);
  });

  it("addStickyNote takes custom text and staggers successive notes", () => {
    const d1 = addStickyNote(base(), "Idea").doc;
    expect(d1.floatingTopics?.[0]?.topic).toBe("Idea");
    const d2 = addStickyNote(d1).doc;
    expect(d2.floatingTopics).toHaveLength(2);
    expect(d2.floatingTopics?.[1]?.pos).not.toEqual(d2.floatingTopics?.[0]?.pos);
  });
});

describe("flow ops — roll-ups", () => {
  it("setRollup binds/unbinds a node to a source map, no-op for an unknown id", () => {
    const d1 = setRollup(base(), "a", "src-map").doc;
    expect(findNode(d1, "a")?.rollup).toBe("src-map");
    expect(findNode(setRollup(d1, "a", "").doc, "a")?.rollup).toBeUndefined();
    expect(findNode(setRollup(d1, "a", undefined).doc, "a")?.rollup).toBeUndefined();
    const noNode = base();
    expect(setRollup(noNode, "ghost", "m").doc).toBe(noNode);
  });

  it("collectRollupMapIds returns distinct source ids across tree + floating", () => {
    let d = setRollup(base(), "a", "m1").doc;
    d = setRollup(d, "b", "m2").doc;
    d.floatingTopics = [{ id: "f", topic: "F", children: [], rollup: "m1" }];
    expect(collectRollupMapIds(d).sort()).toEqual(["m1", "m2"]);
    expect(collectRollupMapIds(base())).toEqual([]);
  });

  it("applyRollups replaces a roll-up node's children with re-id'd source branches", () => {
    const d = setRollup(base(), "b", "m1").doc; // b is a leaf
    const sources = new Map<string, MapNode[]>([
      [
        "m1",
        [
          { id: "s1", topic: "Pulled A", children: [] },
          { id: "s2", topic: "Pulled B", children: [] },
        ],
      ],
    ]);
    const { doc, count } = applyRollups(d, sources);
    expect(count).toBe(1);
    const b = findNode(doc, "b");
    expect(b?.children.map((c) => c.topic)).toEqual(["Pulled A", "Pulled B"]);
    expect(b?.children[0].id).not.toBe("s1"); // re-id'd
  });

  it("applyRollups is a no-op (same ref) when no source matches", () => {
    const d = setRollup(base(), "b", "m1").doc;
    const { doc, count } = applyRollups(d, new Map());
    expect(count).toBe(0);
    expect(doc).toBe(d);
  });
});

describe("flow ops — reparent edge cases", () => {
  it("inserts at an explicit index among the destination's children", () => {
    // Move b under a at index 1, between a1 and a2.
    const { doc } = reparent(base(), "b", "a", 1);
    expect(kids(doc, "a")).toEqual(["a1", "b", "a2"]);
    expect(kids(doc, "r")).toEqual(["a"]);
  });

  it("appends to the end when no index is given", () => {
    const { doc } = reparent(base(), "b", "a");
    expect(kids(doc, "a")).toEqual(["a1", "a2", "b"]);
  });

  it("expands a collapsed destination so the moved node is visible", () => {
    const start = base();
    const a = findNode(start, "a");
    if (a) (a as { collapsed?: boolean }).collapsed = true;
    expect(findNode(reparent(start, "b", "a").doc, "a")?.collapsed).toBe(false);
  });

  it("is a no-op (same doc) when reparenting a node onto itself", () => {
    const d = base();
    expect(reparent(d, "a", "a").doc).toBe(d);
  });

  it("is a no-op for an unknown destination, or moving the root", () => {
    const d = base();
    expect(reparent(d, "a", "ghost").doc).toBe(d); // unknown new parent
    expect(reparent(d, "r", "a").doc).toBe(d); // the root has no parent to detach from
  });
});

describe("flow ops — deleteNode cascade", () => {
  // A richer doc: links + boundaries + summaries that all reference the branch being deleted, so
  // every prune path runs in one delete.
  const withRelations = (): MindMapDoc => ({
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
          children: [{ id: "a1", topic: "A1", children: [] }],
          callouts: [{ id: "co", text: "note", dx: 10, dy: 0 }],
        },
        { id: "b", topic: "B", children: [] },
      ],
    },
    links: [
      { id: "l1", from: "a", to: "b" }, // touches the deleted branch → pruned
      { id: "l2", from: "a1", to: "b" }, // touches a descendant → pruned
    ],
    boundaries: [
      { id: "bd1", nodeIds: ["a", "a1"], label: "all-doomed" }, // empties → dropped
      { id: "bd2", nodeIds: ["a1", "b"], label: "partial" }, // keeps b
    ],
    summaries: [{ id: "su1", nodeIds: ["a", "b"], label: "s" }], // keeps b
  });

  it("prunes links touching the removed subtree (root or descendant endpoints)", () => {
    const { doc } = deleteNode(withRelations(), "a");
    // Both links referenced a or a1, so all are removed. (deleteNode filters links in place — it
    // leaves an empty array rather than dropping the key, unlike boundaries/summaries below.)
    expect(doc.links).toEqual([]);
  });

  it("trims boundary member ids and drops a boundary that empties", () => {
    const { doc } = deleteNode(withRelations(), "a");
    // bd1 (all members in the deleted branch) is gone; bd2 keeps only b.
    expect(doc.boundaries).toHaveLength(1);
    expect(doc.boundaries?.[0]).toMatchObject({ id: "bd2", nodeIds: ["b"] });
  });

  it("trims summary member ids the same way (keeps the surviving node)", () => {
    const { doc } = deleteNode(withRelations(), "a");
    expect(doc.summaries).toHaveLength(1);
    expect(doc.summaries?.[0]).toMatchObject({ id: "su1", nodeIds: ["b"] });
  });

  it("removes the node's own callouts along with the node (they live on it)", () => {
    const { doc } = deleteNode(withRelations(), "a");
    expect(findNode(doc, "a")).toBeNull();
  });

  it("selects a sensible neighbour after delete (next sibling, else previous, else parent)", () => {
    // delete a → next sibling b is selected
    expect(deleteNode(withRelations(), "a").selectId).toBe("b");
    // delete the last child → previous sibling is selected
    expect(deleteNode(withRelations(), "b").selectId).toBe("a");
    // delete an only-child → the parent is selected
    expect(deleteNode(withRelations(), "a1").selectId).toBe("a");
  });
});

describe("flow ops — content fill (hyperlink / image / rich text / meta toggles)", () => {
  it("setHyperlink sets a URL and clears it on empty", () => {
    const set = setHyperlink(base(), "a", "https://example.com").doc;
    expect(findNode(set, "a")?.hyperlink).toBe("https://example.com");
    expect(findNode(setHyperlink(set, "a", "").doc, "a")?.hyperlink).toBeUndefined();
    const d = base();
    expect(setHyperlink(d, "ghost", "x").doc).toBe(d); // unknown id → same doc, unchanged
  });

  it("setImage attaches an image to a node", () => {
    const img = { url: "data:image/png;base64,AA==", width: 100, height: 80 };
    expect(findNode(setImage(base(), "a", img).doc, "a")?.image).toEqual(img);
  });

  it("setTopicRich stores rich HTML + plain fallback, and clears rich when empty", () => {
    const set = setTopicRich(base(), "a", "<b>A</b>", "A").doc;
    expect(findNode(set, "a")?.topicRich).toBe("<b>A</b>");
    expect(findNode(set, "a")?.topic).toBe("A"); // plain fallback kept in sync
    // empty rich → topicRich dropped, plain still set
    const plainOnly = setTopicRich(base(), "a", "", "Just text").doc;
    expect(findNode(plainOnly, "a")?.topicRich).toBeUndefined();
    expect(findNode(plainOnly, "a")?.topic).toBe("Just text");
  });

  it("setTopicRich on the root keeps the doc title in sync with the plain text", () => {
    expect(setTopicRich(base(), "r", "<i>New</i>", "New").doc.title).toBe("New");
  });

  it("setLineJumps toggles the per-map flag (false clears it)", () => {
    expect(setLineJumps(base(), true).doc.meta?.lineJumps).toBe(true);
    expect(setLineJumps(setLineJumps(base(), true).doc, false).doc.meta?.lineJumps).toBeUndefined();
  });

  it("setBackgroundImage sets a data URL and clears it on empty", () => {
    const url = "data:image/png;base64,BB==";
    expect(setBackgroundImage(base(), url).doc.meta?.backgroundImage).toBe(url);
    expect(
      setBackgroundImage(setBackgroundImage(base(), url).doc, "").doc.meta?.backgroundImage,
    ).toBeUndefined();
  });
});

describe("flow ops — groupBranch + replaceTopics", () => {
  it("groupBranch appends a filled boundary around a node and its whole subtree", () => {
    const before = base().boundaries?.length ?? 0; // base() already carries one boundary
    const { doc, selectId } = groupBranch(base(), "a"); // a has a1, a2
    expect(doc.boundaries).toHaveLength(before + 1);
    expect(doc.boundaries?.at(-1)?.nodeIds.sort()).toEqual(["a", "a1", "a2"]);
    expect(selectId).toBe("a");
  });

  it("groupBranch is a no-op for an unknown id", () => {
    const d = base();
    expect(groupBranch(d, "ghost").doc).toBe(d);
  });

  it("replaceTopics replaces case-insensitively across the tree and counts changes", () => {
    // base topics: Root, A, A1, A2, B — replace every 'a' (case-insensitive).
    const { doc, count } = replaceTopics(base(), "a", "X");
    // "A"→"X", "A1"→"X1", "A2"→"X2"; "Root" has no 'a'; "B" none → 3 changed
    expect(count).toBe(3);
    expect(findNode(doc, "a")?.topic).toBe("X");
    expect(findNode(doc, "a1")?.topic).toBe("X1");
  });

  it("replaceTopics updates the doc title when the root topic changes", () => {
    const { doc, count } = replaceTopics(base(), "Root", "Trunk");
    expect(count).toBe(1);
    expect(doc.title).toBe("Trunk");
    expect(doc.root.topic).toBe("Trunk");
  });

  it("replaceTopics is a no-op (same doc, count 0) for an empty query or no match", () => {
    const d = base();
    expect(replaceTopics(d, "", "x")).toEqual({ doc: d, count: 0 });
    const noMatch = replaceTopics(d, "zzzz", "x");
    expect(noMatch.count).toBe(0);
    expect(noMatch.doc).toBe(d);
  });

  it("replaceTopics treats the query literally (regex metacharacters are escaped)", () => {
    const dotty = structuredClone(base());
    const a = findNode(dotty, "a");
    if (a) a.topic = "a.b";
    const { doc, count } = replaceTopics(dotty, "a.b", "Z");
    expect(count).toBe(1); // only the literal "a.b", not "a<any>b"
    expect(findNode(doc, "a")?.topic).toBe("Z");
  });
});
