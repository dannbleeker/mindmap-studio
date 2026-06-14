import type { MapNode, MindMapDoc } from "./model/types";

const matchesQuery = (node: MapNode, q: string): boolean =>
  node.topic.toLowerCase().includes(q) || (node.note?.toLowerCase().includes(q) ?? false);

// Levenshtein edit distance, bounded: returns early (as max + 1) once the best possible exceeds
// `max`, so a no-match is cheap. Pure.
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      curr.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1; // whole row already worse than the budget
    prev = curr;
  }
  return prev[b.length];
}

/** Typo-tolerant match: an exact substring, OR the query within a small edit distance of a word
 *  in the text. The distance budget scales with query length (short queries stay strict). Pure. */
export function fuzzyHit(text: string, q: string): boolean {
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  const max = q.length <= 5 ? 1 : 2;
  return t.split(/\s+/).some((w) => w.length > 0 && editDistance(w, q, max) <= max);
}

const matchesFuzzy = (node: MapNode, q: string): boolean =>
  fuzzyHit(node.topic, q) || (node.note ? fuzzyHit(node.note, q) : false);

const roots = (doc: MindMapDoc): MapNode[] => [doc.root, ...(doc.floatingTopics ?? [])];

// Find node ids whose topic OR note contains the query (case-insensitive), in
// depth-first order. Notes often hold the substantive content of a map, so Find
// searches both. Pure + deterministic so it's unit-testable; the UI cycles
// through the returned ids and focuses each on the canvas.
export function findMatches(
  root: MapNode,
  query: string,
  match: (node: MapNode, q: string) => boolean = matchesQuery,
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const ids: string[] = [];
  const walk = (node: MapNode) => {
    if (match(node, q)) ids.push(node.id);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return ids;
}

// Find matches across a whole map — the central tree AND floating topics — so in-map Find
// covers the editable floating branch too. Exact (substring) first; if nothing matches and the
// query is long enough to be meaningful, fall back to a typo-tolerant fuzzy pass — so exact
// behaviour is unchanged when there are hits, and a misspelling still lands. DFS order.
export function findDocMatches(doc: MindMapDoc, query: string): string[] {
  const exact = roots(doc).flatMap((root) => findMatches(root, query));
  if (exact.length > 0 || query.trim().length < 4) return exact;
  return roots(doc).flatMap((root) => findMatches(root, query, matchesFuzzy));
}

/** A library-wide search hit: which map, which node, and the node's topic for display. */
export interface LibraryHit {
  mapId: string;
  mapTitle: string;
  nodeId: string;
  topic: string;
}

// Search every map's topics + notes — the central tree AND floating topics — for the
// query, returning hits with enough context to navigate to them. Pure + unit-tested; the
// UI loads the library, filters with this, and jumps to the chosen map/node.
export function searchLibrary(docs: MindMapDoc[], query: string): LibraryHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const collect = (match: (node: MapNode, q: string) => boolean): LibraryHit[] => {
    const hits: LibraryHit[] = [];
    for (const doc of docs) {
      const walk = (node: MapNode) => {
        if (match(node, q)) {
          hits.push({ mapId: doc.id, mapTitle: doc.title, nodeId: node.id, topic: node.topic });
        }
        for (const child of node.children) walk(child);
      };
      for (const root of roots(doc)) walk(root);
    }
    return hits;
  };
  const exact = collect(matchesQuery);
  // Same exact-then-fuzzy fallback as in-map Find.
  if (exact.length > 0 || q.length < 4) return exact;
  return collect(matchesFuzzy);
}

// Case-insensitive replace of every occurrence of `query` within `topic`.
// Pure + unit-tested; the canvas applies the result to each matching node.
export function replaceInTopic(topic: string, query: string, replacement: string): string {
  const q = query.trim();
  if (!q) return topic;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return topic.replace(new RegExp(escaped, "gi"), replacement);
}
