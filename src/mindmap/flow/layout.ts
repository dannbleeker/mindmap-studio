import { hierarchy, tree } from "d3-hierarchy";
import type { LayoutKind } from "../contract";
import type { FlowEdge, TopicNode } from "./types";

// Position the projected nodes for a given layout. Tree-based kinds (side/left/right/
// org-down/org-up/radial) are tidy trees from d3-hierarchy, oriented differently; timeline
// and fishbone are hand-written. Pure + deterministic given node sizes (unit-tested). This
// is the heart of the alternate-layout feature the engine migration unlocks.

export interface LayoutSize {
  width: number;
  height: number;
}
export type SizeOf = (id: string) => LayoutSize;

export interface Point {
  x: number;
  y: number;
}

const COL_GAP = 64; // horizontal gap between depth columns
const ROW_GAP = 18; // vertical gap between sibling slots (horizontal layouts)
const VROW_GAP = 56; // vertical gap between depth rows (vertical layouts)
const VCOL_GAP = 26; // horizontal gap between siblings (vertical layouts)
const FLOAT_GAP = 48;
const DEFAULT_SIZE: LayoutSize = { width: 120, height: 36 };

/** Estimate a node's rendered size from its content (used before React Flow measures it). */
export function estimateSizeOf(nodes: TopicNode[]): SizeOf {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (id) => {
    const d = byId.get(id)?.data;
    if (!d) return DEFAULT_SIZE;
    const lines = d.topic.split("\n");
    const longest = Math.max(1, ...lines.map((l) => l.length));
    const width = Math.min(320, Math.max(64, longest * 7.3 + 30 + (d.icons?.length ? 18 : 0)));
    const height = (d.image ? 130 : 0) + lines.length * 20 + 16 + (d.tags?.length ? 22 : 0);
    return { width, height };
  };
}

interface Ctx {
  nodes: TopicNode[];
  byId: Map<string, TopicNode>;
  branchChildren: Map<string, string[]>;
  root: TopicNode;
  size: SizeOf;
  positions: Map<string, Point>;
}

export function computeLayout(
  nodes: TopicNode[],
  edges: FlowEdge[],
  sizeOf: SizeOf = () => DEFAULT_SIZE,
  kind: LayoutKind = "side",
): Map<string, Point> {
  const size: SizeOf = (id) => {
    const s = sizeOf(id);
    return { width: s.width || DEFAULT_SIZE.width, height: s.height || DEFAULT_SIZE.height };
  };
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const branchChildren = new Map<string, string[]>();
  for (const e of edges) {
    if (e.data?.crosslink) continue;
    const list = branchChildren.get(e.source) ?? [];
    list.push(e.target);
    branchChildren.set(e.source, list);
  }
  const root = nodes.find((n) => n.data.isRoot);
  const positions = new Map<string, Point>();
  if (!root) return positions;
  const ctx: Ctx = { nodes, byId, branchChildren, root, size, positions };

  switch (kind) {
    case "left":
      layoutHorizontal(ctx, -1, root.data.collapsed ? [] : (branchChildren.get(root.id) ?? []));
      break;
    case "right":
      layoutHorizontal(ctx, 1, root.data.collapsed ? [] : (branchChildren.get(root.id) ?? []));
      break;
    case "org-down":
      layoutVertical(ctx, 1);
      break;
    case "org-up":
      layoutVertical(ctx, -1);
      break;
    case "radial":
      layoutRadial(ctx);
      break;
    case "timeline":
      layoutTimeline(ctx);
      break;
    case "fishbone":
      layoutFishbone(ctx);
      break;
    default:
      layoutSide(ctx);
  }

  placeFloating(ctx, edges);
  return positions;
}

/** A tidy tree's breadth (centre, normalised so the root is 0) + depth per node. */
function tidy(
  rootId: string,
  childrenOf: (id: string) => string[],
  breadthSlot: number,
): Map<string, { breadth: number; depth: number }> {
  const h = hierarchy<string>(rootId, childrenOf);
  tree<string>().nodeSize([breadthSlot, 1])(h);
  const rootBreadth = h.x ?? 0;
  const out = new Map<string, { breadth: number; depth: number }>();
  for (const d of h.descendants())
    out.set(d.data, { breadth: (d.x ?? 0) - rootBreadth, depth: d.depth });
  return out;
}

/** Cumulative centre offset per depth, sized to the widest extent at each depth. */
function depthCenters(maxExtent: number[], gap: number): number[] {
  const centers: number[] = [0];
  for (let d = 1; d < maxExtent.length; d++) {
    centers[d] = centers[d - 1] + (maxExtent[d - 1] ?? 0) / 2 + gap + (maxExtent[d] ?? 0) / 2;
  }
  return centers;
}

function maxExtentAtDepth(ctx: Ctx, axis: "w" | "h"): number[] {
  const out: number[] = [];
  for (const n of ctx.nodes) {
    if (n.data.floating) continue;
    const s = ctx.size(n.id);
    const v = axis === "w" ? s.width : s.height;
    out[n.data.depth] = Math.max(out[n.data.depth] ?? 0, v);
  }
  return out;
}

function place(ctx: Ctx, id: string, cx: number, cy: number): void {
  const s = ctx.size(id);
  ctx.positions.set(id, { x: cx - s.width / 2, y: cy - s.height / 2 });
}

// --- side (two-sided radial, the default) ----------------------------------
function layoutSide(ctx: Ctx): void {
  const { root, branchChildren, byId } = ctx;
  const maxH = Math.max(DEFAULT_SIZE.height, ...maxExtentAtDepth(ctx, "h"));
  const colX = depthCenters(maxExtentAtDepth(ctx, "w"), COL_GAP);
  const slot = maxH + ROW_GAP;
  const kids = root.data.collapsed ? [] : (branchChildren.get(root.id) ?? []);
  const right = kids.filter((id) => byId.get(id)?.data.side !== "left");
  const left = kids.filter((id) => byId.get(id)?.data.side === "left");
  for (const [kidsOnSide, sign] of [
    [right, 1],
    [left, -1],
  ] as const) {
    const breadth = tidy(
      root.id,
      (id) => (id === root.id ? kidsOnSide : (branchChildren.get(id) ?? [])),
      slot,
    );
    for (const [id, b] of breadth) {
      if (id === root.id) place(ctx, root.id, 0, 0);
      else place(ctx, id, sign * (colX[b.depth] ?? b.depth * 200), b.breadth);
    }
  }
  if (kids.length === 0) place(ctx, root.id, 0, 0);
}

// --- left / right (single-sided horizontal tidy tree) ----------------------
function layoutHorizontal(ctx: Ctx, sign: 1 | -1, rootKids: string[]): void {
  const { root, branchChildren } = ctx;
  const maxH = Math.max(DEFAULT_SIZE.height, ...maxExtentAtDepth(ctx, "h"));
  const colX = depthCenters(maxExtentAtDepth(ctx, "w"), COL_GAP);
  const breadth = tidy(
    root.id,
    (id) => (id === root.id ? rootKids : (branchChildren.get(id) ?? [])),
    maxH + ROW_GAP,
  );
  for (const [id, b] of breadth) place(ctx, id, sign * (colX[b.depth] ?? 0), b.breadth);
}

// --- org-down / org-up (vertical tidy tree) --------------------------------
function layoutVertical(ctx: Ctx, sign: 1 | -1): void {
  const { root, branchChildren } = ctx;
  const maxW = Math.max(DEFAULT_SIZE.width, ...maxExtentAtDepth(ctx, "w"));
  const rowY = depthCenters(maxExtentAtDepth(ctx, "h"), VROW_GAP);
  const kids = root.data.collapsed ? [] : (branchChildren.get(root.id) ?? []);
  const breadth = tidy(
    root.id,
    (id) => (id === root.id ? kids : (branchChildren.get(id) ?? [])),
    maxW + VCOL_GAP,
  );
  for (const [id, b] of breadth) place(ctx, id, b.breadth, sign * (rowY[b.depth] ?? 0));
}

// --- radial (hub: root centred, descendants on rings by depth) -------------
function layoutRadial(ctx: Ctx): void {
  const { root, branchChildren, size } = ctx;
  const kids = root.data.collapsed ? [] : (branchChildren.get(root.id) ?? []);
  const h = hierarchy<string>(root.id, (id) =>
    id === root.id ? kids : (branchChildren.get(id) ?? []),
  );
  tree<string>()
    .nodeSize([1, 1])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.5))(h);
  const xs = h.descendants().map((d) => d.x ?? 0);
  const minX = Math.min(...xs);
  const span = Math.max(...xs) - minX || 1;
  let maxNode = DEFAULT_SIZE.width;
  for (const n of ctx.nodes) maxNode = Math.max(maxNode, size(n.id).width, size(n.id).height);
  const ring = maxNode + 90;
  for (const d of h.descendants()) {
    if (d.depth === 0) {
      place(ctx, d.data, 0, 0);
      continue;
    }
    // Leave a small angular gap so the first and last branches don't touch.
    const angle = (((d.x ?? 0) - minX) / span) * 2 * Math.PI * 0.92 - Math.PI / 2;
    const radius = d.depth * ring;
    place(ctx, d.data, radius * Math.cos(angle), radius * Math.sin(angle));
  }
}

// --- timeline (level-1 branches along an axis, subtrees hanging below) ------
function layoutTimeline(ctx: Ctx): void {
  const { root, branchChildren, size } = ctx;
  const kids = root.data.collapsed ? [] : (branchChildren.get(root.id) ?? []);
  const maxW = Math.max(DEFAULT_SIZE.width, ...maxExtentAtDepth(ctx, "w"));
  const rowY = depthCenters(maxExtentAtDepth(ctx, "h"), VROW_GAP);
  let cursorX = 0;
  for (const kid of kids) {
    // Lay this branch out as a vertical (org-down) subtree, then pack it left→right.
    const breadth = tidy(kid, (id) => branchChildren.get(id) ?? [], maxW + VCOL_GAP);
    let minB = Number.POSITIVE_INFINITY;
    let maxB = Number.NEGATIVE_INFINITY;
    for (const b of breadth.values()) {
      minB = Math.min(minB, b.breadth);
      maxB = Math.max(maxB, b.breadth);
    }
    const subWidth = maxB - minB + maxW;
    const offsetX = cursorX - minB + maxW / 2;
    for (const [id, b] of breadth) {
      // depth here is relative to the branch root (kid). Shift down one row (below root).
      place(ctx, id, b.breadth + offsetX, rowY[(b.depth ?? 0) + 1] ?? (b.depth + 1) * 80);
    }
    cursorX += subWidth + COL_GAP;
  }
  // Root sits to the left, vertically centred on the timeline row.
  place(ctx, root.id, -(size(root.id).width / 2 + COL_GAP), rowY[1] ?? 80);
}

// --- fishbone (Ishikawa: spine with diagonal bones) ------------------------
function layoutFishbone(ctx: Ctx): void {
  const { root, branchChildren, size } = ctx;
  const kids = root.data.collapsed ? [] : (branchChildren.get(root.id) ?? []);
  place(ctx, root.id, 0, 0); // head at the right end of the spine
  const spineStep = Math.max(DEFAULT_SIZE.width, ...maxExtentAtDepth(ctx, "w")) + COL_GAP * 1.5;
  const boneRise = 90;
  kids.forEach((kid, i) => {
    const spineX = -((Math.floor(i / 2) + 1) * spineStep);
    const up = i % 2 === 0 ? -1 : 1;
    place(ctx, kid, spineX, up * boneRise);
    // ribs: this branch's children stack further out along the bone.
    const children = branchChildren.get(kid) ?? [];
    children.forEach((c, j) => {
      place(ctx, c, spineX - 30, up * (boneRise + (j + 1) * (size(c).height + 14)));
    });
  });
}

// --- floating subtrees: stacked below whatever the main layout produced -----
function placeFloating(ctx: Ctx, edges: FlowEdge[]): void {
  const { branchChildren, size, positions, nodes } = ctx;
  const floatingRoots = nodes.filter(
    (n) => n.data.floating && !edges.some((e) => !e.data?.crosslink && e.target === n.id),
  );
  if (floatingRoots.length === 0) return;
  const maxW = Math.max(DEFAULT_SIZE.width, ...nodes.map((n) => size(n.id).width));
  const slot = Math.max(DEFAULT_SIZE.height, ...nodes.map((n) => size(n.id).height)) + ROW_GAP;
  let bottom = Math.max(0, ...[...positions.values()].map((p) => p.y));
  for (const fRoot of floatingRoots) {
    const breadth = tidy(fRoot.id, (id) => branchChildren.get(id) ?? [], slot);
    let minB = Number.POSITIVE_INFINITY;
    let maxB = Number.NEGATIVE_INFINITY;
    for (const b of breadth.values()) {
      minB = Math.min(minB, b.breadth);
      maxB = Math.max(maxB, b.breadth);
    }
    const offset = bottom + slot + FLOAT_GAP - minB;
    for (const [id, b] of breadth) place(ctx, id, b.depth * (maxW + COL_GAP), b.breadth + offset);
    bottom += maxB - minB + slot + FLOAT_GAP;
  }
}
