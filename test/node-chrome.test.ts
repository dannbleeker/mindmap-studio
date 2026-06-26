import { describe, expect, it } from "vitest";
import { showNodeAffordances } from "../src/mindmap/flow/nodeChrome";

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
