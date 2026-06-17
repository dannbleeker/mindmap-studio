import type { MapNode, MindMapDoc } from "../../model/types";
import { PRIORITY_COLOR, PRIORITY_LABEL } from "../../priority";
import { checkPath, piePath } from "../../progress";
import { formatDateShort, isOverdue } from "../../taskDate";
import { taperedRibbonPath } from "./BranchEdge";
import { arrowHeadPath } from "./arrowhead";
import { backdropGeometry } from "./backdrop";
import { type BraceGroup, braceGeometry, bracePath } from "./brace";
import { type Box, floatingPoints } from "./floating";
import { type Rect, r2 } from "./geometry";
import { type HopSegment, hopPath } from "./lineJumps";
import { project } from "./project";
import { isGeometric, shapeInset, shapeOverlayPath, shapePath } from "./shapes";
import {
  BOUNDARY_FILL,
  BOUNDARY_LABEL_BG,
  BOUNDARY_LABEL_BORDER,
  BOUNDARY_LABEL_COLOR,
  BOUNDARY_PAD,
  BOUNDARY_RADIUS,
  BOUNDARY_STROKE,
  BRACE_STROKE,
  CALLOUT_BG,
  CALLOUT_STROKE,
  CALLOUT_TEXT,
  SUMMARY_BRACKET_W,
  SUMMARY_GAP,
  SUMMARY_LABEL_BG,
  SUMMARY_LABEL_BORDER,
  SUMMARY_LABEL_COLOR,
  SUMMARY_PAD,
  SUMMARY_STROKE,
  boundaryLabel,
  resolveLinkStyle,
  summaryLabel,
} from "./style";

// Author a clean, standalone SVG of the map directly from the canonical model + the live
// node rects — emitting native <text> from the start (no foreignObject), so it renders
// everywhere and flows through useMapExports.cleanSvg() (sanitizeSvg stays the XSS guard,
// inlineSvgText becomes a harmless pass-through). It reuses the canvas's own tapered-ribbon
// and floating-edge geometry — and the boundary/cross-link colours from ./style — so the
// export matches the screen, and it carries arrow + boundary *labels* (which a foreignObject-
// based export drops).

/** A node's on-screen box, the export's input (alias of the shared Rect). */
export type NodeRect = Rect;

// Exporter-specific spacing: text/image insets inside a node box, and the viewBox margin.
const PAD = 12;
const ROOT_PAD = 18;
/** Padding around the map bounds in the export viewBox; shared with the on-canvas background-image
 *  layer (BackgroundImage.tsx) so the screen and the export cover the same region — canvas == export. */
export const EXPORT_MARGIN = 40;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A task-completion pie as an SVG string (mirrors the on-canvas ProgressPie via piePath). */
function pieSvg(cx: number, cy: number, r: number, fraction: number): string {
  const f = Math.max(0, Math.min(1, fraction));
  const fill = f >= 1 ? "#27852f" : "#3b8bd4";
  const base = `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="#fff" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>`;
  if (f >= 1) {
    const tick = `<path d="${checkPath(cx, cy, r)}" fill="none" stroke="#fff" stroke-width="${r2(Math.max(1.2, r * 0.3))}" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `${base}<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${fill}"/>${tick}`;
  }
  if (f <= 0) return base;
  return `${base}<path d="${piePath(cx, cy, r, f)}" fill="${fill}"/>`;
}

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
  fontFamily?: string,
): string {
  if (lines.length === 0) return "";
  const lineHeight = fontSize * 1.2;
  const centre = (top + bottom) / 2 + fontSize * 0.34;
  const firstBaseline = centre - ((lines.length - 1) * lineHeight) / 2;
  const w =
    weight && weight !== "400" && weight !== "normal" ? ` font-weight="${esc(weight)}"` : "";
  const attrs = `x="${r2(x)}" font-family="${esc(fontFamily || "sans-serif")}" font-size="${fontSize}" fill="${esc(color)}"${w}`;
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
  today = "",
  braces?: BraceGroup[],
): string {
  const { nodes, edges } = project(doc, palette, numbered);
  const callouts = collectCallouts(doc, rects);
  const bd = doc.backdrop ? backdropGeometry(doc.backdrop) : null;
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
  if (bd && bd.shapes.length > 0) {
    minX = Math.min(minX, bd.bbox.x);
    minY = Math.min(minY, bd.bbox.y);
    maxX = Math.max(maxX, bd.bbox.x + bd.bbox.w);
    maxY = Math.max(maxY, bd.bbox.y + bd.bbox.h);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }
  const vbX = minX - EXPORT_MARGIN;
  const vbY = minY - EXPORT_MARGIN;
  const vbW = maxX - minX + 2 * EXPORT_MARGIN;
  const vbH = maxY - minY + 2 * EXPORT_MARGIN;

  const parts: string[] = [];

  // Dedicated diagram backdrop (onion / funnel / Venn frame), behind everything else.
  if (bd) {
    for (const s of bd.shapes) {
      parts.push(
        s.type === "circle"
          ? `<circle cx="${r2(s.cx ?? 0)}" cy="${r2(s.cy ?? 0)}" r="${r2(s.r ?? 0)}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="2"/>`
          : `<path d="${s.d ?? ""}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="2"/>`,
      );
    }
  }

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

  // Summary brackets (a bracket + label to one side of a node's subtree).
  const rootRect = rects.get(doc.root.id);
  const rootCenterX = rootRect ? rootRect.x + rootRect.w / 2 : 0;
  for (const s of doc.summaries ?? []) {
    let sx = Number.POSITIVE_INFINITY;
    let sy = Number.POSITIVE_INFINITY;
    let sX = Number.NEGATIVE_INFINITY;
    let sY = Number.NEGATIVE_INFINITY;
    let found = 0;
    for (const id of s.nodeIds) {
      const r = rects.get(id);
      if (!r) continue;
      sx = Math.min(sx, r.x);
      sy = Math.min(sy, r.y);
      sX = Math.max(sX, r.x + r.w);
      sY = Math.max(sY, r.y + r.h);
      found += 1;
    }
    if (found === 0) continue;
    const onLeft = (sx + sX) / 2 < rootCenterX;
    const y0 = sy - SUMMARY_PAD;
    const y1 = sY + SUMMARY_PAD;
    // Spine + caps: a "]" on the right (caps reach left toward the nodes) or "[" on the left.
    const spineX = onLeft ? sx - SUMMARY_GAP : sX + SUMMARY_GAP;
    const capX = onLeft ? spineX + SUMMARY_BRACKET_W : spineX - SUMMARY_BRACKET_W;
    parts.push(
      `<path d="M ${r2(capX)} ${r2(y0)} L ${r2(spineX)} ${r2(y0)} L ${r2(spineX)} ${r2(y1)} L ${r2(capX)} ${r2(y1)}" fill="none" stroke="${SUMMARY_STROKE}" stroke-width="2"/>`,
    );
    const label = summaryLabel(s.label);
    const midY = (y0 + y1) / 2;
    const lw = label.length * 7 + 12;
    const lx = onLeft ? spineX - 6 - lw : spineX + 6;
    parts.push(
      `<rect x="${r2(lx)}" y="${r2(midY - 10)}" width="${r2(lw)}" height="20" rx="8" fill="${SUMMARY_LABEL_BG}" stroke="${SUMMARY_LABEL_BORDER}"/>`,
      `<text x="${r2(lx + 6)}" y="${r2(midY + 4)}" font-family="sans-serif" font-size="12" font-weight="600" fill="${SUMMARY_LABEL_COLOR}">${esc(label)}</text>`,
    );
  }

  // Line-jumps: when on, every relationship line is drawn as its chord with semicircular hops cut
  // in at crossings — from the shared helper the canvas edge also uses (canvas == export). Build all
  // relationship chords up front, in the same crosslink order the canvas sees (doc.links order, the
  // order project() emits them), so the deterministic hopper choice matches the screen.
  const lineJumps = Boolean(doc.meta?.lineJumps);
  const hopSegments: HopSegment[] = [];
  if (lineJumps) {
    let order = 0;
    for (const e of edges) {
      if (!e.data?.crosslink) continue;
      const sr = rects.get(e.source);
      const tr = rects.get(e.target);
      if (!sr || !tr) continue;
      const { sx, sy, tx, ty } = floatingPoints(boxOf(sr), boxOf(tr));
      hopSegments.push({
        id: e.id,
        order: order++,
        sx,
        sy,
        tx,
        ty,
        fromId: e.source,
        toId: e.target,
      });
    }
  }

  // Edges.
  for (const e of edges) {
    const sr = rects.get(e.source);
    const tr = rects.get(e.target);
    if (!sr || !tr) continue;
    const { sx, sy, tx, ty } = floatingPoints(boxOf(sr), boxOf(tr));
    if (e.data?.crosslink) {
      // Resolve colour / width / dash + arrow placement from the SAME helper the canvas edge uses,
      // so a styled relationship exports byte-for-byte identically (canvas == export).
      const {
        color: clColor,
        width: clWidth,
        dasharray,
        arrowAtTarget,
        arrowAtSource,
      } = resolveLinkStyle(e.data);
      // Hopped chord when line-jumps is on; otherwise the gentle S-bezier.
      const self = lineJumps ? hopSegments.find((seg) => seg.id === e.id) : undefined;
      const linePath = self
        ? hopPath(self, hopSegments)
        : (() => {
            const mx = (sx + tx) / 2;
            return `M ${r2(sx)} ${r2(sy)} C ${r2(mx)} ${r2(sy)} ${r2(mx)} ${r2(ty)} ${r2(tx)} ${r2(ty)}`;
          })();
      const dashAttr = dasharray ? ` stroke-dasharray="${dasharray}"` : "";
      parts.push(
        `<path d="${linePath}" fill="none" stroke="${clColor}" stroke-width="${clWidth}"${dashAttr}/>`,
      );
      // Directional arrowhead(s) — same builder the canvas uses, at whichever end(s) carry one.
      if (arrowAtTarget)
        parts.push(`<path d="${arrowHeadPath(tx, ty, sx, sy)}" fill="${clColor}"/>`);
      if (arrowAtSource)
        parts.push(`<path d="${arrowHeadPath(sx, sy, tx, ty)}" fill="${clColor}"/>`);
      const label = typeof e.label === "string" ? e.label : "";
      if (label) {
        parts.push(
          `<text x="${r2((sx + tx) / 2)}" y="${r2((sy + ty) / 2 - 4)}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="${clColor}">${esc(label)}</text>`,
        );
      }
    } else if (!braces) {
      // Brace map replaces the tapered ribbons with "{" forks (drawn below), so skip them here.
      const path = taperedRibbonPath(sx, sy, tx, ty, e.data?.depth ?? 1);
      parts.push(`<path d="${path}" fill="${e.data?.branchColor ?? "#999"}"/>`);
    }
  }

  // Brace-map fork connectors (one per parent), from the shared geometry — canvas == export.
  if (braces) {
    for (const b of braces) {
      const parent = rects.get(b.parentId);
      const kids = b.childIds.map((id) => rects.get(id)).filter((rr): rr is NodeRect => !!rr);
      if (!parent || kids.length === 0) continue;
      parts.push(
        `<path d="${bracePath(braceGeometry(parent, kids))}" fill="none" stroke="${BRACE_STROKE}" stroke-width="2"/>`,
      );
    }
  }

  // Nodes.
  for (const n of nodes) {
    const r = rects.get(n.id);
    if (!r) continue;
    const d = n.data;
    // Conditional-formatting style sits under the node's own style (manual wins) — matches the canvas.
    const st = d.condStyle ? { ...d.condStyle, ...d.style } : d.style;
    const pad = d.isRoot ? ROOT_PAD : PAD;
    const fill = d.isRoot ? rootBg : (st?.background ?? nodeBg);
    const textColor = d.isRoot ? rootColor : (st?.color ?? color);
    // Card radii + default branch border match the canvas TopicNode (canvas == export).
    const radius = d.isRoot ? 14 : Number.parseFloat(st?.borderRadius ?? "11") || 11;
    const border = d.isRoot
      ? null
      : (parseBorder(st?.border) ?? { width: 1.5, color: d.branchColor });
    const strokeAttr = border
      ? ` stroke="${esc(border.color)}" stroke-width="${border.width}"`
      : "";
    // Geometric shapes (diamond/ellipse/…) paint an SVG path — the same builder the canvas
    // uses — so the export matches the screen; the rest stay rounded rects. Insets keep text
    // inside a narrowing outline.
    const shape = d.isRoot ? undefined : st?.shape;
    const ins = isGeometric(shape) ? shapeInset(shape) : { left: 0, right: 0, top: 0, bottom: 0 };
    if (isGeometric(shape)) {
      parts.push(
        `<path d="${shapePath(shape, r.x, r.y, r.w, r.h)}" fill="${esc(fill)}"${strokeAttr}/>`,
      );
      const ov = shapeOverlayPath(shape, r.x, r.y, r.w, r.h);
      if (ov) parts.push(`<path d="${ov}" fill="none"${strokeAttr}/>`);
    } else {
      parts.push(
        `<rect x="${r2(r.x)}" y="${r2(r.y)}" width="${r2(r.w)}" height="${r2(r.h)}" rx="${radius}" fill="${esc(fill)}"${strokeAttr}/>`,
      );
    }

    let textTop = r.y + ins.top;
    if (d.image) {
      const iw = Math.min(r.w - 2 * pad, d.image.width ?? 120);
      const ih = d.image.height ?? 120;
      parts.push(
        `<image x="${r2(r.x + pad)}" y="${r2(r.y + pad)}" width="${r2(iw)}" height="${r2(ih)}" href="${esc(d.image.url)}" preserveAspectRatio="xMidYMid meet"/>`,
      );
      textTop = r.y + pad + ih;
    }

    // The task pie + due-date chip sit in a reserved strip at the bottom (matches the canvas badge).
    const pieReserve = d.progress || d.due || d.priority ? 20 : 0;

    const fontSize = Number.parseFloat(st?.fontSize ?? "") || 16;
    const lines = d.topic.split("\n").map((l) => l.trim());
    if (d.icons?.length) lines[0] = `${d.icons.join(" ")} ${lines[0] ?? ""}`.trim();
    if (d.number) lines[0] = `${d.number} ${lines[0] ?? ""}`.trim();
    const nonEmpty = lines.filter((l) => l.length > 0);
    if (nonEmpty.length > 0) {
      parts.push(
        textBlock(
          nonEmpty,
          r.x + pad + ins.left,
          textTop,
          r.y + r.h - pieReserve - ins.bottom,
          fontSize,
          textColor,
          d.isRoot ? "700" : st?.fontWeight,
          st?.fontFamily,
        ),
      );
    }
    let badgeX = r.x + pad + ins.left;
    if (d.priority) {
      const label = PRIORITY_LABEL[d.priority] ?? "?";
      const w = label.length * 6.4 + 8;
      parts.push(
        `<rect x="${r2(badgeX)}" y="${r2(r.y + r.h - 20)}" width="${r2(w)}" height="16" rx="5" fill="${PRIORITY_COLOR[d.priority] ?? "#888"}"/>`,
        `<text x="${r2(badgeX + 4)}" y="${r2(r.y + r.h - 8)}" font-family="sans-serif" font-size="10.5" font-weight="600" fill="#ffffff">${esc(label)}</text>`,
      );
      badgeX += w + 4;
    }
    if (d.progress) {
      parts.push(pieSvg(badgeX + 8, r.y + r.h - 12, 8, d.progress.progress));
      badgeX += 22;
    }
    if (d.due) {
      const over = isOverdue(d.due, d.progress?.progress ?? 0, today);
      const label = formatDateShort(d.due);
      const chipW = label.length * 6.2 + 10;
      const chipY = r.y + r.h - 20;
      parts.push(
        `<rect x="${r2(badgeX)}" y="${r2(chipY)}" width="${r2(chipW)}" height="16" rx="5" fill="${over ? "#fde2e2" : "rgba(0,0,0,0.06)"}"/>`,
        `<text x="${r2(badgeX + 5)}" y="${r2(chipY + 12)}" font-family="sans-serif" font-size="10.5" fill="${over ? "#b42318" : esc(textColor)}">${esc(label)}</text>`,
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

  // Per-map background image (a data: URL): an <image> covering the whole viewBox, on top of the
  // page-background rect but beneath every node/edge/boundary — mirrors the on-canvas layer so
  // png/svg/html/pdf all carry it. preserveAspectRatio "slice" = CSS object-fit:cover (canvas == export).
  const bgImage = doc.meta?.backgroundImage
    ? `<image x="${r2(vbX)}" y="${r2(vbY)}" width="${r2(vbW)}" height="${r2(vbH)}" href="${esc(doc.meta.backgroundImage)}" preserveAspectRatio="xMidYMid slice"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r2(vbX)} ${r2(vbY)} ${r2(vbW)} ${r2(vbH)}" width="${r2(vbW)}" height="${r2(vbH)}"><rect x="${r2(vbX)}" y="${r2(vbY)}" width="${r2(vbW)}" height="${r2(vbH)}" fill="${esc(pageBg)}"/>${bgImage}${parts.join("")}</svg>`;
}
