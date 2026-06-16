import { describe, expect, it } from "vitest";
import { taperedRibbonPath } from "../src/mindmap/flow/BranchEdge";
import { type Box, floatingPoints } from "../src/mindmap/flow/floating";

// The pure connector geometry the canvas + SVG exporter share. taperedRibbonPath draws a filled
// branch ribbon (thick at the parent, thinner at the child); floatingPoints finds where an edge
// meets two node rects (border-to-border, along the centre-to-centre ray) so edges route in any
// layout. Both are pure, so they're asserted directly here (no React, no canvas).

/** Count the vertices a path command stream visits (M + each L/C endpoint). */
function commandCount(d: string, letter: string): number {
  return (d.match(new RegExp(letter, "g")) ?? []).length;
}

describe("taperedRibbonPath", () => {
  it("is a closed filled shape: M … two C curves … Z (the two offset edges)", () => {
    const d = taperedRibbonPath(0, 0, 100, 0, 1);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.trim().endsWith("Z")).toBe(true);
    expect(commandCount(d, "C")).toBe(2); // one curve out along each side of the ribbon
    expect(commandCount(d, "L")).toBe(1); // the cap across the child end
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it("tapers: the parent end is wider than the child end", () => {
    // halfThickness shrinks with depth, so the start half-width (depth-1) > end half-width (depth).
    // A horizontal ribbon offsets purely in y, so the first M y is the parent half-width.
    const d = taperedRibbonPath(0, 0, 100, 0, 1);
    const firstPoint = d.match(/^M (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/);
    const startHalf = Math.abs(Number(firstPoint?.[2]));
    // depth 1: start uses depth 0 → max(7,2.5)/2 = 3.5; end uses depth 1 → max(5.9,2.5)/2 = 2.95
    expect(startHalf).toBeCloseTo(3.5, 5);
  });

  it("clamps the ribbon half-width to a floor at deep levels (never collapses to a line)", () => {
    // Very deep: halfThickness floors at 2.5/2 = 1.25 on both ends, so the ribbon keeps a width.
    const d = taperedRibbonPath(0, 0, 100, 0, 50);
    const firstPoint = d.match(/^M (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/);
    expect(Math.abs(Number(firstPoint?.[2]))).toBeCloseTo(1.25, 5);
  });

  it("curves along the dominant axis: horizontal vs vertical produce different control points", () => {
    const horizontal = taperedRibbonPath(0, 0, 100, 10, 1); // |dx| >= |dy|
    const vertical = taperedRibbonPath(0, 0, 10, 100, 1); // |dy| > |dx|
    expect(horizontal).not.toBe(vertical);
    expect(horizontal).not.toMatch(/NaN|Infinity/);
    expect(vertical).not.toMatch(/NaN|Infinity/);
  });

  it("zero-length (parent == child) is degenerate but finite (len guard avoids /0)", () => {
    const d = taperedRibbonPath(5, 5, 5, 5, 1);
    expect(d).not.toMatch(/NaN|Infinity/);
    expect(commandCount(d, "C")).toBe(2);
  });
});

describe("floatingPoints", () => {
  const box = (cx: number, cy: number, w: number, h: number): Box => ({ cx, cy, w, h });

  it("connects two horizontally-separated boxes on their facing edges", () => {
    // Source centred at x=0, target at x=100, both 40 wide → points land on the inner edges.
    const s = box(0, 0, 40, 20);
    const t = box(100, 0, 40, 20);
    const { sx, sy, tx, ty } = floatingPoints(s, t);
    expect(sx).toBeCloseTo(20, 5); // source right edge (cx + w/2)
    expect(tx).toBeCloseTo(80, 5); // target left edge (cx - w/2)
    expect(sy).toBeCloseTo(0, 5);
    expect(ty).toBeCloseTo(0, 5);
  });

  it("connects vertically-stacked boxes on their top/bottom edges", () => {
    const s = box(0, 0, 40, 20);
    const t = box(0, 100, 40, 20);
    const { sx, sy, tx, ty } = floatingPoints(s, t);
    expect(sy).toBeCloseTo(10, 5); // source bottom edge (cy + h/2)
    expect(ty).toBeCloseTo(90, 5); // target top edge (cy - h/2)
    expect(sx).toBeCloseTo(0, 5);
    expect(tx).toBeCloseTo(0, 5);
  });

  it("exits through the correct edge on a diagonal (clamped by the nearer axis)", () => {
    // Wide, short boxes far apart diagonally: the ray exits the left/right edges, not top/bottom.
    const s = box(0, 0, 40, 20);
    const t = box(200, 50, 40, 20);
    const { sx, sy } = floatingPoints(s, t);
    // The exit x is on the box's right edge (|x-cx| == w/2) because width dominates the clamp here.
    expect(Math.abs(sx - 0)).toBeCloseTo(20, 1);
    expect(Math.abs(sy)).toBeLessThanOrEqual(10 + 1e-6); // within the half-height
  });

  it("coincident centres fall back to the shared centre (no divide-by-zero)", () => {
    const s = box(7, 7, 40, 20);
    const t = box(7, 7, 30, 10);
    const { sx, sy, tx, ty } = floatingPoints(s, t);
    expect(sx).toBe(7);
    expect(sy).toBe(7);
    expect(tx).toBe(7);
    expect(ty).toBe(7);
  });

  it("tolerates zero-size boxes (w/h floored to avoid NaN)", () => {
    const s = box(0, 0, 0, 0);
    const t = box(50, 0, 0, 0);
    const p = floatingPoints(s, t);
    for (const v of Object.values(p)) expect(Number.isFinite(v)).toBe(true);
  });
});
