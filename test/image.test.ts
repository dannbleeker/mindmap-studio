import { describe, expect, it } from "vitest";
import { imageSizing } from "../src/io/image";

// Pure scale math for node images: downscale the stored bitmap to <=800px on the long
// side, cap the on-canvas display width at 220px, preserve aspect ratio, floor at 1px.
describe("imageSizing", () => {
  it("leaves a small landscape image at full store size, caps display width", () => {
    expect(imageSizing(400, 300)).toEqual({
      storeW: 400,
      storeH: 300,
      downscaled: false,
      displayW: 220,
      displayH: 165,
    });
  });

  it("downscales a large image to 800px on the long side", () => {
    expect(imageSizing(1600, 1200)).toEqual({
      storeW: 800,
      storeH: 600,
      downscaled: true,
      displayW: 220,
      displayH: 165,
    });
  });

  it("downscales by the taller side for a portrait image", () => {
    expect(imageSizing(600, 1200)).toEqual({
      storeW: 400,
      storeH: 800,
      downscaled: true,
      displayW: 220,
      displayH: 440,
    });
  });

  it("never enlarges a tiny image (display caps width, doesn't upscale)", () => {
    expect(imageSizing(50, 50)).toEqual({
      storeW: 50,
      storeH: 50,
      downscaled: false,
      displayW: 50,
      displayH: 50,
    });
  });

  it("floors degenerate 0x0 dimensions at 1px instead of dividing by zero", () => {
    expect(imageSizing(0, 0)).toEqual({
      storeW: 1,
      storeH: 1,
      downscaled: false,
      displayW: 1,
      displayH: 1,
    });
  });

  it("preserves aspect ratio within rounding at the store cap", () => {
    const { storeW, storeH } = imageSizing(1000, 750); // 4:3
    expect(storeW).toBe(800);
    expect(storeH).toBe(600);
    expect(Math.abs(storeW / storeH - 4 / 3)).toBeLessThan(0.01);
  });
});
