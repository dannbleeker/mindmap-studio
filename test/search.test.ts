import { describe, expect, it } from "vitest";
import type { MapNode, MindMapDoc } from "../src/model/types";
import {
  findDocMatches,
  findMatches,
  fuzzyHit,
  replaceInTopic,
  searchLibrary,
} from "../src/search";

const root: MapNode = {
  id: "r",
  topic: "Plan",
  children: [
    {
      id: "a",
      topic: "Marketing",
      children: [{ id: "a1", topic: "market research", children: [] }],
    },
    { id: "b", topic: "Sales", note: "quota and pipeline notes", children: [] },
  ],
};

describe("findMatches", () => {
  it("matches topics case-insensitively in depth-first order", () => {
    expect(findMatches(root, "market")).toEqual(["a", "a1"]);
  });

  it("matches a node by its note when the topic doesn't match", () => {
    expect(findMatches(root, "pipeline")).toEqual(["b"]);
  });

  it("returns an empty list for a blank query", () => {
    expect(findMatches(root, "   ")).toEqual([]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(findMatches(root, "xyz")).toEqual([]);
  });
});

describe("findDocMatches", () => {
  it("searches the central tree and floating topics together", () => {
    const doc: MindMapDoc = {
      schemaVersion: 1,
      id: "d",
      title: "T",
      root,
      floatingTopics: [{ id: "f1", topic: "market legend", children: [] }],
    };
    expect(findDocMatches(doc, "market")).toEqual(["a", "a1", "f1"]);
  });

  it("works with no floating topics", () => {
    expect(findDocMatches({ schemaVersion: 1, id: "d", title: "T", root }, "pipeline")).toEqual([
      "b",
    ]);
  });
});

describe("searchLibrary", () => {
  const docs: MindMapDoc[] = [
    { schemaVersion: 1, id: "m1", title: "Q3 Plan", root },
    {
      schemaVersion: 1,
      id: "m2",
      title: "Roadmap",
      root: {
        id: "r2",
        topic: "Roadmap",
        children: [{ id: "x", topic: "Marketing push", children: [] }],
      },
      floatingTopics: [{ id: "f1", topic: "Legend: market codes", children: [] }],
    },
  ];

  it("returns hits across every map with map + node context", () => {
    const hits = searchLibrary(docs, "market");
    expect(hits.map((h) => [h.mapId, h.nodeId])).toEqual([
      ["m1", "a"],
      ["m1", "a1"],
      ["m2", "x"],
      ["m2", "f1"],
    ]);
    expect(hits[0].mapTitle).toBe("Q3 Plan");
    expect(hits[3].topic).toBe("Legend: market codes");
  });

  it("searches floating topics, not just the central tree", () => {
    const hits = searchLibrary(docs, "Legend");
    expect(hits).toEqual([
      { mapId: "m2", mapTitle: "Roadmap", nodeId: "f1", topic: "Legend: market codes" },
    ]);
  });

  it("matches notes too, case-insensitively", () => {
    expect(searchLibrary(docs, "PIPELINE").map((h) => h.nodeId)).toEqual(["b"]);
  });

  it("returns an empty list for a blank query", () => {
    expect(searchLibrary(docs, "  ")).toEqual([]);
  });
});

describe("replaceInTopic", () => {
  it("replaces every occurrence, case-insensitively", () => {
    expect(replaceInTopic("Marketing market", "market", "biz")).toBe("bizing biz");
  });

  it("returns the topic unchanged for a blank query", () => {
    expect(replaceInTopic("Plan", "   ", "x")).toBe("Plan");
  });

  it("treats the query as a literal (regex chars escaped)", () => {
    expect(replaceInTopic("a.b a.b", "a.b", "Z")).toBe("Z Z");
    expect(replaceInTopic("axb", "a.b", "Z")).toBe("axb");
  });
});

describe("fuzzyHit", () => {
  it("accepts an exact substring or a near-miss word, rejects unrelated", () => {
    expect(fuzzyHit("Marketing plan", "marketing")).toBe(true); // exact
    expect(fuzzyHit("Marketing plan", "markteing")).toBe(true); // transposition (dist 2)
    expect(fuzzyHit("Marketing plan", "finance")).toBe(false);
  });
});

describe("findDocMatches — fuzzy fallback", () => {
  const doc: MindMapDoc = { schemaVersion: 1, id: "d", title: "T", root };

  it("falls back to a typo-tolerant pass only when there's no exact hit", () => {
    expect(findDocMatches(doc, "markteing")).toEqual(["a"]); // typo of "Marketing", no exact hit
    expect(findDocMatches(doc, "market")).toEqual(["a", "a1"]); // exact hits short-circuit fuzzy
  });

  it("stays strict for very short queries (no fuzzy below 4 chars)", () => {
    expect(findDocMatches(doc, "mkt")).toEqual([]);
  });
});
