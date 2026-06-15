import type { Backdrop } from "../../model/types";
import { BACKDROP_STROKE } from "./style";

// Dedicated diagram backdrops (onion / funnel / Venn): a pure geometric frame drawn behind
// freely-positioned topics. One source of truth shared by the canvas overlay (Backdrop.tsx) and
// the SVG exporter, so the screen and the export match. Region *labels* are ordinary topics placed
// at the returned `anchors`, so the frame itself carries no text — only shapes.
//
// All coordinates are absolute flow space, centred on the origin; a builder seeds the topics around
// it (the map's other layouts ignore a backdrop — it only shows in free-canvas mode).

export interface BackdropPrimitive {
  type: "circle" | "path";
  cx?: number;
  cy?: number;
  r?: number;
  d?: string;
  fill: string;
  stroke: string;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BackdropGeometry {
  shapes: BackdropPrimitive[];
  /** One suggested label position per region (a builder drops a topic at each). */
  anchors: { x: number; y: number }[];
  /** Bounding box of the whole frame (drives the overlay svg + the export viewBox). */
  bbox: Rect;
}

const ONION_R = 300; // outer radius
const r2 = (n: number): number => Math.round(n * 100) / 100;

/** The number of rings/stages for onion + funnel (clamped to a sane range); venn is fixed by kind. */
export function backdropRings(b: Backdrop): number {
  if (b.kind === "venn2") return 3;
  if (b.kind === "venn3") return 7;
  return Math.max(2, Math.min(6, b.rings ?? 3));
}

function onion(rings: number): BackdropGeometry {
  const shapes: BackdropPrimitive[] = [];
  const anchors: { x: number; y: number }[] = [];
  for (let i = 0; i < rings; i++) {
    const r = (ONION_R * (rings - i)) / rings; // region 0 = outermost
    shapes.push({ type: "circle", cx: 0, cy: 0, r: r2(r), fill: "none", stroke: BACKDROP_STROKE });
    const rInner = (ONION_R * (rings - i - 1)) / rings;
    anchors.push({ x: 0, y: r2(-(r + rInner) / 2) }); // top-centre of each ring band
  }
  return { shapes, anchors, bbox: { x: -ONION_R, y: -ONION_R, w: 2 * ONION_R, h: 2 * ONION_R } };
}

/** Resolve a backdrop into drawable shapes + label anchors + a bounding box. */
export function backdropGeometry(b: Backdrop): BackdropGeometry {
  const rings = backdropRings(b);
  switch (b.kind) {
    case "onion":
      return onion(rings);
    default:
      // funnel / venn land in later phases; an unknown kind draws nothing.
      return { shapes: [], anchors: [], bbox: { x: 0, y: 0, w: 0, h: 0 } };
  }
}
