import type { MapNode, MindMapDoc } from "./model/types";
import { progressMap, toPercent } from "./progress";

// Group a map's topics into Kanban columns by tag — a read-only "board" view of the same data
// (a visualisation, not task management: we don't move cards or write back). A topic appears in a
// column for each of its tags; topics with no tags fall into an "Untagged" column shown last.
// Cards carry their rolled-up completion + due date so the board reads like a status wall. Pure.

export interface BoardCard {
  id: string;
  topic: string;
  /** Rolled-up completion (0..100), or undefined when the topic isn't a task. */
  progress?: number;
  /** Due date ("YYYY-MM-DD"), or undefined. */
  due?: string;
}

export interface BoardColumn {
  /** The tag heading this column, or "" for the Untagged column. */
  tag: string;
  cards: BoardCard[];
}

export const UNTAGGED = "";

export function boardColumns(doc: MindMapDoc): BoardColumn[] {
  const prog = new Map(progressMap(doc.root));
  for (const f of doc.floatingTopics ?? []) for (const [k, v] of progressMap(f)) prog.set(k, v);

  const cols = new Map<string, BoardCard[]>();
  const push = (key: string, card: BoardCard) => {
    const list = cols.get(key);
    if (list) list.push(card);
    else cols.set(key, [card]);
  };
  const walk = (n: MapNode) => {
    const info = prog.get(n.id);
    const card: BoardCard = {
      id: n.id,
      topic: n.topic,
      progress: info ? toPercent(info.progress) : undefined,
      due: n.task?.due,
    };
    const tags = n.tags ?? [];
    if (tags.length === 0) push(UNTAGGED, card);
    else for (const t of tags) push(t, card);
    for (const c of n.children) walk(c);
  };
  walk(doc.root);
  for (const f of doc.floatingTopics ?? []) walk(f);

  // Tag columns sorted alphabetically; the Untagged column (if any) always last.
  const tagged = [...cols.keys()]
    .filter((k) => k !== UNTAGGED)
    .sort()
    .map((tag) => ({ tag, cards: cols.get(tag) ?? [] }));
  const untagged = cols.get(UNTAGGED);
  return untagged ? [...tagged, { tag: UNTAGGED, cards: untagged }] : tagged;
}
