import { describe, expect, it } from "vitest";
import { isGeometric, shapeInset, shapeOverlayPath, shapePath } from "../src/mindmap/flow/shapes";

// Pure node-shape geometry: the single source of truth the canvas backdrop, the SVG exporter,
// and the style-picker icons all share — so testing it here pins canvas == export == picker.

describe("flow node shapes (pure geometry)", () => {
  it("classifies geometric (SVG-path) vs CSS rounded-rect shapes", () => {
    expect(isGeometric("diamond")).toBe(true);
    expect(isGeometric("ellipse")).toBe(true);
    expect(isGeometric("parallelogram")).toBe(true);
    expect(isGeometric("hexagon")).toBe(true);
    expect(isGeometric("cylinder")).toBe(true);
    expect(isGeometric("round")).toBe(false);
    expect(isGeometric("rect")).toBe(false);
    expect(isGeometric("pill")).toBe(false);
    expect(isGeometric(undefined)).toBe(false);
  });

  it("diamond is a rhombus through the four box-edge midpoints", () => {
    // box (0,0)–(100,40): top (50,0), right (100,20), bottom (50,40), left (0,20)
    expect(shapePath("diamond", 0, 0, 100, 40)).toBe("M 50 0 L 100 20 L 50 40 L 0 20 Z");
  });

  it("hexagon has six vertices and closes", () => {
    const d = shapePath("hexagon", 0, 0, 100, 40);
    expect(d.match(/L/g)?.length).toBe(5); // 1 M + 5 L = 6 vertices
    expect(d.endsWith("Z")).toBe(true);
  });

  it("parallelogram skews the top edge right and the bottom edge left", () => {
    const d = shapePath("parallelogram", 0, 0, 100, 40);
    // slant = min(100*0.22, 40*0.8) = 22 → top starts at x=22, bottom-right pulls in by 22
    expect(d).toBe("M 22 0 L 100 0 L 78 40 L 0 40 Z");
  });

  it("ellipse is two semicircular arc segments", () => {
    const d = shapePath("ellipse", 0, 0, 80, 40);
    expect(d.match(/A/g)?.length).toBe(2);
    expect(d).toContain("A 40 20"); // rx=40 ry=20
  });

  it("only the cylinder carries a front-lip overlay path", () => {
    expect(shapeOverlayPath("cylinder", 0, 0, 100, 60)).toMatch(/^M .* A /);
    expect(shapeOverlayPath("diamond", 0, 0, 100, 60)).toBeNull();
    expect(shapeOverlayPath("ellipse", 0, 0, 100, 60)).toBeNull();
  });

  it("paths use absolute coords (translate by x/y) so the exporter can place them", () => {
    expect(shapePath("diamond", 10, 20, 100, 40)).toBe("M 60 20 L 110 40 L 60 60 L 10 40 Z");
  });

  it("narrowing shapes carry text insets; CSS shapes carry none", () => {
    expect(shapeInset("diamond").left).toBeGreaterThan(0);
    expect(shapeInset("hexagon").left).toBeGreaterThan(0);
    expect(shapeInset("round")).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
    expect(shapeInset(undefined)).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
  });
});
