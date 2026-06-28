import type { MapNode, MindMapDoc } from "./model/types";
import { progressMap, toPercent } from "./progress";

// Group a map's topics into Kanban columns by tag — a "board" view of the same data. A topic appears
// in a column for each of its tags; topics with no tags fall into an "Untagged" column shown last.
// Cards carry their rolled-up completion + due date so the board reads like a status wall. Pure.
// Cards can be dragged between columns to re-tag the topic (retagForMove); the board itself is pure.

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

/** DataTransfer MIME identifying a Kanban card dragged between columns (drag-to-retag). */
export const CARD_DND_TYPE = "application/x-mm-card";

/** A card's new tag set when dragged from `fromTag` to `toTag`: drop the source-column tag, add the
 *  target-column tag (deduped). Dropping into Untagged only removes; dragging from Untagged only adds;
 *  a card's other tags are preserved. Pure — the canvas applies it via the `setNodeTags` handle. */
export function retagForMove(tags: string[], fromTag: string, toTag: string): string[] {
  const next = tags.filter((t) => t !== fromTag || fromTag === UNTAGGED);
  if (toTag !== UNTAGGED && !next.includes(toTag)) next.push(toTag);
  return next;
}

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
    else for (const t of new Set(tags)) push(t, card); // dedupe so a repeated tag can't list a topic twice
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
