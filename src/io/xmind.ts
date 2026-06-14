import { XMLParser } from "fast-xml-parser";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { MapNode, MindMapDoc } from "../model/types";
import { isDangerousUrl } from "./urlSafety";

// XMind `.xmind` <-> canonical model (two-way).
//
// A `.xmind` file is a ZIP. Modern XMind (2020+) stores the map in `content.json`: an
// array of sheets, each with a `rootTopic` whose `children.attached[]` form the tree.
// We map title -> topic, attached children -> children, `notes.plain.content` -> note,
// `href` -> hyperlink, and `labels[]` -> tags. Older XMind (pre-2020) stores the map in
// `content.xml`: root `<xmap-content>` → `<sheet>` → `<topic>`, with child topics under
// `<children><topics type="attached"><topic>…</topic></topics></children>`, notes under
// `<notes><plain>…</plain></notes>`, hyperlinks via an `xlink:href` attribute (normalised
// to `href` before parsing), and labels under `<labels><label>…</label></labels>`. Both
// paths are supported on import. Per-topic styling/markers are not imported. The exporter
// writes `content.json` (plus `metadata.json`/`manifest.json` XMind expects), so a round
// trip preserves the tree, notes, links, and tags; it also emits floating topics as
// `detached` and cross-links as sheet `relationships` for XMind's benefit (our importer
// doesn't read those back). fflate (already a dep for the Office exporters) does the
// zip/unzip.

// biome-ignore lint/suspicious/noExplicitAny: tolerant shape from arbitrary XMind JSON / XML
type Json = any;

function asList<T>(x: T | T[] | undefined | null): T[] {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

let xmId = 0;

function topicToNode(t: Json): MapNode {
  xmId += 1;
  const node: MapNode = {
    id: `xm${xmId}`,
    topic: String(t?.title ?? "").trim(),
    children: (Array.isArray(t?.children?.attached) ? t.children.attached : []).map(topicToNode),
  };
  const note = t?.notes?.plain?.content;
  if (typeof note === "string" && note.trim()) node.note = note.trim();
  const href = t?.href;
  // XMind uses xmind:#<id> for internal jumps and file:/attachment refs — keep only real
  // web links, and drop dangerous schemes exactly like the rest of the app.
  if (typeof href === "string" && href && !href.startsWith("xmind:") && !isDangerousUrl(href)) {
    node.hyperlink = href;
  }
  if (Array.isArray(t?.labels) && t.labels.length > 0) node.tags = t.labels.map(String);
  return node;
}

// --- legacy content.xml parser --------------------------------------------

// Convert a fast-xml-parser topic element (from legacy content.xml) into a MapNode.
// The parser is configured with ignoreAttributes:false, attributeNamePrefix:"@_".
// xlink:href has been pre-normalised to href in the raw XML before parsing so that
// fast-xml-parser sees a plain attribute (the colon in "xlink:href" would otherwise
// produce "@_xlink:href" which some parsers can't handle cleanly).
function xmlTopicToNode(t: Json): MapNode {
  xmId += 1;
  // <title> can come back as a string or as { "#text": string } when it has attributes.
  const rawTitle = t?.title;
  const topic =
    typeof rawTitle === "object" && rawTitle !== null
      ? String(rawTitle["#text"] ?? "").trim()
      : String(rawTitle ?? "").trim();

  // Attached children live at: children → topics[@_type="attached"] → topic[]
  const childTopicsContainers = asList(t?.children?.topics);
  const attachedContainer = childTopicsContainers.find((tp: Json) => tp?.["@_type"] === "attached");
  const children = asList(attachedContainer?.topic).map(xmlTopicToNode);

  const node: MapNode = { id: `xm${xmId}`, topic, children };

  // Notes: <notes><plain>text</plain></notes>
  const plainNote = t?.notes?.plain;
  const noteText =
    typeof plainNote === "string"
      ? plainNote.trim()
      : typeof plainNote === "object" && plainNote !== null
        ? String(plainNote["#text"] ?? "").trim()
        : "";
  if (noteText) node.note = noteText;

  // Hyperlink: href attribute (pre-normalised from xlink:href)
  const href = t?.["@_href"];
  if (typeof href === "string" && href && !href.startsWith("xmind:") && !isDangerousUrl(href)) {
    node.hyperlink = href;
  }

  // Labels/tags: <labels><label>text</label></labels>
  const labelItems = asList(t?.labels?.label);
  if (labelItems.length > 0) node.tags = labelItems.map(String);

  return node;
}

function fromXmindXml(xmlBytes: Uint8Array): MindMapDoc {
  let xmlText = strFromU8(xmlBytes);
  // Normalise xlink:href → href so fast-xml-parser sees a plain attribute name.
  // The xlink namespace declaration is harmless after this substitution.
  xmlText = xmlText.replace(/xlink:href=/g, "href=");

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const tree = parser.parse(xmlText);

  // Root element is <xmap-content>; fast-xml-parser keys it as "xmap-content".
  const xmapContent = tree?.["xmap-content"];
  if (!xmapContent) throw new Error("XMind content.xml: missing <xmap-content> root element");

  const sheet = asList(xmapContent?.sheet)[0];
  if (!sheet) throw new Error("XMind content.xml: no <sheet> found");

  const rootTopicEl = asList(sheet?.topic)[0];
  if (!rootTopicEl) throw new Error("XMind content.xml: sheet has no root <topic>");

  const root = xmlTopicToNode(rootTopicEl);

  // Sheet title: <title> child of <sheet>, or fall back to root topic text.
  const rawSheetTitle = sheet?.title;
  const sheetTitle =
    typeof rawSheetTitle === "object" && rawSheetTitle !== null
      ? String(rawSheetTitle["#text"] ?? "").trim()
      : String(rawSheetTitle ?? "").trim();

  const title = sheetTitle || root.topic || "Imported XMind map";
  return {
    schemaVersion: 1,
    id: `xm${xmId + 1}`,
    title,
    root,
    meta: { source: "xmind" },
  };
}

// --------------------------------------------------------------------------

export function fromXmind(bytes: Uint8Array): MindMapDoc {
  xmId = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("Not a valid .xmind file (could not unzip)");
  }

  // Modern XMind (2020+): content.json takes priority.
  const content = files["content.json"];
  if (content) {
    const sheets = JSON.parse(strFromU8(content));
    const sheet = Array.isArray(sheets) ? sheets[0] : sheets;
    const rootTopic = sheet?.rootTopic;
    if (!rootTopic) throw new Error("XMind file has no root topic");
    const root = topicToNode(rootTopic);
    const title = String(sheet?.title || root.topic || "Imported XMind map");
    return {
      schemaVersion: 1,
      id: `xm${xmId + 1}`,
      title,
      root,
      meta: { source: "xmind" },
    };
  }

  // Legacy XMind (pre-2020): fall back to content.xml.
  const xmlContent = files["content.xml"];
  if (xmlContent) {
    return fromXmindXml(xmlContent);
  }

  throw new Error("Unsupported .xmind: no content.json or content.xml found");
}

// --- export ---------------------------------------------------------------

function nodeToTopic(node: MapNode): Json {
  const topic: Json = { id: node.id, title: node.topic };
  if (node.children.length > 0) {
    topic.children = { attached: node.children.map(nodeToTopic) };
  }
  if (node.note) topic.notes = { plain: { content: node.note } };
  if (node.hyperlink && !isDangerousUrl(node.hyperlink)) topic.href = node.hyperlink;
  if (node.tags?.length) topic.labels = node.tags.map(String);
  return topic;
}

/** Canonical model -> a modern (2020+) `.xmind` ZIP (content.json + metadata + manifest). */
export function toXmind(doc: MindMapDoc): Uint8Array {
  const rootTopic = nodeToTopic(doc.root);
  // Floating topics aren't part of the central tree — XMind models them as detached children.
  const floating = (doc.floatingTopics ?? []).map(nodeToTopic);
  if (floating.length > 0) {
    rootTopic.children = { ...(rootTopic.children ?? {}), detached: floating };
  }
  const sheet: Json = {
    id: `${doc.id}-sheet`,
    class: "sheet",
    title: doc.title || "Sheet 1",
    rootTopic,
  };
  // Cross-links -> XMind relationships (referencing topic ids, which are our node ids).
  const rels = (doc.links ?? []).map((l) => ({
    id: l.id,
    end1Id: l.from,
    end2Id: l.to,
    ...(l.label ? { title: l.label } : {}),
  }));
  if (rels.length > 0) sheet.relationships = rels;

  const content = JSON.stringify([sheet]);
  const metadata = JSON.stringify({ creator: { name: "MindMap Studio" } });
  const manifest = JSON.stringify({
    "file-entries": { "content.json": {}, "metadata.json": {} },
  });
  return zipSync({
    "content.json": strToU8(content),
    "metadata.json": strToU8(metadata),
    "manifest.json": strToU8(manifest),
  });
}
