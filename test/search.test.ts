import { describe, expect, it } from "vitest";
import type { MapNode } from "../src/model/types";
import { findMatches, replaceInTopic } from "../src/search";

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
