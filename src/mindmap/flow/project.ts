import type { MapNode, MindMapDoc } from "../../model/types";
import type { FlowEdge, TopicNode } from "./types";

// Pure projection: canonical MindMapDoc → React Flow nodes + edges (positions are 0,0
// here; layout.ts assigns them). One node per MapNode; one "branch" edge per parent→child;
// cross-links become "crosslink" edges; floating topics become detached nodes. Branch
// colour follows the palette cycled by root-branch (the MindManager "coloured branch"
// identity). Collapsed subtrees are omitted (the node stays, flagged hasChildren). Pure +
// unit-tested — the read-only render and (later) the SVG export both build on it.

const FALLBACK_PALETTE = [
  "#E8593C",
  "#3B8BD4",
  "#27500A",
  "#BA7517",
  "#72243E",
  "#0C447C",
  "#993C1D",
];
const ROOT_COLOR = "#26215c";
const FLOATING_COLOR = "#73726c";
const CROSSLINK_COLOR = "#8b87e0";

export interface ProjectResult {
  nodes: TopicNode[];
  edges: FlowEdge[];
}

/** Count nodes in a subtree (used to balance the two sides). */
function subtreeSize(node: MapNode): number {
  return 1 + node.children.reduce((sum, c) => sum + subtreeSize(c), 0);
}

/** Assign each root-child to a side: honour an explicit `side`, else balance by subtree size. */
function assignSides(children: MapNode[]): ("left" | "right")[] {
  let left = 0;
  let right = 0;
  return children.map((child) => {
    const size = subtreeSize(child);
    const side = child.side ?? (right <= left ? "right" : "left");
    if (side === "right") right += size;
    else left += size;
    return side;
  });
}

export function project(doc: MindMapDoc, palette: string[] = FALLBACK_PALETTE): ProjectResult {
  const pal = palette.length > 0 ? palette : FALLBACK_PALETTE;
  const nodes: TopicNode[] = [];
  const edges: FlowEdge[] = [];

  const emit = (
    node: MapNode,
    parentId: string | undefined,
    depth: number,
    side: "left" | "right",
    color: string,
    floating: boolean,
    isRoot: boolean,
    recurse = true,
  ): void => {
    nodes.push({
      id: node.id,
      type: "topic",
      position: { x: 0, y: 0 },
      data: {
        topic: node.topic,
        note: node.note,
        hyperlink: node.hyperlink,
        image: node.image,
        icons: node.icons,
        tags: node.tags,
        style: node.style,
        isRoot,
        depth,
        branchColor: color,
        side,
        collapsed: Boolean(node.collapsed),
        hasChildren: node.children.length > 0,
        floating,
      },
    });
    if (parentId !== undefined) {
      edges.push({
        id: `e:${parentId}:${node.id}`,
        source: parentId,
        target: node.id,
        type: "branch",
        // Connect from the parent's outward side to the child's inward side, so branches
        // fan left/right cleanly in the two-sided layout.
        sourceHandle: side === "left" ? "sl" : "sr",
        targetHandle: side === "left" ? "tr" : "tl",
        data: { depth, branchColor: color, crosslink: false },
      });
    }
    // Collapsed → keep the node (with hasChildren) but omit its descendants. The root is
    // emitted with recurse=false so its children are emitted once, per-branch (colour/side).
    if (node.collapsed || !recurse) return;
    for (const child of node.children) {
      emit(child, node.id, depth + 1, side, color, floating, false);
    }
  };

  const root = doc.root;
  emit(root, undefined, 0, "right", ROOT_COLOR, false, true, false);
  const sides = assignSides(root.children);
  if (!root.collapsed) {
    root.children.forEach((child, i) => {
      emit(child, root.id, 1, sides[i], pal[i % pal.length], false, false);
    });
  }

  // Floating topics: each a detached subtree (no edge to the root).
  for (const floating of doc.floatingTopics ?? []) {
    emit(floating, undefined, 1, "right", FLOATING_COLOR, true, false);
  }

  // Cross-links: dashed, labelled relationship edges (built-in bezier + dashed style).
  for (const link of doc.links ?? []) {
    edges.push({
      id: link.id,
      source: link.from,
      target: link.to,
      type: "default",
      sourceHandle: "sr",
      targetHandle: "tl",
      label: link.label,
      style: { stroke: CROSSLINK_COLOR, strokeDasharray: "6 4", strokeWidth: 1.5 },
      labelStyle: { fill: CROSSLINK_COLOR, fontSize: 12 },
      data: { depth: 0, branchColor: CROSSLINK_COLOR, crosslink: true },
    });
  }

  return { nodes, edges };
}
