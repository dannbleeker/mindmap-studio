import type { MapNode, MindMapDoc } from "../../model/types";
import { taperedRibbonPath } from "./BranchEdge";
import { type Box, floatingPoints } from "./floating";
import { project } from "./project";
import {
  BOUNDARY_FILL,
  BOUNDARY_LABEL_BG,
  BOUNDARY_LABEL_BORDER,
  BOUNDARY_LABEL_COLOR,
  BOUNDARY_PAD,
  BOUNDARY_RADIUS,
  BOUNDARY_STROKE,
  CALLOUT_BG,
  CALLOUT_STROKE,
  CALLOUT_TEXT,
  CROSSLINK_COLOR,
  CROSSLINK_DASH,
  CROSSLINK_WIDTH,
  boundaryLabel,
} from "./style";

// Author a clean, standalone SVG of the map directly from the canonical model + the live
// node rects — emitting native <text> from the start (no foreignObject), so it renders
// everywhere and flows through useMapExports.cleanSvg() (sanitizeSvg stays the XSS guard,
// inlineSvgText becomes a harmless pass-through). It reuses the canvas's own tapered-ribbon
// and floating-edge geometry — and the boundary/cross-link colours from ./style — so the
// export matches the screen, and it carries arrow + boundary *labels* (which a foreignObject-
// based export drops).

export interface NodeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Exporter-specific spacing: text/image insets inside a node box, and the viewBox margin.
const PAD = 12;
const ROOT_PAD = 18;
const MARGIN = 40;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

function boxOf(rect: NodeRect): Box {
  return { cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2, w: rect.w, h: rect.h };
}

/** Parse a CSS border shorthand ("2px solid #e23") into width + colour. */
function parseBorder(border: string | undefined): { width: number; color: string } | null {
  if (!border) return null;
  const width = Number.parseFloat(border) || 2;
  const color = border.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/i)?.[0] ?? null;
  return color ? { width, color } : null;
}

/** A multi-line <text> centred vertically between top..bottom, left-aligned at x. */
function textBlock(
  lines: string[],
  x: number,
  top: number,
  bottom: number,
  fontSize: number,
  color: string,
  weight?: string,
): string {
  if (lines.length === 0) return "";
  const lineHeight = fontSize * 1.2;
  const centre = (top + bottom) / 2 + fontSize * 0.34;
  const firstBaseline = centre - ((lines.length - 1) * lineHeight) / 2;
  const w =
    weight && weight !== "400" && weight !== "normal" ? ` font-weight="${esc(weight)}"` : "";
  const attrs = `x="${r2(x)}" font-family="sans-serif" font-size="${fontSize}" fill="${esc(color)}"${w}`;
  if (lines.length === 1) {
    return `<text ${attrs} y="${r2(firstBaseline)}">${esc(lines[0])}</text>`;
  }
  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${r2(x)}"${i > 0 ? ` dy="${r2(lineHeight)}"` : ""}>${esc(line)}</tspan>`,
    )
    .join("");
  return `<text ${attrs} y="${r2(firstBaseline)}">${tspans}</text>`;
}

interface CalloutBox {
  ax: number; // node anchor (right-centre)
  ay: number;
  x: number; // bubble rect
  y: number;
  w: number;
  h: number;
  text: string;
}

/** Walk the model for callouts and resolve each to a bubble box anchored to its node's rect. */
function collectCallouts(doc: MindMapDoc, rects: Map<string, NodeRect>): CalloutBox[] {
  const out: CalloutBox[] = [];
  const walk = (n: MapNode): void => {
    const r = rects.get(n.id);
    if (r) {
      for (const c of n.callouts ?? []) {
        const text = c.text || "…";
        out.push({
          ax: r.x + r.w,
          ay: r.y + r.h / 2,
          x: r.x + r.w + c.dx,
          y: r.y + r.h / 2 + c.dy,
          w: Math.max(36, text.length * 6.6 + 16),
          h: 22,
          text,
        });
      }
    }
    for (const child of n.children) walk(child);
  };
  walk(doc.root);
  for (const f of doc.floatingTopics ?? []) walk(f);
  return out;
}

export function buildFlowSvg(
  doc: MindMapDoc,
  rects: Map<string, NodeRect>,
  palette: string[],
  cssVar: Record<string, string>,
  numbered = false,
): string {
  const { nodes, edges } = project(doc, palette, numbered);
  const callouts = collectCallouts(doc, rects);
  const nodeBg = cssVar["--bgcolor"] ?? "#ffffff";
  const color = cssVar["--color"] ?? "#2c2c2a";
  const rootBg = cssVar["--root-bgcolor"] ?? "#26215c";
  const rootColor = cssVar["--root-color"] ?? "#ffffff";
  const pageBg = doc.meta?.background || cssVar["--main-bgcolor"] || "#ffffff";

  // Overall bounds (nodes + boundaries + callouts), padded.
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const r of rects.values()) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  for (const c of callouts) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x + c.w);
    maxY = Math.max(maxY, c.y + c.h);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }
  const vbX = minX - MARGIN;
  const vbY = minY - MARGIN;
  const vbW = maxX - minX + 2 * MARGIN;
  const vbH = maxY - minY + 2 * MARGIN;

  const parts: string[] = [];

  // Boundaries (behind everything).
  for (const b of doc.boundaries ?? []) {
    let bx = Number.POSITIVE_INFINITY;
    let by = Number.POSITIVE_INFINITY;
    let bX = Number.NEGATIVE_INFINITY;
    let bY = Number.NEGATIVE_INFINITY;
    let found = 0;
    for (const id of b.nodeIds) {
      const r = rects.get(id);
      if (!r) continue;
      bx = Math.min(bx, r.x);
      by = Math.min(by, r.y);
      bX = Math.max(bX, r.x + r.w);
      bY = Math.max(bY, r.y + r.h);
      found += 1;
    }
    if (found === 0) continue;
    const x = bx - BOUNDARY_PAD;
    const y = by - BOUNDARY_PAD;
    const w = bX - bx + 2 * BOUNDARY_PAD;
    const h = bY - by + 2 * BOUNDARY_PAD;
    parts.push(
      `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="${BOUNDARY_RADIUS}" fill="${BOUNDARY_FILL}" stroke="${BOUNDARY_STROKE}" stroke-width="1.5"/>`,
    );
    const label = boundaryLabel(b.label);
    if (label) {
      parts.push(
        `<rect x="${r2(x + 12)}" y="${r2(y - 11)}" width="${r2(label.length * 7 + 12)}" height="20" rx="8" fill="${BOUNDARY_LABEL_BG}" stroke="${BOUNDARY_LABEL_BORDER}"/>`,
        `<text x="${r2(x + 18)}" y="${r2(y + 3)}" font-family="sans-serif" font-size="12" font-weight="600" fill="${BOUNDARY_LABEL_COLOR}">${esc(label)}</text>`,
      );
    }
  }

  // Edges.
  for (const e of edges) {
    const sr = rects.get(e.source);
    const tr = rects.get(e.target);
    if (!sr || !tr) continue;
    const { sx, sy, tx, ty } = floatingPoints(boxOf(sr), boxOf(tr));
    if (e.data?.crosslink) {
      const mx = (sx + tx) / 2;
      const clColor = e.data.branchColor ?? CROSSLINK_COLOR;
      parts.push(
        `<path d="M ${r2(sx)} ${r2(sy)} C ${r2(mx)} ${r2(sy)} ${r2(mx)} ${r2(ty)} ${r2(tx)} ${r2(ty)}" fill="none" stroke="${clColor}" stroke-width="${CROSSLINK_WIDTH}" stroke-dasharray="${CROSSLINK_DASH}"/>`,
      );
      const label = typeof e.label === "string" ? e.label : "";
      if (label) {
        parts.push(
          `<text x="${r2((sx + tx) / 2)}" y="${r2((sy + ty) / 2 - 4)}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="${clColor}">${esc(label)}</text>`,
        );
      }
    } else {
      const path = taperedRibbonPath(sx, sy, tx, ty, e.data?.depth ?? 1);
      parts.push(`<path d="${path}" fill="${e.data?.branchColor ?? "#999"}"/>`);
    }
  }

  // Nodes.
  for (const n of nodes) {
    const r = rects.get(n.id);
    if (!r) continue;
    const d = n.data;
    const pad = d.isRoot ? ROOT_PAD : PAD;
    const fill = d.isRoot ? rootBg : (d.style?.background ?? nodeBg);
    const textColor = d.isRoot ? rootColor : (d.style?.color ?? color);
    const radius = d.isRoot ? 22 : Number.parseFloat(d.style?.borderRadius ?? "16") || 16;
    const border = d.isRoot
      ? null
      : (parseBorder(d.style?.border) ?? { width: 2, color: d.branchColor });
    const strokeAttr = border
      ? ` stroke="${esc(border.color)}" stroke-width="${border.width}"`
      : "";
    parts.push(
      `<rect x="${r2(r.x)}" y="${r2(r.y)}" width="${r2(r.w)}" height="${r2(r.h)}" rx="${radius}" fill="${esc(fill)}"${strokeAttr}/>`,
    );

    let textTop = r.y;
    if (d.image) {
      const iw = Math.min(r.w - 2 * pad, d.image.width ?? 120);
      const ih = d.image.height ?? 120;
      parts.push(
        `<image x="${r2(r.x + pad)}" y="${r2(r.y + pad)}" width="${r2(iw)}" height="${r2(ih)}" href="${esc(d.image.url)}" preserveAspectRatio="xMidYMid meet"/>`,
      );
      textTop = r.y + pad + ih;
    }

    const fontSize = Number.parseFloat(d.style?.fontSize ?? "") || 16;
    const lines = d.topic.split("\n").map((l) => l.trim());
    if (d.icons?.length) lines[0] = `${d.icons.join(" ")} ${lines[0] ?? ""}`.trim();
    if (d.number) lines[0] = `${d.number} ${lines[0] ?? ""}`.trim();
    const nonEmpty = lines.filter((l) => l.length > 0);
    if (nonEmpty.length > 0) {
      parts.push(
        textBlock(
          nonEmpty,
          r.x + pad,
          textTop,
          r.y + r.h,
          fontSize,
          textColor,
          d.isRoot ? "700" : d.style?.fontWeight,
        ),
      );
    }
  }

  // Callouts (anchored bubbles, drawn on top): dashed connector + sticky-note bubble + text.
  for (const c of callouts) {
    parts.push(
      `<line x1="${r2(c.ax)}" y1="${r2(c.ay)}" x2="${r2(c.x)}" y2="${r2(c.y + 10)}" stroke="${CALLOUT_STROKE}" stroke-width="1.5" stroke-dasharray="3 3"/>`,
      `<rect x="${r2(c.x)}" y="${r2(c.y)}" width="${r2(c.w)}" height="${c.h}" rx="8" fill="${CALLOUT_BG}" stroke="${CALLOUT_STROKE}"/>`,
      `<text x="${r2(c.x + 8)}" y="${r2(c.y + 15)}" font-family="sans-serif" font-size="12" fill="${CALLOUT_TEXT}">${esc(c.text)}</text>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r2(vbX)} ${r2(vbY)} ${r2(vbW)} ${r2(vbH)}" width="${r2(vbW)}" height="${r2(vbH)}"><rect x="${r2(vbX)}" y="${r2(vbY)}" width="${r2(vbW)}" height="${r2(vbH)}" fill="${esc(pageBg)}"/>${parts.join("")}</svg>`;
}
