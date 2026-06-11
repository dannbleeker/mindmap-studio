import type { MapNode } from "./model/types";

// Find node ids whose topic contains the query (case-insensitive), in
// depth-first order. Pure + deterministic so it's unit-testable; the UI cycles
// through the returned ids and focuses each on the canvas.
export function findMatches(root: MapNode, query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const ids: string[] = [];
  const walk = (node: MapNode) => {
    if (node.topic.toLowerCase().includes(q)) ids.push(node.id);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return ids;
}
