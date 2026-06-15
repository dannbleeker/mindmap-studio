import { describe, expect, it } from "vitest";
import { backdropGeometry, backdropRings } from "../src/mindmap/flow/backdrop";

// Dedicated-diagram backdrop geometry: the source of truth shared by the canvas overlay and the
// SVG exporter, so testing it here pins canvas == export for the frame.

describe("flow backdrop (pure geometry)", () => {
  it("onion draws N concentric circles (outer→inner) with band-top label anchors", () => {
    const g = backdropGeometry({ kind: "onion", rings: 3 });
    expect(g.shapes.map((s) => s.r)).toEqual([300, 200, 100]);
    expect(g.shapes.every((s) => s.type === "circle" && s.cx === 0 && s.cy === 0)).toBe(true);
    expect(g.anchors.map((a) => a.y)).toEqual([-250, -150, -50]); // mid-band of each ring
    expect(g.bbox).toEqual({ x: -300, y: -300, w: 600, h: 600 });
  });

  it("clamps onion ring count to 2..6 (default 3)", () => {
    expect(backdropRings({ kind: "onion", rings: 99 })).toBe(6);
    expect(backdropRings({ kind: "onion", rings: 1 })).toBe(2);
    expect(backdropRings({ kind: "onion" })).toBe(3);
  });

  it("venn frames have a fixed region count by kind", () => {
    expect(backdropRings({ kind: "venn2" })).toBe(3);
    expect(backdropRings({ kind: "venn3" })).toBe(7);
  });
});
