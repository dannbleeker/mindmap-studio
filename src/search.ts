import type { MapNode } from "./model/types";

// Find node ids whose topic OR note contains the query (case-insensitive), in
// depth-first order. Notes often hold the substantive content of a map, so Find
// searches both. Pure + deterministic so it's unit-testable; the UI cycles
// through the returned ids and focuses each on the canvas.
export function findMatches(root: MapNode, query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const ids: string[] = [];
  const walk = (node: MapNode) => {
    if (node.topic.toLowerCase().includes(q) || node.note?.toLowerCase().includes(q)) {
      ids.push(node.id);
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return ids;
}

// Case-insensitive replace of every occurrence of `query` within `topic`.
// Pure + unit-tested; the canvas applies the result to each matching node.
export function replaceInTopic(topic: string, query: string, replacement: string): string {
  const q = query.trim();
  if (!q) return topic;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return topic.replace(new RegExp(escaped, "gi"), replacement);
}
