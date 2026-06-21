import { classifyLink } from "./mindmap/contract";
import type { MapNode, MindMapDoc } from "./model/types";
import { progressMap, toPercent } from "./progress";

export interface OutlineRow {
  id: string;
  topic: string;
  depth: number;
  hasNote: boolean;
  /** Rolled-up task completion as a whole percent (0..100), or undefined when not a task. */
  progress?: number;
}

// Flatten the tree into an indented outline (depth-first) for the Outline panel.
// Pure + deterministic; the panel renders these rows and focuses a node on click.
export function outlineRows(root: MapNode): OutlineRow[] {
  const rows: OutlineRow[] = [];
  const progress = progressMap(root);
  const walk = (node: MapNode, depth: number) => {
    const info = progress.get(node.id);
    rows.push({
      id: node.id,
      topic: node.topic,
      depth,
      hasNote: !!node.note?.trim(),
      progress: info ? toPercent(info.progress) : undefined,
    });
    for (const child of node.children) walk(child, depth + 1);
  };
  walk(root, 0);
  return rows;
}

/** Where an outline drag should land given the pointer's vertical position within the hovered row
 *  (`ratio` 0 = top edge, 1 = bottom edge): the top quarter drops the dragged topic *before* the row,
 *  the bottom quarter *after* it, and the broad middle nests it as a *child* (the "drag under"
 *  gesture). Pure — the panel reads pointer geometry, this decides the intent. */
export function outlineDropWhere(ratio: number): "before" | "child" | "after" {
  if (ratio < 0.25) return "before";
  if (ratio > 0.75) return "after";
  return "child";
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

/** One incoming reference to a node, for the inspector's "Linked from" section. */
export interface Backlink {
  /** The source node that points at the target. */
  id: string;
  topic: string;
  /** How it points: a `#node=` topic hyperlink, or a relationship (cross-link) edge. */
  kind: "hyperlink" | "relationship";
  /** The relationship edge's label, when set (relationship kind only). */
  label?: string;
}

// Find every topic that points AT `targetId` — via a `#node=` hyperlink or a relationship edge
// whose `to` is the target. Walks the central tree + every floating topic; self-references are
// excluded. Pure + deterministic (sorted by topic, then kind); the inspector renders these as
// clickable "Linked from" jumps. A node can appear twice (once per kind) when it both links and
// relates to the target.
export function backlinksFor(doc: MindMapDoc, targetId: string): Backlink[] {
  const byId = new Map<string, MapNode>();
  const walk = (n: MapNode) => {
    byId.set(n.id, n);
    for (const c of n.children) walk(c);
  };
  walk(doc.root);
  for (const f of doc.floatingTopics ?? []) walk(f);

  const out: Backlink[] = [];
  // Topic hyperlinks (#node=<target>) — incoming "jump" references.
  for (const n of byId.values()) {
    if (n.id === targetId || !n.hyperlink) continue;
    const link = classifyLink(n.hyperlink);
    if (link.kind === "node" && link.id === targetId) {
      out.push({ id: n.id, topic: n.topic, kind: "hyperlink" });
    }
  }
  // Relationship edges that point at the target ("what points AT me"); from===target is outgoing.
  for (const l of doc.links ?? []) {
    if (l.to !== targetId || l.from === targetId) continue;
    const src = byId.get(l.from);
    if (src) out.push({ id: l.from, topic: src.topic, kind: "relationship", label: l.label });
  }
  return out.sort((a, b) => a.topic.localeCompare(b.topic) || a.kind.localeCompare(b.kind));
}

// Hierarchical outline numbers (1, 1.2, 1.2.3, …) for every node *below* the root — the root
// (the central topic) is the implicit "0" and isn't numbered. Pure; drives the optional
// auto-numbering view on the canvas + outline panel. Keyed by node id.
export function outlineNumbers(root: MapNode): Map<string, string> {
  const numbers = new Map<string, string>();
  const walk = (node: MapNode, prefix: string) => {
    node.children.forEach((child, i) => {
      const num = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      numbers.set(child.id, num);
      walk(child, num);
    });
  };
  walk(root, "");
  return numbers;
}
