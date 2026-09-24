import { describe, expect, it } from "vitest";
import {
  FIT_MAX_ZOOM,
  affordanceScale,
  popoverAlign,
  showNodeAffordances,
} from "../src/mindmap/flow/nodeChrome";

describe("showNodeAffordances", () => {
  it("never shows while editing", () => {
    expect(showNodeAffordances(true, true, false, true)).toBe(false);
    expect(showNodeAffordances(false, true, false, true)).toBe(false);
  });

  it("shows on hover regardless of selection state", () => {
    expect(showNodeAffordances(true, false, false, false)).toBe(true);
    expect(showNodeAffordances(true, true, true, false)).toBe(true); // hovering a member of a bulk select
  });

  it("shows for a single selection, but not for a multi-selection (the bug)", () => {
    expect(showNodeAffordances(false, true, false, false)).toBe(true); // single select
    expect(showNodeAffordances(false, true, true, false)).toBe(false); // branch/marquee select → suppressed
  });

  it("hides when neither hovered nor selected", () => {
    expect(showNodeAffordances(false, false, false, false)).toBe(false);
    expect(showNodeAffordances(false, false, true, false)).toBe(false);
  });
});

describe("popoverAlign", () => {
  // A 412px phone pane and the ~300px touch action bar.
  it("centres the bar over a node with room on both sides", () => {
    expect(popoverAlign(180, 240, 412, 300)).toBe("center"); // 1000px pane: plenty of room
    expect(popoverAlign(480, 520, 1000, 300)).toBe("center");
  });

  it("anchors to the node's right edge near the pane's right edge (the phone repro)", () => {
    // The 64px topic at x=338 whose centred bar ran to x=498 on a 412px screen.
    expect(popoverAlign(338, 402, 412, 300)).toBe("end");
  });

  it("anchors to the node's left edge near the pane's left edge", () => {
    expect(popoverAlign(10, 70, 412, 300)).toBe("start");
  });
});

describe("affordanceScale", () => {
  it("counter-scales when zoomed in so affordances keep their screen size", () => {
    expect(affordanceScale(3)).toBeCloseTo(1 / 3);
    expect(affordanceScale(1.5)).toBeCloseTo(2 / 3);
  });

  it("is 1 at or below 100% — affordances shrink with the map rather than burying small topics", () => {
    expect(affordanceScale(1)).toBe(1);
    expect(affordanceScale(0.4)).toBe(1);
  });
});

describe("FIT_MAX_ZOOM", () => {
  it("keeps a whole-map fit at or below natural size (a tiny map used to open at 300%)", () => {
    expect(FIT_MAX_ZOOM).toBeLessThanOrEqual(1);
  });
});
