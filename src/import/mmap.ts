import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";
import { mindManagerIconToEmoji } from "../icons";
import { isDangerousUrl } from "../io/urlSafety";
import type { Boundary, CrossLink, MapNode, MindMapDoc, NodeId } from "../model/types";

// MindManager .mmap importer (one-way).
//
// A .mmap is a ZIP archive whose map lives in `Document.xml`, namespace
// http://schemas.mindjet.com/MindManager/Application/2003. The field shapes
// below are taken from the bundled XSD schemas, so they are authoritative
// (not guessed). The importer is defensive: it recovers everything it
// understands, warns about what it deliberately drops, and throws a useful
// error when handed something that is not a MindManager map.
//
// Imported: topic tree + text (Text@PlainText), notes
// (NotesGroup>NotesXhtmlData@PreviewPlainText), stock icons (Icon@IconType),
// hyperlinks (Hyperlink@Url), relationships (Relationships>Relationship>2x
// ConnectionGroup>Connection>ObjectReference@OIdRef), boundaries
// (Topic>OneBoundary, over the topic's subtree), and floating topics
// (FloatingTopics). Out of scope: the task/PM layer (warned, not imported).

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

function extractNote(topic: Xml): string | undefined {
  // Authoritative: NotesGroup > NotesXhtmlData[@PreviewPlainText].
  const preview = topic?.NotesGroup?.NotesXhtmlData?.[`${ATTR}PreviewPlainText`];
  if (preview) return String(preview);
  // Tolerate other note shapes.
  const legacy = topic?.Notes?.CDATA?.[`${ATTR}Text`] ?? topic?.Notes?.["#text"];
  return legacy ? String(legacy) : undefined;
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

function topicToNode(topic: Xml, ctx: ParseContext): MapNode {
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

  // Task scheduling data (dates, priority, progress) is out of scope (no PM
  // layer) — flag it rather than silently dropping it.
  if (topic?.Task) {
    ctx.warnings.push(
      `"${node.topic || node.id}": task info present — not imported (PM features out of scope).`,
    );
  }

  node.children = asList(topic?.SubTopics?.Topic).map((child) => topicToNode(child, ctx));

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
