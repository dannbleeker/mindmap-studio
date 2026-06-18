import type { MapNode, MindMapDoc } from "../../model/types";
import { priorityColor, priorityLabel } from "../../priority";
import { checkPath, piePath } from "../../progress";
import { formatDateShort, isOverdue } from "../../taskDate";
import type { LayoutKind } from "../contract";
import { arrowHeadPath } from "./arrowhead";
import { backdropGeometry } from "./backdrop";
import { type BraceGroup, braceGeometry, bracePath } from "./brace";
import {
  type AttachSide,
  type Box,
  attachSideFor,
  branchEndpoints,
  branchWidths,
  childrenAxis,
  crosslinkBezier,
  elbowPath,
  floatingPoints,
  taperedRibbonPath,
} from "./floating";
import { type Rect, r2 } from "./geometry";
import { type HopSegment, hopPath } from "./lineJumps";
import { project } from "./project";
import { isGeometric, shapeInset, shapeOverlayPath, shapePath } from "./shapes";
import {
  BOUNDARY_PAD,
  BOUNDARY_RADIUS,
  BRACE_STROKE,
  SUMMARY_BRACKET_W,
  SUMMARY_GAP,
  SUMMARY_PAD,
  boundaryLabel,
  levelFontSize,
  readableTextOn,
  resolveBoundaryStyle,
  resolveCalloutStyle,
  resolveLinkStyle,
  resolveSummaryStyle,
  summaryLabel,
} from "./style";
import { wrapText } from "./text";

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

/** A multi-line <text> centred vertically between top..bottom; left-aligned at x, or centred on x
 *  when `anchor` is "middle" (used for the root topic, whose label is horizontally centred). */
function textBlock(
  lines: string[],
  x: number,
  top: number,
  bottom: number,
  fontSize: number,
  color: string,
  weight?: string,
  fontFamily?: string,
  anchor: "start" | "middle" = "start",
): string {
  if (lines.length === 0) return "";
  const lineHeight = fontSize * 1.2;
  const centre = (top + bottom) / 2 + fontSize * 0.34;
  const firstBaseline = centre - ((lines.length - 1) * lineHeight) / 2;
  const w =
    weight && weight !== "400" && weight !== "normal" ? ` font-weight="${esc(weight)}"` : "";
  const anchorAttr = anchor === "middle" ? ` text-anchor="middle"` : "";
  const attrs = `x="${r2(x)}"${anchorAttr} font-family="${esc(fontFamily || "sans-serif")}" font-size="${fontSize}" fill="${esc(color)}"${w}`;
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
  /** Wrapped text lines (the canvas bubble wraps at max-width 180; the export mirrors it). */
  lines: string[];
  /** Per-callout colour override (resolved at emit time so canvas == export). */
  color?: string;
}

/** Walk the model for callouts and resolve each to a bubble box anchored to its node's rect. */
function collectCallouts(doc: MindMapDoc, rects: Map<string, NodeRect>): CalloutBox[] {
  const out: CalloutBox[] = [];
  const walk = (n: MapNode): void => {
    const r = rects.get(n.id);
    if (r) {
      for (const c of n.callouts ?? []) {
        const text = c.text || "…";
        // Wrap like the canvas bubble (max-width 180, padding 8, font 12) and grow the bubble height
        // to the wrapped line count — so a multi-line callout isn't clipped to one strip in the export.
        const lines = wrapText(text, 164, 12);
        const longest = Math.max(1, ...lines.map((l) => l.length));
        out.push({
          ax: r.x + r.w,
          ay: r.y + r.h / 2,
          x: r.x + r.w + c.dx,
          y: r.y + r.h / 2 + c.dy,
          w: Math.max(36, Math.min(180, longest * 6.6 + 16)),
          h: lines.length * 16 + 8,
          text,
          lines,
          color: c.color,
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
  kind: LayoutKind = "side",
): string {
  const { nodes, edges } = project(doc, palette, numbered, kind);
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
    // Per-boundary colours from the SAME resolver the canvas uses (canvas == export).
    const bs = resolveBoundaryStyle(b.color);
    parts.push(
      `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="${BOUNDARY_RADIUS}" fill="${bs.fill}" stroke="${bs.stroke}" stroke-width="1.5"/>`,
    );
    const label = boundaryLabel(b.label);
    if (label) {
      parts.push(
        `<rect x="${r2(x + 12)}" y="${r2(y - 11)}" width="${r2(label.length * 7 + 12)}" height="20" rx="8" fill="${bs.labelBg}" stroke="${bs.labelBorder}"/>`,
        `<text x="${r2(x + 18)}" y="${r2(y + 3)}" font-family="sans-serif" font-size="12" font-weight="600" fill="${bs.labelColor}">${esc(label)}</text>`,
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
    // Per-summary colours from the SAME resolver the canvas uses (canvas == export).
    const ss = resolveSummaryStyle(s.color);
    parts.push(
      `<path d="M ${r2(capX)} ${r2(y0)} L ${r2(spineX)} ${r2(y0)} L ${r2(spineX)} ${r2(y1)} L ${r2(capX)} ${r2(y1)}" fill="none" stroke="${ss.stroke}" stroke-width="2"/>`,
    );
    const label = summaryLabel(s.label);
    const midY = (y0 + y1) / 2;
    const lw = label.length * 7 + 12;
    const lx = onLeft ? spineX - 6 - lw : spineX + 6;
    parts.push(
      `<rect x="${r2(lx)}" y="${r2(midY - 10)}" width="${r2(lw)}" height="20" rx="8" fill="${ss.labelBg}" stroke="${ss.labelBorder}"/>`,
      `<text x="${r2(lx + 6)}" y="${r2(midY + 4)}" font-family="sans-serif" font-size="12" font-weight="600" fill="${ss.labelColor}">${esc(label)}</text>`,
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

  // Branch attach-side per parent — one shared origin per side so sibling branches fan without
  // crossing. Computed from the same rects + helper the canvas uses in sync() (canvas == export).
  const axisByParent = new Map<string, "h" | "v">();
  {
    const kids = new Map<string, NodeRect[]>();
    for (const e of edges) {
      if (e.data?.crosslink) continue;
      const cr = rects.get(e.target);
      if (!cr) continue;
      const a = kids.get(e.source);
      if (a) a.push(cr);
      else kids.set(e.source, [cr]);
    }
    for (const [pid, crs] of kids) {
      const pr = rects.get(pid);
      if (pr) axisByParent.set(pid, childrenAxis(boxOf(pr), crs.map(boxOf)));
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
      // Hopped chord when line-jumps is on; otherwise the gentle S-bezier from the SAME helper the
      // canvas edge uses, so the relationship bows identically on screen and here (canvas == export).
      const self = lineJumps ? hopSegments.find((seg) => seg.id === e.id) : undefined;
      const linePath = self ? hopPath(self, hopSegments) : crosslinkBezier(sx, sy, tx, ty).path;
      const dashAttr = dasharray ? ` stroke-dasharray="${dasharray}"` : "";
      parts.push(
        `<path d="${linePath}" fill="none" stroke="${clColor}" stroke-width="${clWidth}"${dashAttr}/>`,
      );
      // Directional arrowhead(s) — same builder the canvas uses, at whichever end(s) carry one.
      // Arrowhead scales with the line weight (a thick relationship gets a proportionally larger head).
      const headSize = 6 + clWidth * 2;
      if (arrowAtTarget)
        parts.push(`<path d="${arrowHeadPath(tx, ty, sx, sy, headSize)}" fill="${clColor}"/>`);
      if (arrowAtSource)
        parts.push(`<path d="${arrowHeadPath(sx, sy, tx, ty, headSize)}" fill="${clColor}"/>`);
      const label = typeof e.label === "string" ? e.label : "";
      if (label) {
        parts.push(
          `<text x="${r2((sx + tx) / 2)}" y="${r2((sy + ty) / 2 - 4)}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="${clColor}">${esc(label)}</text>`,
        );
      }
    } else if (!braces) {
      // Brace map replaces the tapered ribbons with "{" forks (drawn below), so skip them here.
      const parent = boxOf(sr);
      const child = boxOf(tr);
      const side: AttachSide = attachSideFor(parent, child, axisByParent.get(e.source) ?? "h");
      if (e.data?.elbow) {
        // Org-chart layouts: a uniform right-angle elbow, not the organic taper. The bus is vertical
        // (children in a row below/above the parent), so the side comes from the parent→child
        // direction, not the sibling-spread axis. Same renderer the canvas uses → canvas == export.
        const elbowSide: AttachSide = child.cy >= parent.cy ? "bottom" : "top";
        parts.push(
          `<path d="${elbowPath(parent, child, elbowSide)}" fill="none" stroke="${e.data?.branchColor ?? "#999"}" stroke-width="2" stroke-linejoin="round"/>`,
        );
      } else {
        const ep = branchEndpoints(parent, child, side);
        const { trunk, tip } = branchWidths(e.data?.depth ?? 1);
        const path = taperedRibbonPath(ep.sx, ep.sy, ep.tx, ep.ty, side, trunk, tip);
        parts.push(`<path d="${path}" fill="${e.data?.branchColor ?? "#999"}"/>`);
      }
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
    // Geometric shapes (diamond/ellipse/…) paint an SVG path — the same builder the canvas
    // uses — so the export matches the screen; the rest stay rounded rects. Insets keep text
    // inside a narrowing outline.
    const shape = d.isRoot ? undefined : st?.shape;
    const geom = isGeometric(shape);
    // Level-based styling — mirrors the canvas TopicNode (canvas == export): depth-1 mains are FILLED
    // with the branch colour; depth-3+ leaves drop the box for a branch-colour underline. Manual style
    // (a set background / border) wins and reverts the node to a normal bordered card.
    const filledMain = !d.isRoot && !geom && d.depth === 1 && !st?.background;
    const underlineLeaf = !d.isRoot && !geom && d.depth >= 3 && !st?.background && !st?.border;
    const fill = d.isRoot
      ? rootBg
      : filledMain
        ? d.branchColor
        : underlineLeaf
          ? "none"
          : (st?.background ?? nodeBg);
    const textColor = d.isRoot
      ? rootColor
      : (st?.color ?? (filledMain ? readableTextOn(d.branchColor) : color));
    const radius = d.isRoot
      ? 16
      : underlineLeaf
        ? 0
        : Number.parseFloat(st?.borderRadius ?? "11") || 11;
    const border = st?.border
      ? parseBorder(st.border)
      : d.isRoot || filledMain || underlineLeaf
        ? null
        : { width: 1.5, color: d.branchColor };
    const strokeAttr = border
      ? ` stroke="${esc(border.color)}" stroke-width="${border.width}"`
      : "";
    const ins = isGeometric(shape) ? shapeInset(shape) : { left: 0, right: 0, top: 0, bottom: 0 };
    if (isGeometric(shape)) {
      parts.push(
        `<path d="${shapePath(shape, r.x, r.y, r.w, r.h)}" fill="${esc(fill)}"${strokeAttr}/>`,
      );
      const ov = shapeOverlayPath(shape, r.x, r.y, r.w, r.h);
      if (ov) parts.push(`<path d="${ov}" fill="none"${strokeAttr}/>`);
    } else if (underlineLeaf) {
      // No box — a short branch-colour underline under the text (matches the canvas border-bottom).
      parts.push(
        `<line x1="${r2(r.x + 2)}" y1="${r2(r.y + r.h - 1)}" x2="${r2(r.x + r.w - 2)}" y2="${r2(r.y + r.h - 1)}" stroke="${esc(d.branchColor)}" stroke-width="2"/>`,
      );
    } else {
      parts.push(
        `<rect x="${r2(r.x)}" y="${r2(r.y)}" width="${r2(r.w)}" height="${r2(r.h)}" rx="${radius}" fill="${esc(fill)}"${strokeAttr}/>`,
      );
    }

    let textTop = r.y + ins.top;
    if (d.image) {
      // Clamp to the same caps the canvas uses (max 200×140, and never wider than the box) so the
      // image renders at the same size on screen and in the export (canvas == export).
      const iw = Math.min(d.image.width ?? 120, 200, r.w - 2 * pad);
      const ih = Math.min(d.image.height ?? 120, 140);
      parts.push(
        `<image x="${r2(r.x + pad)}" y="${r2(r.y + pad)}" width="${r2(iw)}" height="${r2(ih)}" href="${esc(d.image.url)}" preserveAspectRatio="xMidYMid meet"/>`,
      );
      textTop = r.y + pad + ih;
    }

    // The priority/progress/due chips sit in a reserved strip at the bottom; the inline task-info line
    // (start ▸ duration ▸ resources) sits just above them. Both reserved so the title doesn't overlap.
    const taskInfo = [
      d.start ? `▶ ${formatDateShort(d.start)}` : null,
      d.durationDays ? `${d.durationDays}d` : null,
      d.resources?.length ? `@${d.resources.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("   ·   ");
    const chipRow = d.progress || d.due || d.priority || d.attachmentCount ? 20 : 0;
    const pieReserve = chipRow + (taskInfo ? 15 : 0);

    const fontSize = Number.parseFloat(st?.fontSize ?? "") || levelFontSize(d.depth);
    // Wrap to the box's content width — the SAME wrap the canvas gets from CSS max-width — so a long
    // label stays inside its box in the export instead of overflowing (canvas == export).
    const contentW = Math.max(16, r.w - 2 * pad - ins.left - ins.right);
    const lines = wrapText(d.topic, contentW, fontSize);
    if (d.icons?.length) lines[0] = `${d.icons.join(" ")} ${lines[0] ?? ""}`.trim();
    if (d.number) lines[0] = `${d.number} ${lines[0] ?? ""}`.trim();
    const nonEmpty = lines.filter((l) => l.length > 0);
    // Note / hyperlink indicators inline after the title (mirrors the canvas), so the export keeps the
    // "has a note / link" cue it used to drop.
    const ind = `${d.hyperlink ? " 🔗" : ""}${d.note?.trim() ? " 📝" : ""}`;
    if (ind) {
      if (nonEmpty.length > 0) nonEmpty[nonEmpty.length - 1] += ind;
      else nonEmpty.push(ind.trim());
    }
    if (nonEmpty.length > 0) {
      parts.push(
        textBlock(
          nonEmpty,
          r.x + r.w / 2,
          textTop,
          r.y + r.h - pieReserve - ins.bottom,
          fontSize,
          textColor,
          d.isRoot ? "700" : (st?.fontWeight ?? (filledMain ? "600" : undefined)),
          st?.fontFamily,
          "middle",
        ),
      );
    }
    let badgeX = r.x + pad + ins.left;
    if (d.priority) {
      const label = priorityLabel(d.priority);
      const w = label.length * 6.4 + 8;
      parts.push(
        `<rect x="${r2(badgeX)}" y="${r2(r.y + r.h - 20)}" width="${r2(w)}" height="16" rx="5" fill="${priorityColor(d.priority)}"/>`,
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
      badgeX += chipW + 4;
    }
    if (d.attachmentCount) {
      // Attachment count chip — drawn in the export too (the canvas had it; the export dropped it).
      const label = `📎 ${d.attachmentCount}`;
      const chipW = label.length * 6.6 + 8;
      const chipY = r.y + r.h - 20;
      parts.push(
        `<rect x="${r2(badgeX)}" y="${r2(chipY)}" width="${r2(chipW)}" height="16" rx="5" fill="rgba(0,0,0,0.06)"/>`,
        `<text x="${r2(badgeX + 5)}" y="${r2(chipY + 12)}" font-family="sans-serif" font-size="10.5" fill="${esc(textColor)}">${esc(label)}</text>`,
      );
      badgeX += chipW + 4;
    }
    // Inline task-info line (start ▸ duration ▸ resources), just above the chip strip — mirrors the
    // canvas TopicNode line (canvas == export).
    if (taskInfo) {
      parts.push(
        `<text x="${r2(r.x + r.w / 2)}" y="${r2(r.y + r.h - chipRow - 5)}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${esc(textColor)}" opacity="0.65">${esc(taskInfo)}</text>`,
      );
    }
    // Collapsed-branch indicator: a small circle showing the hidden-subtopic count at the box's
    // bottom-right corner — matches the canvas affordance, so an export shows that content is folded
    // away (a collapsed branch no longer looks like a leaf).
    if (d.collapsed && d.hasChildren) {
      const cx = r.x + r.w;
      const cy = r.y + r.h;
      const label = d.hiddenCount ? String(d.hiddenCount) : "+";
      parts.push(
        `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="9" fill="${esc(nodeBg)}" stroke="${esc(d.branchColor)}" stroke-width="1"/>`,
        `<text x="${r2(cx)}" y="${r2(cy + 3.5)}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${esc(d.branchColor)}">${esc(label)}</text>`,
      );
    }
  }

  // Callouts (anchored bubbles, drawn on top): dashed connector + sticky-note bubble + text.
  // Per-callout colours from the SAME resolver the canvas uses (canvas == export).
  for (const c of callouts) {
    const cs = resolveCalloutStyle(c.color);
    const tspans = c.lines
      .map((l, i) => `<tspan x="${r2(c.x + 8)}"${i > 0 ? ` dy="16"` : ""}>${esc(l)}</tspan>`)
      .join("");
    parts.push(
      `<line x1="${r2(c.ax)}" y1="${r2(c.ay)}" x2="${r2(c.x)}" y2="${r2(c.y + 10)}" stroke="${cs.connector}" stroke-width="1.5" stroke-dasharray="3 3"/>`,
      `<rect x="${r2(c.x)}" y="${r2(c.y)}" width="${r2(c.w)}" height="${r2(c.h)}" rx="8" fill="${cs.bg}" stroke="${cs.stroke}"/>`,
      `<text x="${r2(c.x + 8)}" y="${r2(c.y + 15)}" font-family="sans-serif" font-size="12" fill="${cs.text}">${tspans}</text>`,
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
