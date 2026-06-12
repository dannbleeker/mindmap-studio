import { describe, expect, it } from "vitest";
import type { MapNode } from "../src/model/types";
import { outlineRows } from "../src/outline";

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
