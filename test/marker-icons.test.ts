import { describe, expect, it } from "vitest";
import { MARKER_PALETTE, markerImage } from "../src/icons";

// The flat vector marker set replaces OS colour emoji — every palette marker must resolve to a
// platform-consistent data: URL (rendered as an <img>/<image> on canvas + export); an unknown marker
// falls back to its literal character.
describe("marker vector icons", () => {
  it("returns an SVG data: URL for every palette marker", () => {
    for (const m of MARKER_PALETTE) {
      expect(markerImage(m), m).toMatch(/^data:image\/svg\+xml,/);
    }
  });

  it("returns null for an unknown marker (→ render the literal character)", () => {
    expect(markerImage("🦄")).toBeNull();
    expect(markerImage("anything")).toBeNull();
  });

  it("is deterministic", () => {
    expect(markerImage("⭐")).toBe(markerImage("⭐"));
  });
});
