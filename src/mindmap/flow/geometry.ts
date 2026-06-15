// Tiny geometry helpers shared across the flow canvas overlays + the SVG exporter, so the
// "canvas == export" math stays single-source (and the same rounding is used everywhere).

/** An axis-aligned box in flow coordinates (top-left + size). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Round to 2 decimals — keeps emitted SVG coordinates compact + stable. */
export const r2 = (n: number): number => Math.round(n * 100) / 100;
