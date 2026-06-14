import { describe, expect, it } from "vitest";
import {
  type FilterCriteria,
  describeCriteria,
  filterResult,
  focusSet,
  isFilterActive,
} from "../src/filter";
import type { MindMapDoc } from "../src/model/types";

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "Plan",
  root: {
    id: "r",
    topic: "Root",
    children: [
      {
        id: "m",
        topic: "Marketing",
        icons: ["⭐"],
        children: [
          { id: "c", topic: "Campaign", tags: ["q3"], children: [] },
          { id: "bg", topic: "Budget", note: "spend plan", children: [] },
        ],
      },
      {
        id: "e",
        topic: "Engineering",
        children: [{ id: "a", topic: "API", icons: ["⭐"], tags: ["q3"], children: [] }],
      },
    ],
  },
  floatingTopics: [{ id: "f", topic: "Legend", icons: ["⭐"], children: [] }],
};

const crit = (over: Partial<FilterCriteria>): FilterCriteria => ({
  text: "",
  markers: [],
  tags: [],
  ...over,
});

describe("isFilterActive", () => {
  it("is false only when nothing is set", () => {
    expect(isFilterActive(crit({}))).toBe(false);
    expect(isFilterActive(crit({ text: "  " }))).toBe(false); // whitespace ≠ active
    expect(isFilterActive(crit({ text: "x" }))).toBe(true);
    expect(isFilterActive(crit({ markers: ["⭐"] }))).toBe(true);
    expect(isFilterActive(crit({ tags: ["q3"] }))).toBe(true);
  });
});

describe("filterResult", () => {
  it("matches text in topic or note and lights the path to each match", () => {
    const r = filterResult(doc, crit({ text: "budget" }));
    expect(r.matches).toBe(1);
    expect([...r.lit].sort()).toEqual(["bg", "m", "r"]); // match + its ancestors
    // note text is searched too
    expect(filterResult(doc, crit({ text: "spend" })).matches).toBe(1);
  });

  it("matches a marker across the whole map, including floating topics", () => {
    const r = filterResult(doc, crit({ markers: ["⭐"] }));
    expect(r.matches).toBe(3); // m, a, f
    expect([...r.lit].sort()).toEqual(["a", "e", "f", "m", "r"]);
  });

  it("matches a tag", () => {
    const r = filterResult(doc, crit({ tags: ["q3"] }));
    expect(r.matches).toBe(2); // c, a
    expect([...r.lit].sort()).toEqual(["a", "c", "e", "m", "r"]);
  });

  it("ANDs across categories (marker AND tag → only nodes with both)", () => {
    const r = filterResult(doc, crit({ markers: ["⭐"], tags: ["q3"] }));
    expect(r.matches).toBe(1); // only API has both
    expect([...r.lit].sort()).toEqual(["a", "e", "r"]);
  });

  it("returns an empty lit set when nothing matches", () => {
    const r = filterResult(doc, crit({ text: "nonexistent" }));
    expect(r.matches).toBe(0);
    expect(r.lit.size).toBe(0);
  });
});

describe("describeCriteria", () => {
  it("summarises text, markers, and tags (and 'everything' when empty)", () => {
    expect(describeCriteria(crit({ text: "budget", markers: ["⭐"], tags: ["q3"] }))).toBe(
      '"budget" · ⭐ · #q3',
    );
    expect(describeCriteria(crit({}))).toBe("everything");
  });
});

describe("focusSet", () => {
  it("lights a branch's subtree plus its ancestors", () => {
    expect([...focusSet(doc, "m")].sort()).toEqual(["bg", "c", "m", "r"]); // Marketing + kids + root
    expect([...focusSet(doc, "a")].sort()).toEqual(["a", "e", "r"]); // API + Engineering + root
  });

  it("lights the whole tree when focusing the root, and a floating node alone", () => {
    expect([...focusSet(doc, "r")].sort()).toEqual(["a", "bg", "c", "e", "m", "r"]); // not floating
    expect([...focusSet(doc, "f")]).toEqual(["f"]); // floating topic has no ancestors
  });

  it("returns an empty set for an unknown id", () => {
    expect(focusSet(doc, "nope").size).toBe(0);
  });
});
