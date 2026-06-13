import { describe, expect, it } from "vitest";
import {
  FLOATING_NODE_ID,
  fromMindElixir,
  toArrows,
  toMindElixir,
  toMindElixirRoot,
  toSummaries,
} from "../src/mindmap/sync";
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

  it("drops a dangerous-scheme hyperlink in both directions (XSS guard)", () => {
    // A javascript: link — carried in by an import, or typed into the node-menu
    // — must never render as a clickable anchor on the canvas, nor be captured
    // back into the model. (The export sanitiser is the backstop; this is the
    // source-side defense.)
    expect(toMindElixir(n("h", "Hostile", { hyperlink: "javascript:alert(1)" })).hyperLink).toBe(
      undefined,
    );
    // mind-elixir -> model: a node-menu-typed dangerous link is stripped on capture.
    const me = toMindElixir(n("h", "Hostile"));
    me.hyperLink = "javascript:alert(1)";
    expect(fromMindElixir(me, doc).root.hyperlink).toBe(undefined);
    // a safe link is untouched.
    expect(toMindElixir(n("s", "Safe", { hyperlink: "https://ok.test/" })).hyperLink).toBe(
      "https://ok.test/",
    );
  });

  it("captures a node-menu memo edit (me.note -> node.note)", () => {
    const me = toMindElixir(doc.root);
    me.note = "edited memo";
    expect(fromMindElixir(me, doc).root.note).toBe("edited memo");
  });

  it("preserves a node's image when mind-elixir reports none", () => {
    // mind-elixir 5 doesn't always carry the image back on capture; the prior
    // model value must survive rather than be dropped.
    const prevDoc: MindMapDoc = {
      ...doc,
      root: n("r", "Root", { image: { url: "pic.png", width: 12, height: 8 } }),
    };
    const me = toMindElixir(n("r", "Root")); // no image on the mind-elixir side
    expect(fromMindElixir(me, prevDoc).root.image).toEqual({
      url: "pic.png",
      width: 12,
      height: 8,
    });
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

  it("round-trips a node image", () => {
    const withImg: MindMapDoc = {
      ...doc,
      root: {
        id: "r",
        topic: "Root",
        children: [
          {
            id: "p",
            topic: "Pic",
            image: { url: "data:abc", width: 100, height: 50 },
            children: [],
          },
        ],
      },
    };
    const back = fromMindElixir(toMindElixir(withImg.root), withImg);
    expect(back.root.children[0].image).toEqual({ url: "data:abc", width: 100, height: 50 });
  });

  it("round-trips per-topic style (shape/border/fill)", () => {
    const styled: MindMapDoc = {
      ...doc,
      root: {
        id: "r",
        topic: "Root",
        children: [
          {
            id: "s",
            topic: "Styled",
            style: { borderRadius: "4px", border: "2px solid #e23", background: "#eef" },
            children: [],
          },
        ],
      },
    };
    const back = fromMindElixir(toMindElixir(styled.root), styled);
    expect(back.root.children[0].style).toEqual({
      borderRadius: "4px",
      border: "2px solid #e23",
      background: "#eef",
    });
  });

  it("drops cleared (empty-string) style values on capture", () => {
    const me = toMindElixir(doc.root);
    const a = me.children?.find((c) => c.id === "a");
    // a style key cleared via the Style bar arrives as "" — must not enter the model
    if (a) a.style = { border: "", background: "#eef" };
    const back = fromMindElixir(me, doc);
    expect(back.root.children.find((c) => c.id === "a")?.style).toEqual({ background: "#eef" });
  });

  it("captures an image added on the canvas (me.image -> node.image)", () => {
    const me = toMindElixir(doc.root);
    const a = me.children?.find((c) => c.id === "a");
    if (a) a.image = { url: "data:xyz", width: 80, height: 40 };
    const back = fromMindElixir(me, doc);
    expect(back.root.children.find((c) => c.id === "a")?.image).toEqual({
      url: "data:xyz",
      width: 80,
      height: 40,
    });
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

  it("captures a canvas summary back into a boundary (subtree under the range)", () => {
    const back = fromMindElixir(toMindElixir(doc.root), doc, undefined, [
      { id: "bd1", label: "Group", parent: "r", start: 0, end: 0 },
    ]);
    expect(back.boundaries).toEqual([{ id: "bd1", nodeIds: ["a", "a1"], label: "Group" }]);
  });

  it("round-trips a boundary through summaries and back", () => {
    const withB: MindMapDoc = { ...doc, boundaries: [{ id: "bd1", nodeIds: ["a", "a1"] }] };
    const back = fromMindElixir(toMindElixir(withB.root), withB, undefined, toSummaries(withB));
    expect(back.boundaries).toEqual([{ id: "bd1", nodeIds: ["a", "a1"] }]);
  });

  it("clears boundaries when the canvas reports none", () => {
    const withB: MindMapDoc = { ...doc, boundaries: [{ id: "bd1", nodeIds: ["a", "a1"] }] };
    expect(
      fromMindElixir(toMindElixir(withB.root), withB, undefined, []).boundaries,
    ).toBeUndefined();
  });
});

describe("toMindElixirRoot (floating topics)", () => {
  const withFloat: MindMapDoc = {
    ...doc,
    floatingTopics: [{ id: "f1", topic: "Legend", children: [] }],
  };

  it("appends imported floating topics as one labelled branch", () => {
    const meRoot = toMindElixirRoot(withFloat);
    const branch = meRoot.children?.find((c) => c.id === FLOATING_NODE_ID);
    expect(branch?.children?.map((c) => c.topic)).toEqual(["Legend"]);
    // the real branches are untouched and come first
    expect(meRoot.children?.slice(0, 2).map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("adds no branch when there are no floating topics", () => {
    const meRoot = toMindElixirRoot(doc);
    expect(meRoot.children?.some((c) => c.id === FLOATING_NODE_ID)).toBe(false);
  });

  it("strips the display-only branch back out on capture (never enters the model)", () => {
    const back = fromMindElixir(toMindElixirRoot(withFloat), withFloat);
    expect(back.root.children.some((c) => c.id === FLOATING_NODE_ID)).toBe(false);
    expect(back.root.children.map((c) => c.id)).toEqual(["a", "b"]);
    // floatingTopics is preserved from the prior doc, not corrupted by the branch
    expect(back.floatingTopics).toEqual(withFloat.floatingTopics);
  });
});
