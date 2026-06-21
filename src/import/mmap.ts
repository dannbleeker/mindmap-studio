import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";
import { mindManagerIconToEmoji } from "../icons";
import { isDangerousUrl } from "../io/urlSafety";
import type {
  Boundary,
  CrossLink,
  MapNode,
  MindMapDoc,
  NodeId,
  NodeStyle,
  TaskInfo,
} from "../model/types";

// MindManager .mmap importer (one-way).
//
// A .mmap is a ZIP archive whose map lives in `Document.xml`, namespace
// http://schemas.mindjet.com/MindManager/Application/2003. The field shapes
// below are taken from the bundled XSD schemas, so they are authoritative
// (not guessed), and the text/structure import is confirmed against real
// feature-rich MindManager exports (owner-validated 2026-06-19). The importer
// is defensive: it recovers everything it understands, warns about what it
// deliberately drops, and throws a useful error when handed something that is
// not a MindManager map.
//
// Imported: topic tree + text (Text@PlainText), notes (full NotesXhtmlData XHTML
// body, falling back to @PreviewPlainText), stock icons (Icon@IconType), user
// tags (TextLabels>TextLabel@TextLabelName), per-topic colour + font (Topic>Color
// @FillColor/@LineColor and Text>Font@Color/@Name/@Size/@Bold/@Underline), task
// info (Task@StartDate/@DeadlineDate/@TaskPriority/@TaskPercentage/@Resources),
// hyperlinks (Hyperlink@Url), relationships (Relationships>Relationship>2x
// ConnectionGroup>Connection>ObjectReference@OIdRef), boundaries
// (Topic>OneBoundary, over the topic's subtree), floating topics
// (FloatingTopics), and each main branch's two-sided side (Offset@CX sign,
// depth-1 only).
//
// Still dropped (no model home / out of scope, by design): theme-only styling
// (topics with no explicit colour inherit the StyleGroup theme we don't resolve),
// summary brackets (their span is positional/implicit in the schema), embedded
// images + attachments (Phase B), the Gantt/resource-scheduling layer beyond the
// per-topic task fields above, SmartRules, spreadsheets, and live OLE objects.

export interface MmapImportResult {
  doc: MindMapDoc;
  warnings: string[];
}

const ATTR = "@_";

// biome-ignore lint/suspicious/noExplicitAny: parsed XML is dynamically shaped
type Xml = any;

interface ParseContext {
  warnings: string[];
  boundaries: Boundary[];
}

function asList<T>(x: T | T[] | undefined | null): T[] {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

function extractText(node: Xml): string {
  const t = node?.Text;
  if (!t) return "";
  return String(t[`${ATTR}PlainText`] ?? t[`${ATTR}Text`] ?? t["#text"] ?? "");
}

/** True for a MindManager boolean attribute ("true"/"1"). */
function truthyAttr(v: unknown): boolean {
  return v === true || v === "true" || v === "1" || v === 1;
}

/** pri:Color is hexBinary AARRGGBB (alpha FIRST), lowercase. Return CSS `#rrggbb`, or undefined when
 *  absent / malformed / fully transparent (alpha 00) — a transparent fill is "no override", not black. */
function argbToHex(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const hex = v.trim().toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(hex)) return undefined;
  if (hex.startsWith("00")) return undefined; // fully transparent → leave to the theme
  return `#${hex.slice(2)}`;
}

const BLOCK_TAG = /^(p|div|br|li|tr|h[1-6]|blockquote|ul|ol|table)$/i;

/** Flatten a parsed XHTML notes subtree to plain text, breaking lines on block-level elements. */
function collectXhtmlText(node: Xml): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectXhtmlText).join("");
  let out = "";
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith(ATTR)) continue; // attributes carry no note text
    if (key === "#text") {
      out += String(value);
      continue;
    }
    // Repeated tags collapse to an array (e.g. several <p>); break each as its own block.
    for (const item of Array.isArray(value) ? value : [value]) {
      const text = collectXhtmlText(item);
      out += BLOCK_TAG.test(key) ? `\n${text}` : text;
    }
  }
  return out;
}

function extractNote(topic: Xml): string | undefined {
  const xhtml = topic?.NotesGroup?.NotesXhtmlData;
  // The full note body is an inline XHTML subtree; @PreviewPlainText is only a truncated preview.
  // Prefer the full body so long notes import whole, then fall back to the preview, then legacy shapes.
  if (xhtml && typeof xhtml === "object") {
    const body = collectXhtmlText(xhtml.html ?? xhtml)
      .replace(/ /g, " ") // nbsp → space
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (body) return body;
  }
  const preview = xhtml?.[`${ATTR}PreviewPlainText`];
  if (preview) return String(preview);
  const legacy = topic?.Notes?.CDATA?.[`${ATTR}Text`] ?? topic?.Notes?.["#text"];
  return legacy ? String(legacy) : undefined;
}

/** User tags / text-markers: Topic>TextLabels>TextLabel@TextLabelName (deduped, order-preserving). */
function extractTags(topic: Xml): string[] {
  const seen = new Set<string>();
  for (const label of asList(topic?.TextLabels?.TextLabel)) {
    const name = label?.[`${ATTR}TextLabelName`] ?? label?.[`${ATTR}Name`];
    if (typeof name === "string" && name.length > 0) seen.add(name);
  }
  return [...seen];
}

/** Explicit per-topic style overrides (fill/line colour + whole-topic font). Theme-inherited styling
 *  (no explicit attributes) is intentionally left to the canvas default — we don't resolve the theme. */
function extractStyle(topic: Xml): NodeStyle | undefined {
  const style: NodeStyle = {};
  const fill = argbToHex(topic?.Color?.[`${ATTR}FillColor`]);
  if (fill) style.background = fill;
  const line = argbToHex(topic?.Color?.[`${ATTR}LineColor`]);
  if (line) style.border = `1px solid ${line}`;
  const font = topic?.Text?.Font;
  if (font) {
    const color = argbToHex(font[`${ATTR}Color`]);
    if (color) style.color = color;
    const name = font[`${ATTR}Name`];
    if (typeof name === "string" && name) style.fontFamily = name;
    const size = Number(font[`${ATTR}Size`]);
    if (Number.isFinite(size) && size > 0) style.fontSize = `${size}px`;
    if (truthyAttr(font[`${ATTR}Bold`])) style.fontWeight = "bold";
    if (truthyAttr(font[`${ATTR}Underline`])) style.textDecoration = "underline";
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

/** The dateTime attrs are ISO local (e.g. "2026-06-21T00:00:00"); the model stores a YYYY-MM-DD date. */
function isoDate(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const m = v.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : undefined;
}

/** Per-topic task fields the app already supports (inspector / filter / Kanban): start, due, priority
 *  (Prio1..5 → 1..5, 1 = highest), progress (TaskPercentage 0..100 → 0..1), and resources. */
function extractTask(topic: Xml): TaskInfo | undefined {
  const t = topic?.Task;
  if (!t) return undefined;
  const info: TaskInfo = {};
  const prio = String(t[`${ATTR}TaskPriority`] ?? "").match(/Prio([1-9])/i);
  if (prio) info.priority = Number(prio[1]);
  const pct = Number(t[`${ATTR}TaskPercentage`]);
  if (Number.isFinite(pct)) info.progress = Math.max(0, Math.min(1, pct / 100));
  const due = isoDate(t[`${ATTR}DeadlineDate`]);
  if (due) info.due = due;
  const start = isoDate(t[`${ATTR}StartDate`]);
  if (start) info.start = start;
  const resources = String(t[`${ATTR}Resources`] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (resources.length > 0) info.resources = resources;
  return Object.keys(info).length > 0 ? info : undefined;
}

function extractIcons(topic: Xml): string[] {
  return (
    asList(topic?.IconsGroup?.Icons?.Icon)
      .map((icon) => {
        const type = icon?.[`${ATTR}IconType`];
        // e.g. "urn:mindjet:ThumbsUp" -> "ThumbsUp"
        return typeof type === "string" ? type.replace(/^urn:mindjet:/, "") : "";
      })
      .filter((name) => name.length > 0)
      // Render as glyphs (👍) rather than literal "ThumbsUp"; unknown names kept as-is.
      .map(mindManagerIconToEmoji)
  );
}

function subtreeIds(node: MapNode): NodeId[] {
  const ids: NodeId[] = [node.id];
  for (const child of node.children) ids.push(...subtreeIds(child));
  return ids;
}

function countNodes(node: MapNode): number {
  let total = 1;
  for (const child of node.children) total += countNodes(child);
  return total;
}

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `n${idCounter}`;
}

function topicToNode(topic: Xml, ctx: ParseContext, depth = 0): MapNode {
  const node: MapNode = {
    id: String(topic?.[`${ATTR}OId`] ?? makeId()),
    topic: extractText(topic),
    children: [],
  };

  const note = extractNote(topic);
  if (note) node.note = note;

  const url = topic?.Hyperlink?.[`${ATTR}Url`];
  // A malicious .mmap could carry a javascript:/data: hyperlink — skip it on import.
  if (url && !isDangerousUrl(String(url))) node.hyperlink = String(url);

  const icons = extractIcons(topic);
  if (icons.length > 0) node.icons = icons;

  const tags = extractTags(topic);
  if (tags.length > 0) node.tags = tags;

  const style = extractStyle(topic);
  if (style) node.style = style;

  const task = extractTask(topic);
  if (task) node.task = task;

  // Two-sided map: a MAIN branch (depth 1) records which half it sits on via the sign of its
  // horizontal offset from the central topic — MindManager stamps CX < 0 for the left side and
  // CX > 0 for the right (the magnitude is just a layout nudge). Deeper topics carry offsets too,
  // but a "side" only has meaning for a root child, so gate strictly on depth === 1.
  if (depth === 1) {
    const cx = Number(topic?.Offset?.[`${ATTR}CX`]);
    if (Number.isFinite(cx) && cx !== 0) node.side = cx < 0 ? "left" : "right";
  }

  node.children = asList(topic?.SubTopics?.Topic).map((child) =>
    topicToNode(child, ctx, depth + 1),
  );

  // A boundary drawn on this topic encloses its subtree.
  if (topic?.OneBoundary) {
    ctx.boundaries.push({ id: `b${ctx.boundaries.length + 1}`, nodeIds: subtreeIds(node) });
  }

  return node;
}

function extractRelationships(map: Xml): CrossLink[] {
  const links: CrossLink[] = [];
  asList(map?.Relationships?.Relationship).forEach((rel, i) => {
    const oids = asList(rel?.ConnectionGroup)
      .map((cg) => cg?.Connection?.ObjectReference?.[`${ATTR}OIdRef`])
      .filter(Boolean)
      .map(String);
    if (oids.length >= 2) {
      const label = extractText(rel);
      links.push({ id: `r${i + 1}`, from: oids[0], to: oids[1], ...(label ? { label } : {}) });
    }
  });
  return links;
}

export function parseMmap(zipBytes: Uint8Array): MmapImportResult {
  const ctx: ParseContext = { warnings: [], boundaries: [] };

  const files = unzipSync(zipBytes);
  const entryName = Object.keys(files).find((k) => /(^|\/)document\.xml$/i.test(k));
  if (!entryName) {
    throw new Error(
      `Not a MindManager .mmap: Document.xml not found. Archive entries: ${Object.keys(files).join(", ")}`,
    );
  }

  const xml = strFromU8(files[entryName]);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ATTR,
    removeNSPrefix: true,
  });
  const tree = parser.parse(xml);

  const map = tree?.Map;
  if (!map) throw new Error("Unexpected .mmap: no <Map> root element in Document.xml.");

  const rootTopic = map?.OneTopic?.Topic ?? map?.Topic;
  if (!rootTopic) {
    throw new Error("Unexpected .mmap: no root <Topic> under <Map>/<OneTopic>.");
  }

  idCounter = 0;
  const root = topicToNode(rootTopic, ctx);

  // Map-level floating topics (legends, sticky notes outside the central tree).
  const floatingTopics = [
    ...asList(map?.FloatingTopics?.Topic),
    ...asList(rootTopic?.FloatingTopics?.Topic),
  ].map((t) => topicToNode(t, ctx));

  const links = extractRelationships(map);

  // Honesty check: warn about any topics still left behind.
  const totalTopics = (xml.match(/<ap:Topic[\s>]/g) ?? []).length;
  const importedTopics =
    countNodes(root) + floatingTopics.reduce((sum, f) => sum + countNodes(f), 0);
  if (totalTopics > importedTopics) {
    ctx.warnings.push(
      `${totalTopics - importedTopics} topic(s) outside the central hierarchy (floating/detached) were not imported.`,
    );
  }

  // Floating (detached) topics are imported as-is; note that so their placement isn't a surprise.
  if (floatingTopics.length > 0) {
    ctx.warnings.push(
      `${floatingTopics.length} floating topic(s) imported — shown in a separate, editable "Floating topics" branch.`,
    );
  }

  const doc: MindMapDoc = {
    schemaVersion: 1,
    id: makeId(),
    title: root.topic || "Imported map",
    root,
    ...(links.length > 0 ? { links } : {}),
    ...(ctx.boundaries.length > 0 ? { boundaries: ctx.boundaries } : {}),
    ...(floatingTopics.length > 0 ? { floatingTopics } : {}),
    meta: { source: "mmap" },
  };

  return { doc, warnings: ctx.warnings };
}
