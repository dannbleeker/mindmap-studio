import type { MapNode } from "./model/types";

export interface OutlineRow {
  id: string;
  topic: string;
  depth: number;
  hasNote: boolean;
}

// Flatten the tree into an indented outline (depth-first) for the Outline panel.
// Pure + deterministic; the panel renders these rows and focuses a node on click.
export function outlineRows(root: MapNode): OutlineRow[] {
  const rows: OutlineRow[] = [];
  const walk = (node: MapNode, depth: number) => {
    rows.push({ id: node.id, topic: node.topic, depth, hasNote: !!node.note?.trim() });
    for (const child of node.children) walk(child, depth + 1);
  };
  walk(root, 0);
  return rows;
}
