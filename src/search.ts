import type { MapNode, MindMapDoc } from "./model/types";
import { progressMap } from "./progress";
import { type HasField, type ParsedQuery, parseQuery } from "./queryParser";
import { isDueSoon, isOverdue, todayISO } from "./taskDate";

// Every searchable surface of a node, joined into one lowercased haystack. Topic + note are the
// primary content; tags, marker (icon) ids, the hyperlink, callout bubbles, attachment filenames,
// and task resources are searchable too — so Find reaches a node by anything it actually carries.
export const searchableText = (node: MapNode): string =>
  [
    node.topic,
    node.note ?? "",
    ...(node.tags ?? []),
    ...(node.icons ?? []),
    node.hyperlink ?? "",
    ...(node.callouts?.map((c) => c.text) ?? []),
    ...(node.attachments?.map((a) => a.name) ?? []),
    ...(node.task?.resources ?? []),
  ]
    .join(" ")
    .toLowerCase();

const matchesQuery = (node: MapNode, q: string): boolean => searchableText(node).includes(q);

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

const matchesFuzzy = (node: MapNode, q: string): boolean => fuzzyHit(searchableText(node), q);

const roots = (doc: MindMapDoc): MapNode[] => [doc.root, ...(doc.floatingTopics ?? [])];

// Effective (rolled-up) completion per node id — so a "done" parent isn't reported as overdue. Only
// built when a due-date scope actually needs it.
const buildProgress = (doc: MindMapDoc): Map<string, number | undefined> => {
  const prog = new Map<string, number | undefined>();
  for (const root of roots(doc)) for (const [k, v] of progressMap(root)) prog.set(k, v.progress);
  return prog;
};

const hasField = (n: MapNode, f: HasField): boolean => {
  switch (f) {
    case "note":
      return !!n.note?.trim();
    case "attachment":
      return !!n.attachments?.length;
    case "link":
      return !!n.hyperlink;
    case "task":
      return !!n.task;
    case "image":
      return !!n.image;
  }
};

// Does a node satisfy a structured (operator) query at the given depth (root = 0)? Free terms are
// AND'd substrings of the searchable haystack; tag/marker are OR-within / AND-across; has/level/due/
// priority are hard gates. `today` + `progress` are only consulted for due:overdue / due:soon. Pure.
function nodeMatchesParsed(
  n: MapNode,
  p: ParsedQuery,
  depth: number,
  today: string,
  progress: number | undefined,
): boolean {
  const hay = searchableText(n);
  if (p.include.some((t) => !hay.includes(t))) return false;
  if (p.exclude.some((t) => hay.includes(t))) return false;
  if (p.tags.length && !p.tags.some((t) => n.tags?.some((x) => x.toLowerCase() === t)))
    return false;
  if (p.markers.length && !p.markers.some((mk) => n.icons?.some((x) => x.toLowerCase() === mk)))
    return false;
  if (p.priority !== undefined && n.task?.priority !== p.priority) return false;
  if (p.has.some((f) => !hasField(n, f))) return false;
  if (p.due === "dated" && !n.task?.due) return false;
  if (p.due === "overdue" && !isOverdue(n.task?.due, progress, today)) return false;
  if (p.due === "soon" && !isDueSoon(n.task?.due, progress, today)) return false;
  if (p.minLevel !== undefined && depth < p.minLevel) return false;
  if (p.maxLevel !== undefined && depth > p.maxLevel) return false;
  return true;
}

// Visit every node of a doc (central tree + floating topics, each rooted at depth 0) that satisfies a
// structured query, in DFS order. The progress map is built lazily — only when a due scope needs it.
function eachScopedMatch(
  doc: MindMapDoc,
  p: ParsedQuery,
  today: string,
  cb: (n: MapNode) => void,
): void {
  const prog = p.due === "overdue" || p.due === "soon" ? buildProgress(doc) : null;
  const walk = (n: MapNode, depth: number) => {
    if (nodeMatchesParsed(n, p, depth, today, prog?.get(n.id))) cb(n);
    for (const c of n.children) walk(c, depth + 1);
  };
  for (const root of roots(doc)) walk(root, 0);
}

// Find node ids whose searchable text contains the query (case-insensitive), in depth-first
// order. The haystack is every surface a node carries — topic, note, tags, markers, hyperlink,
// callouts, attachment names, task resources (see searchableText) — so Find reaches a node by
// anything on it. Pure + deterministic so it's unit-testable; the UI cycles through the returned
// ids and focuses each on the canvas.
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
// covers the editable floating branch too. A query carrying operators (tag:/marker:/priority:/due:/
// has:/level:/-exclude/"phrase") matches the structured, field-aware way; a plain query keeps the
// historical behaviour: exact (substring) first, then — when long enough and empty-handed — a
// typo-tolerant fuzzy pass. DFS order. `today` is injected so due-date scopes stay deterministic.
export function findDocMatches(doc: MindMapDoc, query: string, today = todayISO()): string[] {
  const parsed = parseQuery(query);
  if (parsed.scoped) {
    const ids: string[] = [];
    eachScopedMatch(doc, parsed, today, (n) => ids.push(n.id));
    return ids;
  }
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

// Search every map's nodes — the central tree AND floating topics — for the query across all
// their searchable text (see searchableText), returning hits with enough context to navigate to
// them. Pure + unit-tested; the UI loads the library, filters with this, and jumps to the chosen
// map/node.
export function searchLibrary(docs: MindMapDoc[], query: string, today = todayISO()): LibraryHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const parsed = parseQuery(query);
  if (parsed.scoped) {
    const hits: LibraryHit[] = [];
    for (const doc of docs)
      eachScopedMatch(doc, parsed, today, (n) =>
        hits.push({ mapId: doc.id, mapTitle: doc.title, nodeId: n.id, topic: n.topic }),
      );
    return hits;
  }
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
