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

  it("matches 'completed' against effective progress (1 = done)", () => {
    const r = rule({ kind: "completed", value: undefined });
    expect(matchesRule(node(), r, 1)).toBe(true);
    expect(matchesRule(node(), r, 0.5)).toBe(false);
    expect(matchesRule(node(), r, undefined)).toBe(false);
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
  });
});
