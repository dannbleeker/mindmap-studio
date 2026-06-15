// Visual constants shared by the live React Flow canvas and the SVG exporter, so the
// "canvas == export" invariant can't silently drift. The live components feed these into
// inline styles (with theme-var fallbacks for node fills); the exporter writes them as
// concrete SVG attributes. Anything a boundary box or a cross-link draws lives here once.

// Cross-link / relationship edge (dashed floating bezier).
export const CROSSLINK_COLOR = "#8b87e0";
export const CROSSLINK_WIDTH = 1.5;
export const CROSSLINK_DASH = "6 4";

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
