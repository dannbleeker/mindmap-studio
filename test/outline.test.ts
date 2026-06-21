import { describe, expect, it } from "vitest";
import type { MapNode, MindMapDoc } from "../src/model/types";
import {
  backlinksFor,
  markerTagIndex,
  outlineDropWhere,
  outlineNumbers,
  outlineRows,
} from "../src/outline";

const root: MapNode = {
  id: "r",
  topic: "Root",
  children: [
    {
      id: "a",
      topic: "Alpha",
      note: "has a note",
      children: [{ id: "a1", topic: "Alpha One", children: [] }],
    },
    { id: "b", topic: "Beta", note: "   ", children: [] },
  ],
};

describe("outlineRows", () => {
  it("flattens depth-first with depth and note flags", () => {
    expect(outlineRows(root)).toEqual([
      { id: "r", topic: "Root", depth: 0, hasNote: false },
      { id: "a", topic: "Alpha", depth: 1, hasNote: true },
      { id: "a1", topic: "Alpha One", depth: 2, hasNote: false },
      { id: "b", topic: "Beta", depth: 1, hasNote: false }, // whitespace-only note ≠ note
    ]);
  });
});

const tagged: MapNode = {
  id: "r",
  topic: "Root",
  icons: ["🔴"],
  children: [
    {
      id: "a",
      topic: "Alpha",
      icons: ["⭐", "🔴"],
      tags: ["urgent"],
      children: [{ id: "a1", topic: "Alpha One", tags: ["urgent", "later"], children: [] }],
    },
    { id: "b", topic: "Beta", children: [] },
  ],
};

describe("markerTagIndex", () => {
  it("groups markers + tags by key, sorted, each with the carrying nodes (deep)", () => {
    const { markers, tags } = markerTagIndex(tagged);
    expect(markers).toEqual([
      { key: "⭐", hits: [{ id: "a", topic: "Alpha" }] },
      {
        key: "🔴",
        hits: [
          { id: "r", topic: "Root" },
          { id: "a", topic: "Alpha" },
        ],
      },
    ]);
    expect(tags).toEqual([
      {
        key: "later",
        hits: [{ id: "a1", topic: "Alpha One" }],
      },
      {
        key: "urgent",
        hits: [
          { id: "a", topic: "Alpha" },
          { id: "a1", topic: "Alpha One" },
        ],
      },
    ]);
  });

  it("includes floating topics and returns empty groups for a bare map", () => {
    const floating: MapNode[] = [{ id: "f", topic: "Legend", icons: ["📌"], children: [] }];
    const { markers } = markerTagIndex(tagged, floating);
    expect(markers.find((e) => e.key === "📌")).toEqual({
      key: "📌",
      hits: [{ id: "f", topic: "Legend" }],
    });
    expect(markerTagIndex({ id: "x", topic: "Bare", children: [] })).toEqual({
      markers: [],
      tags: [],
    });
  });
});

describe("outlineDropWhere", () => {
  it("maps the pointer's vertical position to before / child / after", () => {
    expect(outlineDropWhere(0)).toBe("before");
    expect(outlineDropWhere(0.1)).toBe("before");
    expect(outlineDropWhere(0.5)).toBe("child"); // the broad middle nests as a child
    expect(outlineDropWhere(0.9)).toBe("after");
    expect(outlineDropWhere(1)).toBe("after");
  });
});

describe("outlineNumbers", () => {
  it("numbers the tree hierarchically, leaving the root unnumbered", () => {
    const nums = outlineNumbers(tagged);
    expect(nums.has("r")).toBe(false); // the root (central topic) gets no number
    expect(nums.get("a")).toBe("1");
    expect(nums.get("a1")).toBe("1.1");
    expect(nums.get("b")).toBe("2");
  });

  it("returns an empty map for a childless root", () => {
    expect(outlineNumbers({ id: "x", topic: "Bare", children: [] }).size).toBe(0);
  });
});

const linkDoc = (): MindMapDoc => ({
  schemaVersion: 1,
  id: "d",
  title: "Root",
  root: {
    id: "r",
    topic: "Root",
    children: [
      { id: "a", topic: "Alpha", hyperlink: "#node=b", children: [] }, // → b (hyperlink)
      { id: "b", topic: "Beta", hyperlink: "#node=b", children: [] }, // self-link → excluded
      { id: "c", topic: "Gamma", hyperlink: "#map=other", children: [] }, // map link → ignored
      { id: "e", topic: "Epsilon", hyperlink: "https://x.test", children: [] }, // external → ignored
    ],
  },
  floatingTopics: [{ id: "f", topic: "Float", hyperlink: "#node=b", children: [] }], // → b (hyperlink)
  links: [
    { id: "l1", from: "c", to: "b", label: "blocks" }, // relationship pointing AT b
    { id: "l2", from: "b", to: "a" }, // outgoing from b → NOT a backlink to b
  ],
});

describe("backlinksFor", () => {
  it("collects #node= hyperlinks + relationship edges that point AT the target (tree + floating)", () => {
    // Sorted by topic, then kind: Alpha (hyperlink) < Float (hyperlink) < Gamma (relationship).
    expect(backlinksFor(linkDoc(), "b")).toEqual([
      { id: "a", topic: "Alpha", kind: "hyperlink" },
      { id: "f", topic: "Float", kind: "hyperlink" },
      { id: "c", topic: "Gamma", kind: "relationship", label: "blocks" },
    ]);
  });

  it("ignores #map= / external hyperlinks, self-links, and outgoing edges; [] when nothing points in", () => {
    expect(backlinksFor(linkDoc(), "e")).toEqual([]); // nothing points at Epsilon
    // Only the b→a edge points at Alpha (no label); the #map= / external links never count.
    expect(backlinksFor(linkDoc(), "a")).toEqual([
      { id: "b", topic: "Beta", kind: "relationship" },
    ]);
  });
});
