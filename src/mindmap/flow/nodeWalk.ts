// Shared tree-walk helper for the canonical model. Several ops repeat the same recursion (e.g.
// collapse/expand to a depth); this centralises the walk — and the depth bookkeeping — in one place.
// Pure; no DOM, no flow-state coupling.

import type { MapNode } from "../../model/types";

/** Depth-first walk of a node and its subtree, passing each node's depth (the start node = `depth`). */
export function walkTree(
  node: MapNode,
  visit: (node: MapNode, depth: number) => void,
  depth = 0,
): void {
  visit(node, depth);
  for (const child of node.children) walkTree(child, visit, depth + 1);
}
