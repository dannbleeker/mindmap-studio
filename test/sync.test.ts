import { describe, expect, it } from "vitest";
import { fromMindElixir, toMindElixir } from "../src/mindmap/sync";
import type { MapNode, MindMapDoc } from "../src/model/types";

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

  it("preserves canonical-only fields (note) by id across an edit", () => {
    // mind-elixir's data never carries the note; it must be restored from prev.
    const back = fromMindElixir(toMindElixir(doc.root), doc);
    expect(back.root.children.find((c) => c.id === "a")?.note).toBe("a note");
  });

  it("keeps links and meta from the previous doc", () => {
    const back = fromMindElixir(toMindElixir(doc.root), doc);
    expect(back.links).toEqual(doc.links);
    expect(back.id).toBe("d");
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
