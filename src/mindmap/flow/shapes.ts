import type { NodeShape } from "../../model/types";

// Pure node-shape geometry, shared by the on-canvas backdrop (TopicNode), the SVG exporter
// (exportSvg), and the style-picker icons (Panels) so the screen, the export, and the picker
// stay identical. The everyday rounded-rect / box / pill cases stay plain CSS rounded
// rectangles; the "geometric" shapes are painted as an SVG <path> sized to the node box.
// Flowchart vocabulary: diamond = decision, parallelogram = input/output, hexagon =
// preparation, cylinder = data store, ellipse = terminator/start-end.

const GEOMETRIC: ReadonlySet<string> = new Set([
  "ellipse",
  "diamond",
  "parallelogram",
  "hexagon",
  "cylinder",
]);

/** True when the shape is painted as an SVG path (vs a CSS rounded rectangle). */
export function isGeometric(shape: NodeShape | undefined): shape is NodeShape {
  return shape != null && GEOMETRIC.has(shape);
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Extra padding (px) so a topic's text stays inside a narrowing shape. */
export interface ShapeInset {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
const NO_INSET: ShapeInset = { left: 0, right: 0, top: 0, bottom: 0 };

export function shapeInset(shape: NodeShape | undefined): ShapeInset {
  switch (shape) {
    case "diamond":
      return { left: 22, right: 22, top: 12, bottom: 12 };
    case "parallelogram":
      return { left: 16, right: 16, top: 0, bottom: 0 };
    case "hexagon":
      return { left: 18, right: 18, top: 0, bottom: 0 };
    case "ellipse":
      return { left: 14, right: 14, top: 6, bottom: 6 };
    case "cylinder":
      return { left: 4, right: 4, top: 12, bottom: 8 };
    default:
      return NO_INSET;
  }
}

function cylinderRy(h: number): number {
  return Math.min(h * 0.16, 12);
}

/** The fill+stroke outline for a geometric shape, as an SVG path `d` (absolute coords). */
export function shapePath(shape: NodeShape, x: number, y: number, w: number, h: number): string {
  const x2 = x + w;
  const y2 = y + h;
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (shape) {
    case "diamond":
      return `M ${r2(cx)} ${r2(y)} L ${r2(x2)} ${r2(cy)} L ${r2(cx)} ${r2(y2)} L ${r2(x)} ${r2(cy)} Z`;
    case "parallelogram": {
      const s = Math.min(w * 0.22, h * 0.8);
      return `M ${r2(x + s)} ${r2(y)} L ${r2(x2)} ${r2(y)} L ${r2(x2 - s)} ${r2(y2)} L ${r2(x)} ${r2(y2)} Z`;
    }
    case "hexagon": {
      const c = Math.min(w * 0.16, h * 0.5);
      return `M ${r2(x + c)} ${r2(y)} L ${r2(x2 - c)} ${r2(y)} L ${r2(x2)} ${r2(cy)} L ${r2(x2 - c)} ${r2(y2)} L ${r2(x + c)} ${r2(y2)} L ${r2(x)} ${r2(cy)} Z`;
    }
    case "ellipse": {
      const rx = w / 2;
      const ry = h / 2;
      // A full ellipse as two semicircular arcs (so it shares the <path> pipeline).
      return `M ${r2(x)} ${r2(cy)} A ${r2(rx)} ${r2(ry)} 0 1 0 ${r2(x2)} ${r2(cy)} A ${r2(rx)} ${r2(ry)} 0 1 0 ${r2(x)} ${r2(cy)} Z`;
    }
    case "cylinder": {
      const ry = cylinderRy(h);
      const rx = w / 2;
      return `M ${r2(x)} ${r2(y + ry)} A ${r2(rx)} ${r2(ry)} 0 0 1 ${r2(x2)} ${r2(y + ry)} L ${r2(x2)} ${r2(y2 - ry)} A ${r2(rx)} ${r2(ry)} 0 0 1 ${r2(x)} ${r2(y2 - ry)} Z`;
    }
    default:
      return `M ${r2(x)} ${r2(y)} L ${r2(x2)} ${r2(y)} L ${r2(x2)} ${r2(y2)} L ${r2(x)} ${r2(y2)} Z`;
  }
}

/** An extra stroke-only path drawn over the fill (the cylinder's front lip); null otherwise. */
export function shapeOverlayPath(
  shape: NodeShape,
  x: number,
  y: number,
  w: number,
  h: number,
): string | null {
  if (shape !== "cylinder") return null;
  const ry = cylinderRy(h);
  const rx = w / 2;
  return `M ${r2(x)} ${r2(y + ry)} A ${r2(rx)} ${r2(ry)} 0 0 0 ${r2(x + w)} ${r2(y + ry)}`;
}
