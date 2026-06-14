import { describe, expect, it } from "vitest";
import { computeLayout } from "../src/mindmap/flow/layout";
import { project } from "../src/mindmap/flow/project";
import type { MindMapDoc } from "../src/model/types";

const size = () => ({ width: 100, height: 40 });

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "R",
  root: {
    id: "r",
    topic: "R",
    children: [
      { id: "a", topic: "A", side: "right", children: [{ id: "a1", topic: "A1", children: [] }] },
      { id: "b", topic: "B", side: "left", children: [] },
      { id: "c", topic: "C", side: "right", children: [] },
    ],
  },
};

describe("flow layout (two-sided tidy tree)", () => {
  const { nodes, edges } = project(doc);
  const pos = computeLayout(nodes, edges, size);

  it("positions every node with finite coordinates", () => {
    for (const n of nodes) {
      const p = pos.get(n.id);
      expect(p).toBeDefined();
      expect(Number.isFinite(p?.x)).toBe(true);
      expect(Number.isFinite(p?.y)).toBe(true);
    }
  });

  it("splits right children to the right of the root and left children to the left", () => {
    const r = pos.get("r");
    if (!r) throw new Error("no root position");
    expect(pos.get("a")?.x ?? 0).toBeGreaterThan(r.x);
    expect(pos.get("c")?.x ?? 0).toBeGreaterThan(r.x);
    expect(pos.get("b")?.x ?? 0).toBeLessThan(r.x);
  });

  it("places a grandchild further out than its parent", () => {
    expect(pos.get("a1")?.x ?? 0).toBeGreaterThan(pos.get("a")?.x ?? 0);
  });

  it("separates two same-side siblings vertically", () => {
    expect(pos.get("a")?.y).not.toBe(pos.get("c")?.y);
  });
});
