// Visual constants shared by the live React Flow canvas and the SVG exporter, so the
// "canvas == export" invariant can't silently drift. The live components feed these into
// inline styles (with theme-var fallbacks for node fills); the exporter writes them as
// concrete SVG attributes. Anything a boundary box or a cross-link draws lives here once.

// Cross-link / relationship edge (dashed floating bezier).
export const CROSSLINK_COLOR = "#8b87e0";
export const CROSSLINK_WIDTH = 1.5;
export const CROSSLINK_DASH = "6 4";
export const CROSSLINK_DOT = "2 4";

/** A relationship edge's resolved render values + arrowhead placement, defaults filled in. Computed
 *  once here so the live canvas edge (CrosslinkEdge) and the SVG exporter draw the byte-identical
 *  stroke + arrowheads — the canvas==export invariant. `dasharray` is "" for a solid line. */
export interface ResolvedLinkStyle {
  color: string;
  width: number;
  dasharray: string;
  arrowAtTarget: boolean;
  arrowAtSource: boolean;
}

/** Resolve a cross-link's optional style/arrow fields to concrete render values. Absent fields fall
 *  back to today's look (accent colour, 1.5px, dashed, a single arrowhead at the target). */
export function resolveLinkStyle(s: {
  color?: string;
  width?: number;
  dash?: "dashed" | "solid" | "dotted";
  arrow?: "to" | "from" | "both" | "none";
}): ResolvedLinkStyle {
  const dash = s.dash ?? "dashed";
  const arrow = s.arrow ?? "to";
  return {
    color: s.color || CROSSLINK_COLOR,
    width: s.width || CROSSLINK_WIDTH,
    dasharray: dash === "solid" ? "" : dash === "dotted" ? CROSSLINK_DOT : CROSSLINK_DASH,
    arrowAtTarget: arrow === "to" || arrow === "both",
    arrowAtSource: arrow === "from" || arrow === "both",
  };
}

// Boundary enclosure box.
export const BOUNDARY_PAD = 16;
export const BOUNDARY_STROKE = "#8b87e0";
export const BOUNDARY_FILL = "rgba(120,116,210,0.10)";
export const BOUNDARY_RADIUS = 16;

// Boundary label chip.
export const BOUNDARY_LABEL_BG = "#eceafb";
export const BOUNDARY_LABEL_BORDER = "#cecbf6";
export const BOUNDARY_LABEL_COLOR = "#26215c";

// Summary bracket (a labelled bracket beside a node's subtree). Green, to distinguish from the
// purple boundary box. Drawn to one side of the range, spanning its height + a small overhang.
export const SUMMARY_GAP = 22; // gap between the range edge and the bracket spine
export const SUMMARY_BRACKET_W = 10; // how far the bracket caps reach toward the nodes
export const SUMMARY_PAD = 10; // vertical overhang past the range's top/bottom
export const SUMMARY_STROKE = "#27852f";
export const SUMMARY_LABEL_BG = "#e2fbe8";
export const SUMMARY_LABEL_BORDER = "#9fd9ab";
export const SUMMARY_LABEL_COLOR = "#1e5a2a";

/** The label to draw for a summary (defaults to "Summary" when unset, since a summary IS a label). */
export function summaryLabel(label: string | undefined): string {
  return label?.trim() ? label : "Summary";
}

// Brace map connector — a "{" fork joining a parent to its children (the brace-map layout).
// Slate grey so it reads as structure, distinct from the green summary bracket.
export const BRACE_STROKE = "#6b7280";
export const BRACE_GAP = 22; // gap between the children's left edge and the brace spine

// Dedicated diagram backdrop (onion / funnel / Venn frame) drawn behind the topics.
export const BACKDROP_STROKE = "#9a93d6";
export const BACKDROP_FILL = "rgba(120,116,210,0.06)"; // faint tint (overlaps blend in Venn)

// Callout (anchored annotation bubble) — sticky-note yellow, readable on light + dark canvases.
export const CALLOUT_BG = "#fff8c5";
export const CALLOUT_STROKE = "#d4a72c";
export const CALLOUT_TEXT = "#3b2f00";

/**
 * The label to actually draw for a boundary. "summary" is the implicit default applied to
 * auto-created groupings, so it renders as no chip.
 */
export function boundaryLabel(label: string | undefined): string {
  return label && label !== "summary" ? label : "";
}

// ── Per-overlay colour resolvers ─────────────────────────────────────────────
// A picked overlay colour re-tints the whole object coherently. The same resolver feeds the live
// component (inline CSS) AND the SVG exporter, emitting identical strings (8-digit hex / 6-digit
// hex) so canvas == export holds. An absent colour returns the historical constants verbatim, so
// unstyled overlays are pixel-unchanged. Pure; non-hex inputs fall back gracefully.

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const parseHex = (hex: string): [number, number, number] | null => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((c) => clampByte(c).toString(16).padStart(2, "0")).join("")}`;

/** A #rrggbb colour at alpha `a` (0..1) as 8-digit #rrggbbaa; non-hex input returned verbatim. */
export function withAlpha(hex: string, a: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `${toHex(...rgb)}${clampByte(a * 255)
    .toString(16)
    .padStart(2, "0")}`;
}
/** Mix `hex` toward `target` (#fff to lighten, #000 to darken) by `t` (0..1); non-hex → verbatim. */
export function mix(hex: string, target: string, t: number): string {
  const c = parseHex(hex);
  const tg = parseHex(target);
  if (!c || !tg) return hex;
  return toHex(c[0] + (tg[0] - c[0]) * t, c[1] + (tg[1] - c[1]) * t, c[2] + (tg[2] - c[2]) * t);
}
/** Default topic font size by depth — the central topic is largest, mains a step down, subtopics
 *  smaller — so the hierarchy reads from type size as well as shape (MindManager). A manual
 *  NodeStyle.fontSize always overrides this. Shared by the layout estimate, the canvas, and the
 *  exporter so all three agree. */
export function levelFontSize(depth: number): number {
  if (depth <= 0) return 20; // root
  if (depth === 1) return 16; // main topics
  if (depth === 2) return 14;
  return 13; // depth 3+
}

/** Black or white text that stays readable on a filled `hex` background (WCAG relative luminance).
 *  Used for the level-1 "main topic" pill, whose body is the branch colour rather than white. Non-hex
 *  input → dark text. Shared by the canvas node + the exporter so a filled topic reads the same. */
export function readableTextOn(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#1a1a1a";
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  return lum > 0.5 ? "#1a1a1a" : "#ffffff";
}

export interface ResolvedBoundaryStyle {
  stroke: string;
  fill: string;
  labelBg: string;
  labelBorder: string;
  labelColor: string;
}
/** Boundary stroke + fill tint + label-chip colours from an optional override. */
export function resolveBoundaryStyle(color?: string): ResolvedBoundaryStyle {
  if (!color)
    return {
      stroke: BOUNDARY_STROKE,
      fill: BOUNDARY_FILL,
      labelBg: BOUNDARY_LABEL_BG,
      labelBorder: BOUNDARY_LABEL_BORDER,
      labelColor: BOUNDARY_LABEL_COLOR,
    };
  return {
    stroke: color,
    fill: withAlpha(color, 0.1),
    labelBg: mix(color, "#ffffff", 0.85),
    labelBorder: mix(color, "#ffffff", 0.55),
    labelColor: mix(color, "#000000", 0.55),
  };
}

export interface ResolvedSummaryStyle {
  stroke: string;
  labelBg: string;
  labelBorder: string;
  labelColor: string;
}
/** Summary bracket stroke + label-chip colours from an optional override (no fill — open bracket). */
export function resolveSummaryStyle(color?: string): ResolvedSummaryStyle {
  if (!color)
    return {
      stroke: SUMMARY_STROKE,
      labelBg: SUMMARY_LABEL_BG,
      labelBorder: SUMMARY_LABEL_BORDER,
      labelColor: SUMMARY_LABEL_COLOR,
    };
  return {
    stroke: color,
    labelBg: mix(color, "#ffffff", 0.85),
    labelBorder: mix(color, "#ffffff", 0.55),
    labelColor: mix(color, "#000000", 0.55),
  };
}

export interface ResolvedCalloutStyle {
  bg: string;
  stroke: string;
  text: string;
  connector: string;
}
/** Callout bubble bg + stroke + text + connector from an optional override (the colour = accent). */
export function resolveCalloutStyle(color?: string): ResolvedCalloutStyle {
  if (!color)
    return {
      bg: CALLOUT_BG,
      stroke: CALLOUT_STROKE,
      text: CALLOUT_TEXT,
      connector: CALLOUT_STROKE,
    };
  return {
    bg: mix(color, "#ffffff", 0.82),
    stroke: color,
    text: mix(color, "#000000", 0.6),
    connector: color,
  };
}

export interface ResolvedBackdropStyle {
  stroke: string;
  fill: string;
}
/** Diagram-backdrop stroke + fill tint from an optional override. */
export function resolveBackdropStyle(color?: string): ResolvedBackdropStyle {
  if (!color) return { stroke: BACKDROP_STROKE, fill: BACKDROP_FILL };
  return { stroke: color, fill: withAlpha(color, 0.06) };
}
