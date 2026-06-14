import { strFromU8, unzipSync } from "fflate";
import type { MapNode, MindMapDoc } from "../model/types";
import { isDangerousUrl } from "./urlSafety";

// XMind `.xmind` -> canonical model (import only).
//
// A `.xmind` file is a ZIP. Modern XMind (2020+) stores the map in `content.json`: an
// array of sheets, each with a `rootTopic` whose `children.attached[]` form the tree.
// We map title -> topic, attached children -> children, `notes.plain.content` -> note,
// `href` -> hyperlink, and `labels[]` -> tags. Older `.xmind` (content.xml) and per-topic
// styling/markers are not imported. Export isn't offered yet — use `.opml`/`.md`/`.mm`,
// which XMind can import. fflate (already a dep for the Office exporters) does the unzip.

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
