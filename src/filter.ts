import type { MapNode, MindMapDoc } from "./model/types";

// Read-only "Power Filter": given criteria (free text + required markers/tags), find which nodes
// match and which should stay lit on the canvas. Lit = matches *plus their ancestors*, so the
// path from the root to each match stays visible while everything else dims. Pure + unit-tested;
// the canvas only reduces opacity (no structural change, nothing deleted), hence "read-only".

export interface FilterCriteria {
  text: string;
  /** A node must carry at least one of these markers (icons). Empty = no marker constraint. */
  markers: string[];
  /** A node must carry at least one of these tags. Empty = no tag constraint. */
  tags: string[];
}

/** Is any criterion set? When false the canvas shows everything (no dimming). */
export function isFilterActive(c: FilterCriteria): boolean {
  return c.text.trim().length > 0 || c.markers.length > 0 || c.tags.length > 0;
}

function nodeMatches(n: MapNode, c: FilterCriteria, q: string): boolean {
  // Text matches topic or note (the same surfaces Find searches), case-insensitive.
  if (q && !`${n.topic} ${n.note ?? ""}`.toLowerCase().includes(q)) return false;
  // Marker / tag constraints are AND across categories, OR within one (any selected marker counts).
  if (c.markers.length && !c.markers.some((m) => n.icons?.includes(m))) return false;
  if (c.tags.length && !c.tags.some((t) => n.tags?.includes(t))) return false;
  return true;
}

export interface FilterResult {
  /** Node ids to keep at full opacity (matches + every ancestor on a path to a match). */
  lit: Set<string>;
  /** How many nodes actually matched (ancestors-only nodes don't count). */
  matches: number;
}

// "Focus this branch": the lit set is the node's whole subtree plus its ancestors (the path back
// to the root), so focusing keeps the branch and its route visible while everything else dims.
// Reuses the same lit/dim pipeline as the Power Filter. Empty set if the id isn't found. Pure.
export function focusSet(doc: MindMapDoc, id: string): Set<string> {
  const lit = new Set<string>();
  const litSubtree = (n: MapNode): void => {
    lit.add(n.id);
    for (const c of n.children) litSubtree(c);
  };
  const find = (n: MapNode, ancestors: string[]): boolean => {
    if (n.id === id) {
      for (const a of ancestors) lit.add(a);
      litSubtree(n);
      return true;
    }
    return n.children.some((c) => find(c, [...ancestors, n.id]));
  };
  if (!find(doc.root, [])) {
    for (const f of doc.floatingTopics ?? []) if (find(f, [])) break;
  }
  return lit;
}

export function filterResult(doc: MindMapDoc, c: FilterCriteria): FilterResult {
  const q = c.text.trim().toLowerCase();
  const lit = new Set<string>();
  let matches = 0;
  const walk = (n: MapNode, ancestors: string[]): void => {
    if (nodeMatches(n, c, q)) {
      matches += 1;
      lit.add(n.id);
      for (const a of ancestors) lit.add(a);
    }
    const next = [...ancestors, n.id];
    for (const child of n.children) walk(child, next);
  };
  walk(doc.root, []);
  for (const f of doc.floatingTopics ?? []) walk(f, []);
  return { lit, matches };
}
