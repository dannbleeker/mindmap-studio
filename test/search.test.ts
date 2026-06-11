import { describe, expect, it } from "vitest";
import type { MapNode } from "../src/model/types";
import { findMatches } from "../src/search";

const root: MapNode = {
  id: "r",
  topic: "Plan",
  children: [
    {
      id: "a",
      topic: "Marketing",
      children: [{ id: "a1", topic: "market research", children: [] }],
    },
    { id: "b", topic: "Sales", children: [] },
  ],
};

describe("findMatches", () => {
  it("matches topics case-insensitively in depth-first order", () => {
    expect(findMatches(root, "market")).toEqual(["a", "a1"]);
  });

  it("returns an empty list for a blank query", () => {
    expect(findMatches(root, "   ")).toEqual([]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(findMatches(root, "xyz")).toEqual([]);
  });
});
