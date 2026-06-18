import { describe, expect, it } from "vitest";
import {
  type Box,
  attachSideFor,
  branchEndpoints,
  branchRender,
  branchWidths,
  childrenAxis,
  crosslinkBezier,
  elbowPath,
  taperedRibbonPath,
} from "../src/mindmap/flow/floating";
import { boundaryPath, dashArray } from "../src/mindmap/flow/geometry";

// The organic branch connectors: one shared origin per parent-side, enter-from-near-end, overlap-touch,
// chunky taper. Pure geometry shared by the canvas (BranchEdge) + the SVG exporter (canvas == export).

const box = (cx: number, cy: number, w = 100, h = 30): Box => ({ cx, cy, w, h });

describe("branch geometry", () => {
  it("childrenAxis: horizontal when children spread sideways, vertical when stacked", () => {
    const p = box(0, 0);
    expect(childrenAxis(p, [box(200, -50), box(200, 0), box(200, 50)])).toBe("h");
    expect(childrenAxis(p, [box(-20, 200), box(0, 200), box(20, 200)])).toBe("v");
  });

  it("attachSideFor resolves the side along the dominant axis", () => {
    const p = box(0, 0);
    expect(attachSideFor(p, box(200, 10), "h")).toBe("right");
    expect(attachSideFor(p, box(-200, 10), "h")).toBe("left");
    expect(attachSideFor(p, box(10, 200), "v")).toBe("bottom");
    expect(attachSideFor(p, box(10, -200), "v")).toBe("top");
  });

  it("branchEndpoints: ONE origin on the parent's near side + each child entered at its near end", () => {
    const parent = box(400, 200, 90, 28);
    const top = box(150, 40, 120, 26);
    const mid = box(150, 200, 120, 26);
    const bot = box(150, 360, 120, 26);
    const eTop = branchEndpoints(parent, top, "left");
    const eMid = branchEndpoints(parent, mid, "left");
    const eBot = branchEndpoints(parent, bot, "left");
    // Every sibling shares the same origin (the trunk), at the parent's left edge, tucked inside it.
    expect(eTop.sx).toBe(eMid.sx);
    expect(eMid.sx).toBe(eBot.sx);
    expect(eTop.sy).toBe(200);
    expect(eTop.sx).toBeGreaterThan(400 - 90 / 2); // inside the left edge (overlap-to-touch)
    // Target sits on the child's near (right) edge, tucked inside.
    expect(eMid.tx).toBeLessThan(150 + 120 / 2);
    // Enter from the near end: the top child connects near its lower edge, the bottom near its upper.
    expect(eTop.ty).toBeGreaterThan(40); // below the top child's centre → its near (lower) end
    expect(eBot.ty).toBeLessThan(360); // above the bottom child's centre → its near (upper) end
    expect(eMid.ty).toBe(200); // a level child enters at its mid
  });

  it("taperedRibbonPath is a closed filled ribbon", () => {
    const d = taperedRibbonPath(0, 0, -200, -100, "left", 6, 1.5);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.trim().endsWith("Z")).toBe(true);
    expect(d).toBe(taperedRibbonPath(0, 0, -200, -100, "left", 6, 1.5)); // deterministic
  });

  it("boundaryPath: every shape is a closed path (cloud bumps, polygon corners, ellipse arcs)", () => {
    expect(boundaryPath("rect", 0, 0, 100, 60)).toBe("M 0 0 H 100 V 60 H 0 Z");
    expect(boundaryPath("roundRect", 0, 0, 100, 60)).toContain("A"); // rounded corners
    expect(boundaryPath("ellipse", 0, 0, 100, 60)).toContain("A"); // arcs
    expect(boundaryPath("polygon", 0, 0, 100, 60)).toContain("L"); // cut corners
    expect(boundaryPath("cloud", 0, 0, 100, 60)).toContain("Q"); // scalloped bumps
    for (const s of ["roundRect", "rect", "ellipse", "polygon", "cloud"] as const)
      expect(boundaryPath(s, 0, 0, 100, 60).trim().endsWith("Z"), s).toBe(true);
  });

  it("dashArray maps the dash styles", () => {
    expect(dashArray("solid")).toBe("");
    expect(dashArray("dashed")).toBe("6 5");
    expect(dashArray("dotted")).toBe("2 4");
    expect(dashArray(undefined)).toBe("");
  });

  it("branchWidths tapers thinner with depth (chunky main branches → fine sub-branches)", () => {
    expect(branchWidths(1).trunk).toBeGreaterThan(branchWidths(3).trunk);
    expect(branchWidths(1).trunk).toBeGreaterThan(branchWidths(1).tip);
  });

  it("crosslinkBezier: a deterministic perpendicular-bow cubic shared canvas == export", () => {
    const { path } = crosslinkBezier(0, 0, 200, 100);
    // Control points are offset PERPENDICULAR to the chord (auto-bow), the same shape the live canvas
    // + the SVG exporter both emit (canvas == export) — byte-stable for a fixed input.
    expect(path).toBe("M 0 0 C 52.67 61.33 119.33 94.67 200 100");
    expect(crosslinkBezier(0, 0, 200, 100).path).toBe(path); // deterministic
  });

  it("branchRender: filled ribbon for organic; uniform stroke for elbow/curved/straight; dash → stroke", () => {
    const p = box(0, 0, 100, 40);
    const c = box(200, 0, 100, 40);
    const organic = branchRender(p, c, "right", { depth: 1 });
    expect(organic.fill).not.toBeNull(); // the chunky taper is a FILLED ribbon
    expect(organic.stroke).toBeNull();
    const elbow = branchRender(p, c, "right", { depth: 1, connectorStyle: "elbow" });
    expect(elbow.fill).toBeNull();
    expect(elbow.stroke).not.toBeNull();
    const straight = branchRender(p, c, "right", { connectorStyle: "straight" });
    expect(straight.d).toMatch(/^M [\d.]+ [\d.]+ L /); // a single line
    const curved = branchRender(p, c, "right", { connectorStyle: "curved" });
    expect(curved.d).toContain("C"); // a cubic
    // a dashed branch can't be a filled ribbon → falls back to a uniform stroked curve
    const dashed = branchRender(p, c, "right", { connectorStyle: "organic", dash: "dashed" });
    expect(dashed.fill).toBeNull();
    expect(dashed.stroke).not.toBeNull();
    expect(dashed.dash).toBe("6 4");
  });

  it("crosslinkBezier: bows perpendicular to the chord; `curve` overrides it (0 = straight)", () => {
    // Horizontal chord (0,0)→(200,0): the perpendicular is vertical, so the bow shows up in labelY.
    expect(crosslinkBezier(0, 0, 200, 0).labelY).not.toBe(0); // a gentle auto-bow by default
    expect(crosslinkBezier(0, 0, 200, 0, 0).labelY).toBe(0); // curve 0 → a straight line
    expect(Math.abs(crosslinkBezier(0, 0, 200, 0, 50).labelY)).toBeGreaterThan(20); // a bigger bow
    expect(crosslinkBezier(0, 0, 200, 0, 50).path).toContain("C");
  });

  it("elbowPath: a right-angle org-chart connector from parent-bottom-centre to child-top-centre", () => {
    const parent = box(0, 0, 100, 40); // centre (0,0) → bottom edge at y=20
    const child = box(60, 200, 100, 40); // below + offset → top edge at y=180
    const d = elbowPath(parent, child, "bottom");
    expect(d.startsWith("M 0 20")).toBe(true); // leaves the parent's bottom CENTRE
    expect(d.trimEnd().endsWith("60 180")).toBe(true); // ends at the child's top CENTRE
    expect(d).toContain("Q"); // routes via a rounded mid-bus, not one diagonal
    expect(elbowPath(parent, child, "bottom")).toBe(d); // deterministic
  });
});
