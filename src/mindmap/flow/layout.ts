import { hierarchy, tree } from "d3-hierarchy";
import type { FlowEdge, TopicNode } from "./types";

// Position the projected nodes. Phase B ships the default two-sided radial ("side") layout
// — the MindManager look mind-elixir gave us — computed with d3-hierarchy's tidy-tree:
// the root is centred, main branches split left/right by their assigned side, each side a
// horizontal tree growing outward. Floating subtrees stack below. Pure (deterministic given
// node sizes) and unit-tested. Phase C generalises this to org-chart/timeline/fishbone/etc.

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
const ROW_GAP = 18; // vertical gap between sibling slots
const FLOAT_GAP = 48; // gap above each floating subtree

const DEFAULT_SIZE: LayoutSize = { width: 120, height: 36 };

/**
 * Estimate a node's rendered size from its content — used to lay out *before* React Flow has
 * measured the DOM, so the first frame is already positioned (no blank canvas, no dependency
 * on a measurement callback that a hidden/headless tab may not fire). Measured sizes refine
 * it afterwards.
 */
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

/** Compute top-left positions (React Flow node coords) for every node. */
export function computeLayout(
  nodes: TopicNode[],
  edges: FlowEdge[],
  sizeOf: SizeOf = () => DEFAULT_SIZE,
): Map<string, Point> {
  const size = (id: string): LayoutSize => {
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

  // Per-depth column centres, sized to the widest node at each depth so wide nodes don't
  // collide with the next column. Depth comes from the projection (data.depth).
  const maxWidthAtDepth: number[] = [];
  let maxHeight = DEFAULT_SIZE.height;
  for (const n of nodes) {
    if (n.data.floating) continue;
    const s = size(n.id);
    maxWidthAtDepth[n.data.depth] = Math.max(maxWidthAtDepth[n.data.depth] ?? 0, s.width);
    maxHeight = Math.max(maxHeight, s.height);
  }
  const colCenterX: number[] = [0];
  for (let d = 1; d < maxWidthAtDepth.length; d++) {
    colCenterX[d] =
      colCenterX[d - 1] +
      (maxWidthAtDepth[d - 1] ?? 0) / 2 +
      COL_GAP +
      (maxWidthAtDepth[d] ?? 0) / 2;
  }
  const rowSlot = maxHeight + ROW_GAP;

  // Lay out one side (root + the given direct children's subtrees) as a horizontal tidy
  // tree; returns each node's centre y (breadth), with the root translated to y = 0.
  const layoutSide = (rootChildren: string[]): Map<string, number> => {
    const childrenOf = (id: string): string[] =>
      id === root.id ? rootChildren : (branchChildren.get(id) ?? []);
    const h = hierarchy<string>(root.id, childrenOf);
    tree<string>().nodeSize([rowSlot, 1])(h);
    const rootBreadth = h.x ?? 0;
    const centreY = new Map<string, number>();
    for (const d of h.descendants()) centreY.set(d.data, (d.x ?? 0) - rootBreadth);
    return centreY;
  };

  const rootKids = branchChildren.get(root.id) ?? [];
  const rightKids = rootKids.filter((id) => byId.get(id)?.data.side !== "left");
  const leftKids = rootKids.filter((id) => byId.get(id)?.data.side === "left");

  const place = (id: string, centreX: number, centreY: number): void => {
    const s = size(id);
    positions.set(id, { x: centreX - s.width / 2, y: centreY - s.height / 2 });
  };

  // Right half: centres at +colCenterX[depth]. Left half: mirror to −colCenterX[depth].
  for (const [side, kids, sign] of [
    ["right", rightKids, 1],
    ["left", leftKids, -1],
  ] as const) {
    if (kids.length === 0 && side === "left") continue;
    const centreY = layoutSide(kids);
    for (const [id, y] of centreY) {
      if (id === root.id) {
        place(root.id, 0, 0);
        continue;
      }
      const depth = byId.get(id)?.data.depth ?? 1;
      place(id, sign * colCenterX[depth], y);
    }
  }
  if (rootKids.length === 0) place(root.id, 0, 0);

  // Floating subtrees: each a small tidy tree, stacked below the main map.
  const mainBottom = Math.max(
    0,
    ...[...positions.values()].map((p) => p.y),
    ...nodes.filter((n) => !n.data.floating).map((n) => positions.get(n.id)?.y ?? 0),
  );
  let floatY = mainBottom + rowSlot + FLOAT_GAP;
  const floatingRoots = nodes.filter((n) => n.data.floating && !isBranchTarget(n.id, edges));
  for (const fRoot of floatingRoots) {
    const childrenOf = (id: string): string[] => branchChildren.get(id) ?? [];
    const h = hierarchy<string>(fRoot.id, childrenOf);
    tree<string>().nodeSize([rowSlot, 1])(h);
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const d of h.descendants()) {
      minY = Math.min(minY, d.x ?? 0);
      maxY = Math.max(maxY, d.x ?? 0);
    }
    const offset = floatY - minY;
    for (const d of h.descendants()) {
      const depth = d.depth;
      place(
        d.data,
        colCenterX[depth] ?? d.depth * (DEFAULT_SIZE.width + COL_GAP),
        (d.x ?? 0) + offset,
      );
    }
    floatY += maxY - minY + rowSlot + FLOAT_GAP;
  }

  return positions;
}

function isBranchTarget(id: string, edges: FlowEdge[]): boolean {
  return edges.some((e) => !e.data?.crosslink && e.target === id);
}
