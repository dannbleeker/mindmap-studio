import { describe, expect, it } from "vitest";
import { fromMarkdown, toMarkdown } from "../src/io/markdown";
import type { MapNode, MindMapDoc } from "../src/model/types";

const node = (id: string, topic: string, children: MapNode[] = []): MapNode => ({
  id,
  topic,
  children,
});

const sample: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "Plan",
  root: node("r", "Plan", [
    node("a", "Strategy", [node("a1", "Grow EU"), node("a2", "Cut costs")]),
    node("b", "People"),
  ]),
};

// Compare topic-tree shape, ignoring ids (fromMarkdown mints fresh ones).
function shape(n: MapNode): { topic: string; children: unknown[] } {
  return { topic: n.topic, children: n.children.map(shape) };
}

describe("markdown io", () => {
  it("serialises to an H1 root + nested bullets", () => {
    expect(toMarkdown(sample)).toBe(
      ["# Plan", "- Strategy", "  - Grow EU", "  - Cut costs", "- People", ""].join("\n"),
    );
  });

  it("round-trips the topic tree", () => {
    expect(shape(fromMarkdown(toMarkdown(sample)).root)).toEqual(shape(sample.root));
  });

  it("reads the H1 as the root title", () => {
    const doc = fromMarkdown("# My Map\n- one\n- two\n");
    expect(doc.title).toBe("My Map");
    expect(doc.root.children.map((c) => c.topic)).toEqual(["one", "two"]);
  });

  it("nests by indentation and tolerates tabs and *", () => {
    const doc = fromMarkdown("# Root\n* a\n\ta1\n* b");
    // "\ta1" is not a bullet line — ignored; a and b are top-level.
    expect(doc.root.children.map((c) => c.topic)).toEqual(["a", "b"]);
  });

  it("defaults the title when no heading is present", () => {
    const doc = fromMarkdown("- lonely");
    expect(doc.title).toBe("Untitled map");
    expect(doc.root.children.map((c) => c.topic)).toEqual(["lonely"]);
  });
});
