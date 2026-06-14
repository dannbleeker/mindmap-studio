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

describe("flow layout (alternate kinds)", () => {
  const { nodes, edges } = project(doc);
  const allFinite = (m: ReturnType<typeof computeLayout>) =>
    [...m.values()].every((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  it("org-down places children below the root and deeper rows lower", () => {
    const pos = computeLayout(nodes, edges, size, "org-down");
    expect(allFinite(pos)).toBe(true);
    const ry = pos.get("r")?.y ?? 0;
    expect(pos.get("a")?.y ?? 0).toBeGreaterThan(ry);
    expect(pos.get("a1")?.y ?? 0).toBeGreaterThan(pos.get("a")?.y ?? 0);
  });

  it("org-up mirrors org-down (children above the root)", () => {
    const pos = computeLayout(nodes, edges, size, "org-up");
    expect(allFinite(pos)).toBe(true);
    expect(pos.get("a")?.y ?? 0).toBeLessThan(pos.get("r")?.y ?? 0);
  });

  it("radial scatters depth-1 nodes off the centre at a similar radius", () => {
    const pos = computeLayout(nodes, edges, size, "radial");
    expect(allFinite(pos)).toBe(true);
    const r = pos.get("r");
    if (!r) throw new Error("no root");
    const dist = (id: string) => {
      const p = pos.get(id);
      if (!p) return 0;
      return Math.hypot(p.x - r.x, p.y - r.y);
    };
    expect(dist("a")).toBeGreaterThan(50);
    // a and c are both depth-1 → roughly the same ring
    expect(Math.abs(dist("a") - dist("c"))).toBeLessThan(dist("a"));
  });

  it("timeline and fishbone produce finite positions for every node", () => {
    expect(allFinite(computeLayout(nodes, edges, size, "timeline"))).toBe(true);
    expect(allFinite(computeLayout(nodes, edges, size, "fishbone"))).toBe(true);
  });
});
