import { describe, expect, it } from "vitest";
import { fromMindElixir, toArrows, toMindElixir, toSummaries } from "../src/mindmap/sync";
import type { Boundary, MapNode, MindMapDoc } from "../src/model/types";

const n = (
  id: string,
  topic: string,
  extra: Partial<MapNode> = {},
  children: MapNode[] = [],
): MapNode => ({ id, topic, children, ...extra });

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "Root",
  root: n("r", "Root", {}, [
    n("a", "Alpha", { note: "a note", icons: ["ThumbsUp"], hyperlink: "https://x.test/" }, [
      n("a1", "Alpha One", { collapsed: true }),
    ]),
    n("b", "Beta", { tags: ["t1"] }),
  ]),
  links: [{ id: "l1", from: "a", to: "b" }],
};

// Editable fields that mind-elixir round-trips (notes are tested separately).
function shape(node: MapNode): unknown {
  return {
    id: node.id,
    topic: node.topic,
    icons: node.icons,
    tags: node.tags,
    hyperlink: node.hyperlink,
    collapsed: node.collapsed,
    children: node.children.map(shape),
  };
}

describe("mind-elixir sync", () => {
  it("round-trips topic, icons, tags, hyperlink, and collapsed", () => {
    const back = fromMindElixir(toMindElixir(doc.root), doc);
    expect(shape(back.root)).toEqual(shape(doc.root));
  });

  it("round-trips notes (mind-elixir 5 carries them)", () => {
    const back = fromMindElixir(toMindElixir(doc.root), doc);
    expect(back.root.children.find((c) => c.id === "a")?.note).toBe("a note");
  });

  it("captures a node-menu memo edit (me.note -> node.note)", () => {
    const me = toMindElixir(doc.root);
    me.note = "edited memo";
    expect(fromMindElixir(me, doc).root.note).toBe("edited memo");
  });

  it("preserves a note by id when mind-elixir omits it", () => {
    const me = toMindElixir(doc.root);
    const alpha = me.children?.find((c) => c.id === "a");
    if (alpha) alpha.note = undefined; // mind-elixir didn't carry it this time
    expect(fromMindElixir(me, doc).root.children.find((c) => c.id === "a")?.note).toBe("a note");
  });

  it("keeps links and meta from the previous doc", () => {
    const back = fromMindElixir(toMindElixir(doc.root), doc);
    expect(back.links).toEqual(doc.links);
    expect(back.id).toBe("d");
  });

  it("maps links to arrows and back", () => {
    const arrows = toArrows(doc.links);
    expect(arrows.map((a) => [a.from, a.to])).toEqual([["a", "b"]]);
    expect(fromMindElixir(toMindElixir(doc.root), doc, arrows).links).toEqual(doc.links);
  });

  it("a brand-new node (unknown id) carries no stale note", () => {
    const me = toMindElixir(doc.root);
    me.children?.push({ id: "fresh", topic: "Fresh" });
    const back = fromMindElixir(me, doc);
    const fresh = back.root.children.find((c) => c.id === "fresh");
    expect(fresh?.topic).toBe("Fresh");
    expect(fresh?.note).toBeUndefined();
  });

  it("tracks a renamed root as the new title", () => {
    const me = toMindElixir(doc.root);
    me.topic = "Renamed";
    expect(fromMindElixir(me, doc).title).toBe("Renamed");
  });
});

describe("toSummaries (boundaries -> mind-elixir summaries)", () => {
  const withBoundaries = (...boundaries: Boundary[]): MindMapDoc => ({
    ...doc,
    boundaries,
  });

  it("brackets a boundary's subtree root within its parent", () => {
    const summaries = toSummaries(
      withBoundaries({ id: "b1", nodeIds: ["a", "a1"], label: "Group" }),
    );
    expect(summaries).toEqual([{ id: "b1", label: "Group", parent: "r", start: 0, end: 0 }]);
  });

  it("uses the node's sibling index (second child -> index 1)", () => {
    const summaries = toSummaries(withBoundaries({ id: "b2", nodeIds: ["b"] }));
    expect(summaries).toEqual([{ id: "b2", label: "", parent: "r", start: 1, end: 1 }]);
  });

  it("skips a boundary on the map root (no parent to bracket)", () => {
    expect(toSummaries(withBoundaries({ id: "b3", nodeIds: ["r", "a", "b"] }))).toEqual([]);
  });

  it("returns [] when there are no boundaries", () => {
    expect(toSummaries(doc)).toEqual([]);
  });
});
