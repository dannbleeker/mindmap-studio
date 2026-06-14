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

export interface IndexHit {
  id: string;
  topic: string;
}
export interface IndexEntry {
  key: string;
  hits: IndexHit[];
}

// Collect every marker (icon) and tag across the map, each with the nodes carrying it,
// grouped + sorted by key. Pure; the marker/tag index panel renders these and focuses a node
// on click.
export function markerTagIndex(
  root: MapNode,
  floatingTopics: MapNode[] = [],
): { markers: IndexEntry[]; tags: IndexEntry[] } {
  const markers = new Map<string, IndexHit[]>();
  const tags = new Map<string, IndexHit[]>();
  const add = (m: Map<string, IndexHit[]>, key: string, n: MapNode) => {
    const hit = { id: n.id, topic: n.topic };
    const list = m.get(key);
    if (list) list.push(hit);
    else m.set(key, [hit]);
  };
  const walk = (n: MapNode) => {
    for (const ic of n.icons ?? []) add(markers, ic, n);
    for (const t of n.tags ?? []) add(tags, t, n);
    for (const c of n.children) walk(c);
  };
  walk(root);
  for (const f of floatingTopics) walk(f);
  const sorted = (m: Map<string, IndexHit[]>): IndexEntry[] =>
    [...m.keys()].sort().map((key) => ({ key, hits: m.get(key) ?? [] }));
  return { markers: sorted(markers), tags: sorted(tags) };
}
