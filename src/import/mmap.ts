import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";
import type { MapNode, MindMapDoc } from "../model/types";

// MindManager .mmap importer (one-way).
//
// A .mmap is a ZIP archive whose map lives in `Document.xml`, using the
// namespace http://schemas.mindjet.com/MindManager/Application/2003. The format
// is proprietary and only partially documented, so this importer is
// deliberately lossy + defensive: it recovers the topic tree (and notes), warns
// about features it sees but cannot yet map, and throws a *useful* error when
// handed something that is not a MindManager map.

export interface MmapImportResult {
  doc: MindMapDoc;
  warnings: string[];
}

const ATTR = "@_";

// biome-ignore lint/suspicious/noExplicitAny: parsed XML is dynamically shaped
type Xml = any;

function asList<T>(x: T | T[] | undefined | null): T[] {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

function extractText(topic: Xml): string {
  const t = topic?.Text;
  if (!t) return "";
  return String(t[`${ATTR}PlainText`] ?? t[`${ATTR}Text`] ?? t["#text"] ?? "");
}

function extractNote(topic: Xml): string | undefined {
  const n = topic?.Notes;
  if (!n) return undefined;
  const c = n?.CDATA?.[`${ATTR}Text`] ?? n?.[`${ATTR}Text`] ?? n?.["#text"];
  return c ? String(c) : undefined;
}

function extractIcons(topic: Xml): string[] {
  return asList(topic?.IconsGroup?.Icons?.Icon)
    .map((icon) => {
      const type = icon?.[`${ATTR}IconType`];
      // e.g. "urn:mindjet:ThumbsUp" -> "ThumbsUp"
      return typeof type === "string" ? type.replace(/^urn:mindjet:/, "") : "";
    })
    .filter((name) => name.length > 0);
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

function topicToNode(topic: Xml, warnings: string[]): MapNode {
  const node: MapNode = {
    id: String(topic?.[`${ATTR}OId`] ?? makeId()),
    topic: extractText(topic),
    children: [],
  };

  const note = extractNote(topic);
  if (note) node.note = note;

  const icons = extractIcons(topic);
  if (icons.length > 0) node.icons = icons;

  // Task scheduling data (dates, priority, progress) exists in real maps, but the
  // PM layer is out of scope — flag it rather than silently dropping it.
  if (topic?.Task) {
    warnings.push(
      `"${node.topic || node.id}": task info present — not imported (PM features out of scope).`,
    );
  }

  node.children = asList(topic?.SubTopics?.Topic).map((t) => topicToNode(t, warnings));
  return node;
}

export function parseMmap(zipBytes: Uint8Array): MmapImportResult {
  const warnings: string[] = [];

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
  const root = topicToNode(rootTopic, warnings);

  // Honesty check: warn about topics left behind — floating / detached topics
  // that live outside the central hierarchy (e.g. legends, sticky notes).
  const totalTopics = (xml.match(/<ap:Topic[\s>]/g) ?? []).length;
  const importedTopics = countNodes(root);
  if (totalTopics > importedTopics) {
    warnings.push(
      `${totalTopics - importedTopics} topic(s) outside the central hierarchy (floating/detached) were not imported.`,
    );
  }

  const doc: MindMapDoc = {
    schemaVersion: 1,
    id: makeId(),
    title: root.topic || "Imported map",
    root,
    meta: { source: "mmap" },
  };

  return { doc, warnings };
}
