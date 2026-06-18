import { describe, expect, it } from "vitest";
import {
  type Box,
  attachSideFor,
  branchEndpoints,
  branchWidths,
  childrenAxis,
  taperedRibbonPath,
} from "../src/mindmap/flow/floating";

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

  it("branchWidths tapers thinner with depth (chunky main branches → fine sub-branches)", () => {
    expect(branchWidths(1).trunk).toBeGreaterThan(branchWidths(3).trunk);
    expect(branchWidths(1).trunk).toBeGreaterThan(branchWidths(1).tip);
  });
});
