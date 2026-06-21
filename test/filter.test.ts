import { describe, expect, it } from "vitest";
import {
  type FilterCriteria,
  describeCriteria,
  filterResult,
  filterToDoc,
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
  it("summarises text, markers, tags, and due (and 'everything' when empty)", () => {
    expect(describeCriteria(crit({ text: "budget", markers: ["⭐"], tags: ["q3"] }))).toBe(
      '"budget" · ⭐ · #q3',
    );
    expect(describeCriteria(crit({ due: "overdue" }))).toBe("📅 overdue");
    expect(describeCriteria(crit({ priority: 1 }))).toBe("High priority");
    expect(describeCriteria(crit({}))).toBe("everything");
  });
});

describe("filterResult — due date", () => {
  const TODAY = "2026-06-14";
  const dueDoc: MindMapDoc = {
    schemaVersion: 1,
    id: "d",
    title: "T",
    root: {
      id: "r",
      topic: "Root",
      children: [
        { id: "over", topic: "Overdue", task: { due: "2026-06-10", progress: 0.5 }, children: [] },
        { id: "done", topic: "Done late", task: { due: "2026-06-10", progress: 1 }, children: [] },
        { id: "soon", topic: "Soon", task: { due: "2026-06-18" }, children: [] },
        { id: "far", topic: "Far", task: { due: "2026-09-01" }, children: [] },
        { id: "none", topic: "No date", children: [] },
      ],
    },
  };
  const lit = (mode: "dated" | "overdue" | "soon") =>
    [...filterResult(dueDoc, crit({ due: mode }), TODAY).lit].sort();

  it("'dated' matches every node carrying a due date", () => {
    expect(lit("dated")).toEqual(["done", "far", "over", "r", "soon"]); // 4 dated + root ancestor
  });
  it("'overdue' matches past-due, unfinished tasks only (a finished one is excluded)", () => {
    expect(lit("overdue")).toEqual(["over", "r"]);
  });
  it("'soon' matches tasks due within the next week (not the overdue or far ones)", () => {
    expect(lit("soon")).toEqual(["r", "soon"]);
  });
});

describe("filterResult — priority", () => {
  const prioDoc: MindMapDoc = {
    schemaVersion: 1,
    id: "d",
    title: "T",
    root: {
      id: "r",
      topic: "Root",
      children: [
        { id: "hi", topic: "Hi", task: { priority: 1 }, children: [] },
        { id: "lo", topic: "Lo", task: { priority: 3 }, children: [] },
        { id: "none", topic: "None", children: [] },
      ],
    },
  };
  it("matches only nodes at the chosen priority (plus their ancestors)", () => {
    expect([...filterResult(prioDoc, crit({ priority: 1 })).lit].sort()).toEqual(["hi", "r"]);
    expect([...filterResult(prioDoc, crit({ priority: 3 })).lit].sort()).toEqual(["lo", "r"]);
    expect(filterResult(prioDoc, crit({ priority: 2 })).matches).toBe(0);
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

describe("filterToDoc", () => {
  it("prunes the map to the lit set, keeping ancestors and dropping dangling refs", () => {
    // Lit = the "q3" matches (c, a) + their ancestors (r, m, e).
    const { lit } = filterResult(doc, crit({ tags: ["q3"] }));
    const out = filterToDoc(doc, lit, "new-id");
    expect(out).not.toBeNull();
    if (!out) return;
    expect(out.id).toBe("new-id");
    expect(out.title).toBe("Plan (filtered)");
    expect(out.root.topic).toBe("Plan (filtered)"); // the central topic follows the new title
    // Marketing keeps Campaign (c, matched) but drops Budget (bg, unmatched).
    const marketing = out.root.children.find((n) => n.id === "m");
    expect(marketing?.children.map((n) => n.id)).toEqual(["c"]);
    // Engineering keeps API (a).
    const eng = out.root.children.find((n) => n.id === "e");
    expect(eng?.children.map((n) => n.id)).toEqual(["a"]);
    // The unmatched floating "Legend" is dropped.
    expect(out.floatingTopics ?? []).toEqual([]);
  });

  it("returns null when nothing matches (empty lit set)", () => {
    expect(filterToDoc(doc, new Set(), "x")).toBeNull();
  });
});
