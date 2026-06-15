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

  it("freeform places nodes at their own pos, with a beside-parent fallback for pos-less nodes", () => {
    const fdoc: MindMapDoc = {
      schemaVersion: 1,
      id: "f",
      title: "F",
      meta: { freeform: true },
      root: {
        id: "r",
        topic: "R",
        pos: { x: 100, y: 100 },
        children: [
          { id: "a", topic: "A", pos: { x: 300, y: 140 }, children: [] },
          { id: "b", topic: "B", children: [] }, // no pos → fallback beside the root
        ],
      },
    };
    const p = project(fdoc);
    const pos = computeLayout(p.nodes, p.edges, size, "freeform");
    expect(pos.get("r")).toEqual({ x: 100, y: 100 }); // verbatim pos (top-left)
    expect(pos.get("a")).toEqual({ x: 300, y: 140 });
    // b lacks pos → beside its parent: root x(100) + width(100) + 48 = 248, same y
    expect(pos.get("b")).toEqual({ x: 248, y: 100 });
  });

  it("grid tiles the root's branches and keeps each branch's subtree below it", () => {
    // 4 branches → a 2×2 matrix (SWOT-shaped)
    const swot: MindMapDoc = {
      schemaVersion: 1,
      id: "g",
      title: "SWOT",
      root: {
        id: "r",
        topic: "SWOT",
        children: [
          { id: "s", topic: "Strengths", children: [{ id: "s1", topic: "S1", children: [] }] },
          { id: "w", topic: "Weaknesses", children: [] },
          { id: "o", topic: "Opportunities", children: [] },
          { id: "t", topic: "Threats", children: [] },
        ],
      },
    };
    const p = project(swot);
    const pos = computeLayout(p.nodes, p.edges, size, "grid");
    expect(allFinite(pos)).toBe(true);
    const xs = ["s", "w", "o", "t"].map((id) => pos.get(id)?.x ?? 0);
    const ys = ["s", "w", "o", "t"].map((id) => pos.get(id)?.y ?? 0);
    // two distinct columns and two distinct rows → a 2×2 grid
    expect(new Set(xs).size).toBe(2);
    expect(new Set(ys).size).toBe(2);
    // the root sits above every quadrant (title on top)
    const ry = pos.get("r")?.y ?? 0;
    for (const y of ys) expect(y).toBeGreaterThan(ry);
    // a branch's child stays within its cell (below the branch)
    expect(pos.get("s1")?.y ?? 0).toBeGreaterThan(pos.get("s")?.y ?? 0);
  });
});
