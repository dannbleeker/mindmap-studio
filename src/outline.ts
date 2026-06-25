import { classifyLink } from "./mindmap/contract";
import type { MapNode, MindMapDoc, NumberStyle } from "./model/types";
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

/** Canvas drag-reorder (#8): where a dragged topic dropped at `centerY` lands within a target box —
 *  top band before, bottom band after, middle as a child (via outlineDropWhere). The root has no
 *  parent, so before/after collapse to child there. Pure. */
export function dropWhereInBox(
  centerY: number,
  boxTop: number,
  boxHeight: number,
  isRoot: boolean,
): "before" | "child" | "after" {
  const ratio = boxHeight > 0 ? (centerY - boxTop) / boxHeight : 0.5;
  const where = outlineDropWhere(ratio);
  return where !== "child" && isRoot ? "child" : where;
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

/** 1-based index → uppercase letters (1→A, 26→Z, 27→AA). */
function toAlpha(n: number): string {
  let s = "";
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

/** 1-based index → uppercase Roman numeral (1→I, 4→IV, 9→IX, …). */
function toRoman(n: number): string {
  const table: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let x = n;
  let s = "";
  for (const [v, sym] of table) {
    while (x >= v) {
      s += sym;
      x -= v;
    }
  }
  return s;
}

/** The glyph for one outline level under the given scheme. `depth` is 0-based (root's children = 0);
 *  the "outline" scheme cycles I → A → 1 → a → i by level, "decimal" is always the number. */
function levelGlyph(style: NumberStyle, depth: number, i: number): string {
  if (style !== "outline") return String(i + 1);
  switch (depth % 5) {
    case 0:
      return toRoman(i + 1);
    case 1:
      return toAlpha(i + 1);
    case 2:
      return String(i + 1);
    case 3:
      return toAlpha(i + 1).toLowerCase();
    default:
      return toRoman(i + 1).toLowerCase();
  }
}

// Hierarchical outline numbers for every node *below* the root — the root (the central topic) is the
// implicit "0" and isn't numbered. The scheme is "decimal" (1, 1.1, 1.1.1) or "outline" (the legal
// outline I, I.A, I.A.1, I.A.1.a …). Pure; drives the optional auto-numbering view on the canvas +
// outline panel. Keyed by node id.
export function outlineNumbers(root: MapNode, style: NumberStyle = "decimal"): Map<string, string> {
  const numbers = new Map<string, string>();
  const walk = (node: MapNode, prefix: string, depth: number) => {
    node.children.forEach((child, i) => {
      const seg = levelGlyph(style, depth, i);
      const num = prefix ? `${prefix}.${seg}` : seg;
      numbers.set(child.id, num);
      walk(child, num, depth + 1);
    });
  };
  walk(root, "", 0);
  return numbers;
}
