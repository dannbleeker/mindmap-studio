import type { MapImage } from "./model/types";

// A curated, built-in library of simple inline-SVG stickers/illustrations the user can drop on a
// node without supplying their own file. Picking a sticker just sets that node's `image` to the
// sticker's data URL, so it flows through the EXISTING node-image render + export pipeline — it
// paints on the canvas (<img src>) and in every export (SVG <image href>, and the PNG/PDF/HTML
// that build on the SVG) with zero new render code, and is lossless in .json (it's just node.image).
//
// Each glyph is authored on a shared 24×24 viewBox with one accent colour and a consistent visual
// weight, so the set reads as a family and stays crisp at node size. Kept tiny (no <defs>, no
// gradients) so they add negligible bytes — they're inlined as data URLs.

/** The single accent colour shared by every sticker, so the set looks like one family. */
const ACCENT = "#6c63d6";

/** On-canvas display size for a picked sticker (square; matches the image pipeline's display cap). */
export const STICKER_DISPLAY_PX = 72;

export interface Sticker {
  /** Stable id (used as a React key and in tests). */
  id: string;
  /** Human label shown as the button tooltip / aria-label. */
  label: string;
  /** Inline SVG markup, authored on a 0 0 24 24 viewBox. */
  svg: string;
}

// A square 24×24 SVG wrapper. `body` is the glyph's paint; `fill` defaults to the accent colour so
// most stickers are a single flat shape, the rest override per-shape.
function svg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="${ACCENT}">${body}</svg>`;
}

/** The curated sticker set. Order is the display order in the picker. */
export const STICKERS: readonly Sticker[] = [
  {
    id: "star",
    label: "Star",
    svg: svg(
      `<path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.4l-5.8 3.05 1.1-6.47L2.6 9.35l6.5-.95z"/>`,
    ),
  },
  {
    id: "heart",
    label: "Heart",
    svg: svg(
      `<path d="M12 21s-7.5-4.6-10-9.2C.3 8.7 1.7 5 5.2 5c2.1 0 3.4 1.2 4.3 2.4C10.4 6.2 11.7 5 13.8 5c3.5 0 4.9 3.7 3.2 6.8C19.5 16.4 12 21 12 21z"/>`,
    ),
  },
  {
    id: "check-badge",
    label: "Check badge",
    svg: svg(
      `<circle cx="12" cy="12" r="10"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    ),
  },
  {
    id: "cross-badge",
    label: "Cross badge",
    svg: svg(
      `<circle cx="12" cy="12" r="10"/><path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
    ),
  },
  {
    id: "flag",
    label: "Flag",
    svg: svg(
      `<path d="M6 3v18" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round"/><path d="M7 4h11l-2.2 3.5L18 11H7z"/>`,
    ),
  },
  {
    id: "lightbulb",
    label: "Idea (lightbulb)",
    svg: svg(
      `<path d="M9 18h6v1.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 19.5z"/><path d="M12 2.5a6.5 6.5 0 0 1 4 11.6c-.7.6-1 1-1 1.9H9c0-.9-.3-1.3-1-1.9A6.5 6.5 0 0 1 12 2.5z"/>`,
    ),
  },
  {
    id: "warning",
    label: "Warning",
    svg: svg(
      `<path d="M12 3l10 17H2z"/><path d="M12 9v5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="#fff"/>`,
    ),
  },
  {
    id: "info",
    label: "Info",
    svg: svg(
      `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="7.5" r="1.4" fill="#fff"/><path d="M12 11v6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
    ),
  },
  {
    id: "speech",
    label: "Speech bubble",
    svg: svg(`<path d="M3 5h18v12H9l-5 4v-4H3z"/>`),
  },
  {
    id: "thumbs-up",
    label: "Thumbs up",
    svg: svg(
      `<path d="M2 10h3v11H2z"/><path d="M7 21V10l4.5-7c1.3 0 2.2 1.1 2 2.4L13 9h6.2c1.4 0 2.3 1.3 1.9 2.6l-2 7c-.3 1-1.2 1.4-2 1.4z"/>`,
    ),
  },
  {
    id: "thumbs-down",
    label: "Thumbs down",
    svg: svg(
      `<path d="M22 14h-3V3h3z"/><path d="M17 3v11l-4.5 7c-1.3 0-2.2-1.1-2-2.4l.5-3.6H4.8c-1.4 0-2.3-1.3-1.9-2.6l2-7c.3-1 1.2-1.4 2-1.4z"/>`,
    ),
  },
  {
    id: "target",
    label: "Target",
    svg: svg(
      `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6.2" fill="#fff"/><circle cx="12" cy="12" r="2.6"/>`,
    ),
  },
  {
    id: "rocket",
    label: "Rocket",
    svg: svg(
      `<path d="M12 2c3.5 2 5 5.5 5 9 0 2-.6 3.7-1.5 5h-7C7.6 14.7 7 13 7 11c0-3.5 1.5-7 5-9z"/><circle cx="12" cy="9.5" r="1.8" fill="#fff"/><path d="M9 16l-2.5 4 3.5-1.5M15 16l2.5 4-3.5-1.5"/>`,
    ),
  },
  {
    id: "lock",
    label: "Lock",
    svg: svg(
      `<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V8a4 4 0 0 1 8 0v2" fill="none" stroke="${ACCENT}" stroke-width="2"/><circle cx="12" cy="15" r="1.6" fill="#fff"/>`,
    ),
  },
  {
    id: "key",
    label: "Key",
    svg: svg(
      `<circle cx="8" cy="8" r="5"/><circle cx="8" cy="8" r="2" fill="#fff"/><path d="M11.5 11.5L21 21M17 17l2.5-2.5M19 19l2-2" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round"/>`,
    ),
  },
  {
    id: "clock",
    label: "Clock",
    svg: svg(
      `<circle cx="12" cy="12" r="10"/><path d="M12 6.5V12l3.5 2.2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    ),
  },
  {
    id: "pin",
    label: "Location pin",
    svg: svg(
      `<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.6" fill="#fff"/>`,
    ),
  },
  {
    id: "fire",
    label: "Fire",
    svg: svg(
      `<path d="M12 2c1 3-1.5 4.5-1.5 7 0 1.2-1 2-2 2-.3 1 .5 2 .5 2C7 14 6 12.5 6 12.5 5 14 4.5 15.7 4.5 17a7.5 7.5 0 0 0 15 0c0-4.5-3-6.5-4-9-.7 1.7-2 2.3-2 .8 0-3-1.5-5.3-1.5-6.8z"/>`,
    ),
  },
  {
    id: "question-badge",
    label: "Question badge",
    svg: svg(
      `<circle cx="12" cy="12" r="10"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4.9c0 1.9-2.6 2.2-2.6 4" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.2" fill="#fff"/>`,
    ),
  },
  {
    id: "arrow-right",
    label: "Arrow right",
    svg: svg(
      `<circle cx="12" cy="12" r="10"/><path d="M7 12h8M12 8l4 4-4 4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    ),
  },
];

/**
 * Turn a sticker's inline SVG into a `data:image/svg+xml,…` URL usable as both an `<img src>` (on
 * the canvas) and an SVG `<image href>` (in the export). Uses `encodeURIComponent` (not base64) so
 * the payload stays human-readable and small; `#` and other reserved characters are escaped so the
 * URL is always well-formed.
 */
export function stickerDataUrl(sticker: Sticker): string {
  return `data:image/svg+xml,${encodeURIComponent(sticker.svg)}`;
}

/** Build the MapImage applied to a node when its sticker is picked (square display box). */
export function stickerImage(sticker: Sticker): MapImage {
  return {
    url: stickerDataUrl(sticker),
    width: STICKER_DISPLAY_PX,
    height: STICKER_DISPLAY_PX,
  };
}
