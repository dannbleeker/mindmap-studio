import type { MapNode } from "../model/types";
import { parseOutline } from "./pasteOutline";

// Paste a spreadsheet selection (Excel / Google Sheets / a TSV or CSV block) as a subtree: each row
// becomes a topic, extra columns become the topic's note (and a "Tags" column its tags). Detected by
// an *interior* tab/comma (vs an outline's leading-indent tabs), so prose + indented outlines still
// route to parseOutline. Pure + deterministic (counter ids); the graft op re-ids. See pasteOutline.

let pid = 0;
function nextId(): string {
  pid += 1;
  return `t${pid}`;
}

/** Rows × cells from a pasted table block, or null when it doesn't look tabular. Prefers TAB (how
 *  spreadsheets copy); falls back to comma only when every non-empty line has the same ≥2 columns. */
export function parseTable(text: string): string[][] | null {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return null;
  // Interior tab = a column separator (a leading-indent tab, for outlines, has only whitespace before).
  const hasInteriorTab = lines.some((l) => /\S\t/.test(l));
  const delim = hasInteriorTab ? "\t" : lines.every((l) => l.includes(",")) ? "," : null;
  if (!delim) return null;
  const rows = lines.map((l) => l.split(delim).map((c) => c.trim()));
  const cols = Math.max(...rows.map((r) => r.length));
  if (cols < 2) return null; // a single column is just an outline
  return rows;
}

const HEADER_RE = /^(topic|name|title|note|notes|tag|tags)$/i;

/** Turn parsed table rows into a forest of topics. If the first row reads as headers (it names a
 *  topic/note/tag column), it labels note lines ("Header: value") and a Tags column splits into tags;
 *  otherwise row[0] is the topic and the rest become plain note lines. Pure. */
export function tableToForest(rows: string[][]): MapNode[] {
  pid = 0;
  if (rows.length === 0) return [];
  const headerish = rows[0].some((c) => HEADER_RE.test(c));
  const headers = headerish ? rows[0] : null;
  const data = headerish ? rows.slice(1) : rows;
  const topicCol = headers
    ? Math.max(
        0,
        headers.findIndex((h) => /^(topic|name|title)$/i.test(h)),
      )
    : 0;
  const isTagCol = (i: number) => !!headers && /^tags?$/i.test(headers[i] ?? "");

  const out: MapNode[] = [];
  for (const row of data) {
    if (!row.some((c) => c)) continue;
    const topic = (row[topicCol] ?? row[0] ?? "").trim();
    const noteParts: string[] = [];
    const tags: string[] = [];
    row.forEach((cell, i) => {
      const v = cell.trim();
      if (i === topicCol || !v) return;
      if (isTagCol(i)) {
        for (const t of v.split(/[,;]\s*/).map((s) => s.trim())) if (t) tags.push(t);
      } else {
        noteParts.push(headers?.[i] ? `${headers[i]}: ${v}` : v);
      }
    });
    const node: MapNode = { id: nextId(), topic: topic || "(untitled)", children: [] };
    if (noteParts.length > 0) node.note = noteParts.join("\n");
    if (tags.length > 0) node.tags = tags;
    out.push(node);
  }
  return out;
}

/** The unified paste entry point: a tabular block → row-per-topic forest, otherwise the outline
 *  parser. Pure; callers graft the result under a node or wrap it in a new map. */
export function parsePaste(text: string): MapNode[] {
  const table = parseTable(text);
  return table ? tableToForest(table) : parseOutline(text);
}
