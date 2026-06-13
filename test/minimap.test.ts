import { describe, expect, it } from "vitest";
import { computeMinimapLayout, minimapPointToCanvas } from "../src/mindmap/minimap";

describe("computeMinimapLayout", () => {
  const nodes = [
    { x: 0, y: 0, w: 100, h: 50 },
    { x: 200, y: 100, w: 100, h: 50 },
  ];
  const view = { x: 0, y: 0, w: 150, h: 80 };

  it("returns null when there are no nodes", () => {
    expect(computeMinimapLayout([], view, 200, 130)).toBeNull();
  });

  it("fits content to the box, preserving aspect ratio (scale = limiting dimension)", () => {
    const layout = computeMinimapLayout(nodes, view, 200, 130, 8);
    if (!layout) throw new Error("expected a layout");
    // content 300x150; box minus 2*pad = 184x114; scale = min(184/300, 114/150) = 184/300
    expect(layout.scale).toBeCloseTo(184 / 300, 5);
    expect(layout.contentMinX).toBe(0);
    expect(layout.contentMinY).toBe(0);
  });

  it("centres content within the box", () => {
    const layout = computeMinimapLayout(nodes, view, 200, 130, 8);
    if (!layout) throw new Error("expected a layout");
    const s = 184 / 300;
    expect(layout.offsetX).toBeCloseTo((200 - 300 * s) / 2, 4);
    expect(layout.offsetY).toBeCloseTo((130 - 150 * s) / 2, 4);
  });

  it("projects node rects into minimap pixels", () => {
    const layout = computeMinimapLayout(nodes, view, 200, 130, 8);
    if (!layout) throw new Error("expected a layout");
    const s = 184 / 300;
    expect(layout.nodes[0]).toMatchObject({ x: layout.offsetX, y: layout.offsetY });
    expect(layout.nodes[1].x).toBeCloseTo(layout.offsetX + 200 * s, 4);
    expect(layout.nodes[1].y).toBeCloseTo(layout.offsetY + 100 * s, 4);
    expect(layout.nodes[0].w).toBeCloseTo(100 * s, 4);
  });

  it("node bounds ignore the viewport (schematic stays put while panning)", () => {
    const near = computeMinimapLayout(nodes, { x: 0, y: 0, w: 10, h: 10 }, 200, 130, 8);
    const farPan = computeMinimapLayout(nodes, { x: 999, y: 999, w: 10, h: 10 }, 200, 130, 8);
    if (!near || !farPan) throw new Error("expected layouts");
    expect(farPan.scale).toBeCloseTo(near.scale, 6);
    expect(farPan.nodes[0]).toEqual(near.nodes[0]);
  });

  it("minimapPointToCanvas is the inverse of the node projection", () => {
    const layout = computeMinimapLayout(nodes, view, 200, 130, 8);
    if (!layout) throw new Error("expected a layout");
    // The projected top-left of node 0 maps back to its canvas-local origin (0,0).
    const back = minimapPointToCanvas(layout.nodes[0].x, layout.nodes[0].y, layout);
    expect(back.x).toBeCloseTo(0, 5);
    expect(back.y).toBeCloseTo(0, 5);
    // A point at node 1's projected origin maps back to (200,100).
    const back1 = minimapPointToCanvas(layout.nodes[1].x, layout.nodes[1].y, layout);
    expect(back1.x).toBeCloseTo(200, 4);
    expect(back1.y).toBeCloseTo(100, 4);
  });
});
