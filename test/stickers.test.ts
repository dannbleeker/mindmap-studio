import { describe, expect, it } from "vitest";
import {
  STICKERS,
  STICKER_DISPLAY_PX,
  type Sticker,
  stickerDataUrl,
  stickerImage,
} from "../src/stickers";

describe("STICKERS catalogue", () => {
  it("is a non-empty curated set", () => {
    expect(STICKERS.length).toBeGreaterThanOrEqual(16);
    expect(STICKERS.length).toBeLessThanOrEqual(24);
  });

  it("gives every sticker a unique id", () => {
    const ids = STICKERS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every sticker a non-empty label and id", () => {
    for (const s of STICKERS) {
      expect(s.id.trim().length).toBeGreaterThan(0);
      expect(s.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("authors every sticker as a well-formed SVG on a shared 24×24 viewBox", () => {
    for (const s of STICKERS) {
      expect(s.svg.startsWith("<svg")).toBe(true);
      expect(s.svg.trimEnd().endsWith("</svg>")).toBe(true);
      expect(s.svg).toContain('viewBox="0 0 24 24"');
      // Balanced tags: every "<svg" is closed by a matching "</svg>".
      expect((s.svg.match(/<svg/g) || []).length).toBe((s.svg.match(/<\/svg>/g) || []).length);
      // No stray template holes from authoring.
      expect(s.svg).not.toContain("undefined");
      expect(s.svg).not.toContain("[object");
    }
  });
});

describe("stickerDataUrl", () => {
  it("produces a data:image/svg+xml URL that round-trips back to the SVG", () => {
    for (const s of STICKERS) {
      const url = stickerDataUrl(s);
      expect(url.startsWith("data:image/svg+xml,")).toBe(true);
      const decoded = decodeURIComponent(url.slice("data:image/svg+xml,".length));
      expect(decoded).toBe(s.svg);
    }
  });

  it("URL-encodes reserved characters so the href is well-formed (no raw # or <)", () => {
    const sticker: Sticker = {
      id: "tmp",
      label: "Tmp",
      svg: '<svg viewBox="0 0 24 24" fill="#abc"><path d="M0 0h1"/></svg>',
    };
    const url = stickerDataUrl(sticker);
    const payload = url.slice("data:image/svg+xml,".length);
    expect(payload).not.toContain("#");
    expect(payload).not.toContain("<");
    expect(payload).toContain("%23"); // the "#abc" colour is percent-encoded
    // …and it still decodes back losslessly.
    expect(decodeURIComponent(payload)).toBe(sticker.svg);
  });
});

describe("stickerImage", () => {
  it("wraps a sticker as a square MapImage carrying the data URL", () => {
    const img = stickerImage(STICKERS[0]);
    expect(img.url).toBe(stickerDataUrl(STICKERS[0]));
    expect(img.width).toBe(STICKER_DISPLAY_PX);
    expect(img.height).toBe(STICKER_DISPLAY_PX);
  });
});
