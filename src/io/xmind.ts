import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { MapNode, MindMapDoc } from "../model/types";
import { isDangerousUrl } from "./urlSafety";

// XMind `.xmind` <-> canonical model (two-way).
//
// A `.xmind` file is a ZIP. Modern XMind (2020+) stores the map in `content.json`: an
// array of sheets, each with a `rootTopic` whose `children.attached[]` form the tree.
// We map title -> topic, attached children -> children, `notes.plain.content` -> note,
// `href` -> hyperlink, and `labels[]` -> tags. Older `.xmind` (content.xml) and per-topic
// styling/markers are not imported. The exporter writes that same `content.json` (plus the
// `metadata.json`/`manifest.json` XMind expects), so a round trip preserves the tree, notes,
// links, and tags; it also emits floating topics as `detached` and cross-links as sheet
// `relationships` for XMind's benefit (our importer doesn't read those back). fflate (already a
// dep for the Office exporters) does the zip/unzip.

// biome-ignore lint/suspicious/noExplicitAny: tolerant shape from arbitrary XMind JSON
type Json = any;

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

export function fromXmind(bytes: Uint8Array): MindMapDoc {
  xmId = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("Not a valid .xmind file (could not unzip)");
  }
  const content = files["content.json"];
  if (!content) {
    throw new Error(
      "Unsupported .xmind: no content.json (older XMind files use content.xml, which isn't supported)",
    );
  }
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
