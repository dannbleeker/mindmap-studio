import { describe, expect, it } from "vitest";
import type { ConditionalRule, MapNode } from "../src/model/types";
import { conditionalStyle, describeRule, matchesRule } from "../src/rules";

const node = (over: Partial<MapNode> = {}): MapNode => ({
  id: "n",
  topic: "N",
  children: [],
  ...over,
});

const rule = (over: Partial<ConditionalRule>): ConditionalRule => ({
  id: "r",
  kind: "tag",
  value: "risk",
  style: { border: "2px solid #e23b3b" },
  ...over,
});

describe("matchesRule", () => {
  it("matches by tag / marker", () => {
    expect(matchesRule(node({ tags: ["risk"] }), rule({ kind: "tag", value: "risk" }))).toBe(true);
    expect(matchesRule(node({ tags: ["ok"] }), rule({ kind: "tag", value: "risk" }))).toBe(false);
    expect(matchesRule(node({ icons: ["❗"] }), rule({ kind: "marker", value: "❗" }))).toBe(true);
    expect(matchesRule(node({ icons: ["⭐"] }), rule({ kind: "marker", value: "❗" }))).toBe(false);
  });

  it("never matches a tag/marker rule with an empty value", () => {
    expect(matchesRule(node({ tags: ["risk"] }), rule({ kind: "tag", value: "" }))).toBe(false);
    expect(matchesRule(node({ icons: ["❗"] }), rule({ kind: "marker", value: undefined }))).toBe(
      false,
    );
  });

  it("matches 'completed' against effective progress (1 = done)", () => {
    const r = rule({ kind: "completed", value: undefined });
    expect(matchesRule(node(), r, 1)).toBe(true);
    expect(matchesRule(node(), r, 0.5)).toBe(false);
    expect(matchesRule(node(), r, undefined)).toBe(false);
  });

  it("matches 'overdue' (past due + unfinished) against the given today", () => {
    const r = rule({ kind: "overdue", value: undefined });
    const overdue = node({ task: { due: "2026-01-01", progress: 0.5 } });
    expect(matchesRule(overdue, r, 0.5, "2026-06-21")).toBe(true);
    // finished → not overdue; future due → not overdue
    expect(
      matchesRule(node({ task: { due: "2026-01-01", progress: 1 } }), r, 1, "2026-06-21"),
    ).toBe(false);
    expect(matchesRule(node({ task: { due: "2026-12-31" } }), r, 0, "2026-06-21")).toBe(false);
  });

  it("matches 'priority' at or above a threshold (1=High; priority ≤ value)", () => {
    expect(
      matchesRule(node({ task: { priority: 1 } }), rule({ kind: "priority", value: "2" })),
    ).toBe(true);
    expect(
      matchesRule(node({ task: { priority: 3 } }), rule({ kind: "priority", value: "2" })),
    ).toBe(false);
    // no priority, or non-numeric threshold → no match
    expect(matchesRule(node(), rule({ kind: "priority", value: "2" }))).toBe(false);
    expect(
      matchesRule(node({ task: { priority: 1 } }), rule({ kind: "priority", value: "" })),
    ).toBe(false);
  });

  it("matches 'textContains' (case-insensitive) and 'hasAttachment'", () => {
    expect(
      matchesRule(
        node({ topic: "Quarterly Budget" }),
        rule({ kind: "textContains", value: "budget" }),
      ),
    ).toBe(true);
    expect(
      matchesRule(node({ topic: "Roadmap" }), rule({ kind: "textContains", value: "budget" })),
    ).toBe(false);
    const withFile = node({
      attachments: [{ name: "a.pdf", dataUrl: "data:,", size: 1 }],
    });
    expect(matchesRule(withFile, rule({ kind: "hasAttachment", value: undefined }))).toBe(true);
    expect(matchesRule(node(), rule({ kind: "hasAttachment", value: undefined }))).toBe(false);
  });
});

describe("conditionalStyle", () => {
  it("merges every matching rule, later rules winning per-property", () => {
    const rules: ConditionalRule[] = [
      rule({
        id: "a",
        kind: "tag",
        value: "risk",
        style: { border: "2px solid #e23b3b", background: "#fee" },
      }),
      rule({ id: "b", kind: "completed", value: undefined, style: { background: "#efe" } }),
    ];
    // tag-only (progress 0.5): just the first rule.
    expect(conditionalStyle(node({ tags: ["risk"] }), rules, 0.5)).toEqual({
      border: "2px solid #e23b3b",
      background: "#fee",
    });
    // both match (progress 1): the completed rule's background wins, border kept.
    expect(conditionalStyle(node({ tags: ["risk"] }), rules, 1)).toEqual({
      border: "2px solid #e23b3b",
      background: "#efe",
    });
  });

  it("returns undefined when nothing matches", () => {
    expect(conditionalStyle(node(), [rule({})], 0)).toBeUndefined();
  });
});

describe("describeRule", () => {
  it("labels each condition", () => {
    expect(describeRule(rule({ kind: "tag", value: "risk" }))).toBe("tag risk");
    expect(describeRule(rule({ kind: "marker", value: "❗" }))).toBe("marker ❗");
    expect(describeRule(rule({ kind: "completed", value: undefined }))).toBe("completed (100%)");
    expect(describeRule(rule({ kind: "overdue", value: undefined }))).toBe("overdue");
    expect(describeRule(rule({ kind: "hasAttachment", value: undefined }))).toBe("has attachment");
    expect(describeRule(rule({ kind: "priority", value: "2" }))).toBe("priority ≤ 2 (1=High)");
    expect(describeRule(rule({ kind: "textContains", value: "x" }))).toBe('text contains "x"');
  });
});
