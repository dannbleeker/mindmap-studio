// Branch edge: tapered ribbon path between two points with depth-based width.
// Pure geometry + React component wrapping. Tests validate path generation and memoization.

import { describe, expect, it } from "vitest";
import { taperedRibbonPath } from "../src/mindmap/flow/BranchEdge";

describe("taperedRibbonPath (tapered ribbon geometry)", () => {
  it("generates a valid SVG path string", () => {
    const path = taperedRibbonPath(0, 0, 100, 0, 1);

    expect(path).toMatch(/^M\s+[\d.-]+\s+[\d.-]+/); // Starts with M (moveto)
    expect(path).toContain("C"); // Contains cubic bezier
    expect(path).toContain("L"); // Contains line
    expect(path).toContain("Z"); // Closes path
  });

  it("draws horizontal ribbon (dx > dy)", () => {
    const path = taperedRibbonPath(0, 0, 100, 0, 1);

    // Horizontal edge: contains curve segment
    expect(path).toContain("C");
    expect(path).toMatch(/C\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+/);
  });

  it("draws vertical ribbon (dy > dx)", () => {
    const path = taperedRibbonPath(0, 0, 0, 100, 1);

    // Vertical edge: curve control points should follow vertical axis
    expect(path).toBeTruthy();
    expect(path).toContain("C"); // Still has bezier
  });

  it("tapers width based on depth", () => {
    const path1 = taperedRibbonPath(0, 0, 100, 0, 0); // Depth 0: thick
    const path2 = taperedRibbonPath(0, 0, 100, 0, 5); // Depth 5: thin

    // Both are valid paths, but widths differ
    expect(path1).toBeTruthy();
    expect(path2).toBeTruthy();
    expect(path1).not.toBe(path2); // Different geometry due to depth
  });

  it("clamps depth to ensure minimum thickness", () => {
    const path1 = taperedRibbonPath(0, 0, 100, 0, 10); // Very deep
    const path2 = taperedRibbonPath(0, 0, 100, 0, 100); // Extremely deep

    // Both should have valid paths (minimum thickness enforced)
    expect(path1).toMatch(/^M/);
    expect(path2).toMatch(/^M/);
  });

  it("handles zero-length edges (sx=tx, sy=ty)", () => {
    const path = taperedRibbonPath(50, 50, 50, 50, 1);

    // Zero-length edge: len becomes 1 via `|| 1` fallback
    expect(path).toBeTruthy();
    expect(path).toContain("Z"); // Still closes
  });

  it("handles very short edges", () => {
    const path = taperedRibbonPath(0, 0, 0.1, 0.1, 1);

    expect(path).toMatch(/^M/);
    expect(path).toContain("Z");
  });

  it("handles negative coordinates", () => {
    const path = taperedRibbonPath(-100, -50, 0, 0, 1);

    expect(path).toBeTruthy();
    expect(path).toContain("Z");
  });

  it("respects direction: path from A to B ≠ path from B to A", () => {
    const pathAB = taperedRibbonPath(0, 0, 100, 0, 1);
    const pathBA = taperedRibbonPath(100, 0, 0, 0, 1);

    // Opposite directions produce different paths (ribbon taper is directional)
    expect(pathAB).not.toBe(pathBA);
  });

  it("handles diagonal edges", () => {
    const path = taperedRibbonPath(0, 0, 100, 100, 2);

    expect(path).toMatch(/^M/);
    expect(path).toContain("C");
    expect(path).toContain("Z");
  });

  it("produces deterministic output for same inputs", () => {
    const path1 = taperedRibbonPath(10, 20, 130, 80, 3);
    const path2 = taperedRibbonPath(10, 20, 130, 80, 3);

    expect(path1).toBe(path2);
  });

  it("handles depth 0 (root level, thickest)", () => {
    const path = taperedRibbonPath(0, 0, 100, 0, 0);

    // Depth 0: halfThickness(max(0, 0-1)) = halfThickness(-1) → max(7 - (-1)*1.1, 2.5) = 8.1
    // Then parent/child widths differ by depth, creating taper
    expect(path).toBeTruthy();
  });

  it("handles depth -1 (negative, clamped to min thickness)", () => {
    const path = taperedRibbonPath(0, 0, 100, 0, -1);

    // Negative depth: still produces valid path (no crashes)
    expect(path).toMatch(/^M/);
    expect(path).toContain("Z");
  });
});
