import { describe, expect, it } from "vitest";
import type { MapNode } from "../src/model/types";
import { markerTagIndex, outlineRows } from "../src/outline";

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
