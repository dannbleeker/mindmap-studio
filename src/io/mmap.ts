import { strToU8, zipSync } from "fflate";
import { emojiToMindManagerIcon } from "../icons";
import type { CrossLink, MapNode, MindMapDoc, NodeId } from "../model/types";
import { isDangerousUrl } from "./urlSafety";
import { escapeXmlAttr } from "./xml";

// MindManager `.mmap` writer — the inverse of `src/import/mmap.ts`.
//
// A `.mmap` is a ZIP whose map lives in `Document.xml` (namespace
// http://schemas.mindjet.com/MindManager/Application/2003). We emit the exact element/attribute
// shapes the importer reads, so a Studio map exported here re-imports faithfully, and — with the
// `side` field — a two-sided map round-trips MindManager -> Studio -> MindManager.
//
// IMPORTANT — validation boundary: the importer parses with `removeNSPrefix: true`, so the
// programmatic `parseMmap(toMmap(doc))` round-trip proves our FIELD MAPPING but NOT that real
// MindManager will OPEN the file (it is strict about the schema/scaffolding). The MindManager-open
// scaffolding below (the `<ap:Map>` namespace block, `<ap:StyleGroup>`, per-topic Dirty/Gen) is kept
// in named constants so it can be tuned during a manual MindManager validation pass without touching
// the mapping logic. Until that pass passes, treat the output as "Studio-faithful", not
// "MindManager-verified".
//
// Emitted (round-trips via the importer): topic tree + text (Text@PlainText), notes
// (NotesGroup>NotesXhtmlData@PreviewPlainText), hyperlinks (Hyperlink@Url, dangerous schemes
// dropped), stock icons (curated emoji -> Icon@IconType), the two-sided side (Offset@CX sign on a
// depth-1 main + the root's SubTopicsShape LeftAndRight), relationships
// (Relationships>Relationship>2x ObjectReference@OIdRef), boundaries (Topic>OneBoundary, only when a
// boundary's node set equals a topic's full subtree — else dropped), and floating topics.
// Write-only (emitted but the importer doesn't read back): collapsed state. Dropped: rich text,
// images, tags, attachments, per-node style, callouts, freeform pos, per-branch layout, task/PM
// data, summaries, conditional rules, backdrop, theme — none have a round-trip path today.

// Pinned so the ZIP is byte-reproducible (same pattern as src/io/ooxml.ts).
const FIXED_MTIME = Date.parse("1980-01-01T00:00:00Z");

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
const XML_CLIENT = '<?xml-client name="MindManager" version="24.1.150" platform="Windows"?>';

// The <ap:Map> namespace + schemaLocation block, copied verbatim from a real MindManager export so
// MindManager recognises the document. Treated as an opaque constant — do not paraphrase.
const MAP_NS = [
  'xmlns:ap="http://schemas.mindjet.com/MindManager/Application/2003"',
  'xmlns:cor="http://schemas.mindjet.com/MindManager/Core/2003"',
  'xmlns:pri="http://schemas.mindjet.com/MindManager/Primitive/2003"',
  'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
  'xsi:schemaLocation="http://schemas.mindjet.com/MindManager/Application/2003 http://schemas.mindjet.com/MindManager/Application/2003 http://schemas.mindjet.com/MindManager/Core/2003 http://schemas.mindjet.com/MindManager/Core/2003 http://schemas.mindjet.com/MindManager/Primitive/2003 http://schemas.mindjet.com/MindManager/Primitive/2003"',
].join(" ");

// Change-tracking metadata MindManager stamps on every element. The importer ignores it; included as
// constants so exported files look native.
const META = 'Dirty="0000000000000001" Gen="0000000000000000"';

// Minimal root-style defaults, mirroring a real export's <ap:StyleGroup> just enough to open.
const STYLE_GROUP = [
  "<ap:StyleGroup><ap:RootTopicDefaultsGroup>",
  '<ap:DefaultColor Dirty="0000000000000000" FillColor="ffecf4fa" LineColor="ff3283c0"/>',
  '<ap:DefaultText TextAlignment="urn:mindjet:Center" VerticalTextAlignment="urn:mindjet:Top" Dirty="0000000000000000">',
  '<ap:Font Size="14." Color="ff000000" Name="Segoe UI"/></ap:DefaultText>',
  "</ap:RootTopicDefaultsGroup></ap:StyleGroup>",
].join("");

// Sanitise + escape a user string for an XML attribute. Two things `escapeXmlAttr` alone doesn't do:
// (1) normalise CRLF/CR to LF — a bare CR is folded to LF by XML end-of-line normalisation, so an
// unescaped CR would silently drop on re-import; (2) strip the C0 control chars XML 1.0 cannot
// represent (NUL etc.), which would otherwise make the document non-well-formed for a strict reader
// like MindManager. TAB and LF are kept. Done char-by-char to avoid a control-char regex (biome's
// noControlCharactersInRegex), matching urlSafety.ts.
function sanitizeText(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code === 0x0d) {
      out += "\n"; // CR / CRLF -> single LF
      if (s.charCodeAt(i + 1) === 0x0a) i++;
    } else if (code === 0x09 || code === 0x0a || code >= 0x20) {
      out += s[i];
    }
    // else: an XML-1.0-illegal C0 control char — dropped
  }
  return out;
}

const esc = (s: string): string => escapeXmlAttr(sanitizeText(s));

// --- deterministic OId (no time/randomness so the export is byte-stable) ----------------------------

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// 16 bytes -> 24-char base64 (the MindManager OId form). Local encoder because `btoa` is DOM-only and
// absent on the node/vitest path.
function base64Of(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    out += i + 2 < bytes.length ? B64[b2 & 63] : "=";
  }
  return out;
}

// A 16-byte value derived purely from the node id (four FNV-1a streams), shaped as an RFC-4122 v4
// GUID, then base64 — the importer reads this back as the node id, and relationships/boundaries
// reference the same value. Deterministic: identical input -> identical OId -> byte-stable export.
function oidFor(id: string): string {
  const bytes = new Uint8Array(16);
  for (let k = 0; k < 4; k++) {
    let h = (0x811c9dc5 ^ Math.imul(k + 1, 0x01000193)) >>> 0;
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    bytes[k * 4] = (h >>> 24) & 0xff;
    bytes[k * 4 + 1] = (h >>> 16) & 0xff;
    bytes[k * 4 + 2] = (h >>> 8) & 0xff;
    bytes[k * 4 + 3] = h & 0xff;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  return base64Of(bytes);
}

// --- tree helpers ----------------------------------------------------------------------------------

function collectIds(node: MapNode, into: Set<string>): void {
  into.add(node.id);
  for (const c of node.children) collectIds(c, into);
}

function setEq(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

// The importer turns a `<ap:OneBoundary>` into a boundary over the topic's WHOLE subtree, so the
// inverse is only faithful when a boundary's node set equals some topic's full subtree. Returns that
// topic's id, or null (the boundary is then dropped — an arbitrary cross-branch selection has no
// lossless representation in MindManager's subtree model).
function findSubtreeMatch(roots: MapNode[], target: Set<string>): NodeId | null {
  const stack = [...roots];
  while (stack.length > 0) {
    const n = stack.pop() as MapNode;
    const sub = new Set<string>();
    collectIds(n, sub);
    if (setEq(sub, target)) return n.id;
    for (const c of n.children) stack.push(c);
  }
  return null;
}

// --- XML emit --------------------------------------------------------------------------------------

function topicXml(
  node: MapNode,
  depth: number,
  oid: (id: string) => string,
  boundaryHeads: Set<NodeId>,
  central: boolean,
): string {
  const parts = [`<ap:Topic ${META} OId="${oid(node.id)}">`];
  parts.push(
    `<ap:TopicViewGroup><ap:Collapsed Collapsed="${node.collapsed ? "true" : "false"}"/></ap:TopicViewGroup>`,
  );
  parts.push(`<ap:Text PlainText="${esc(node.topic ?? "")}" ReadOnly="false"><ap:Font/></ap:Text>`);
  if (node.note) {
    parts.push(
      `<ap:NotesGroup><ap:NotesXhtmlData PreviewPlainText="${esc(node.note)}"/></ap:NotesGroup>`,
    );
  }
  if (node.hyperlink && !isDangerousUrl(node.hyperlink)) {
    parts.push(`<ap:Hyperlink Url="${esc(node.hyperlink)}"/>`);
  }
  const iconTypes = (node.icons ?? [])
    .map(emojiToMindManagerIcon)
    .filter((t): t is string => t !== null);
  if (iconTypes.length > 0) {
    const icons = iconTypes.map((t) => `<ap:Icon IconType="urn:mindjet:${t}"/>`).join("");
    parts.push(`<ap:IconsGroup><ap:Icons>${icons}</ap:Icons></ap:IconsGroup>`);
  }
  // Two-sided side marker — central main branches only (depth 1). MindManager records the half as the
  // sign of the horizontal offset; the magnitude is just a nudge. `side` is meaningless on a floating
  // subtree (no central axis), so it's gated to the central tree.
  if (central && depth === 1 && (node.side === "left" || node.side === "right")) {
    parts.push(`<ap:Offset CX="${node.side === "left" ? "-2." : "2."}" CY="0."/>`);
  }
  // A child element is required: an empty self-closing <ap:OneBoundary/> parses to "" (falsy), which
  // the importer's `if (topic.OneBoundary)` would skip — the real file nests an <ap:Boundary>.
  if (boundaryHeads.has(node.id)) parts.push("<ap:OneBoundary><ap:Boundary/></ap:OneBoundary>");
  if (node.children.length > 0) {
    const kids = node.children
      .map((c) => topicXml(c, depth + 1, oid, boundaryHeads, central))
      .join("");
    parts.push(`<ap:SubTopics>${kids}</ap:SubTopics>`);
  }
  // The central root carries the two-sided growth direction when any main branch has a side, so
  // MindManager honours the left/right split instead of auto-balancing. (The importer only needs
  // Offset@CX.) Not emitted for floating roots, which have no two-sided axis.
  if (
    central &&
    depth === 0 &&
    node.children.some((c) => c.side === "left" || c.side === "right")
  ) {
    parts.push('<ap:SubTopicsShape SubTopicsGrowthDirection="urn:mindjet:LeftAndRight"/>');
  }
  parts.push("</ap:Topic>");
  return parts.join("");
}

function relationshipXml(link: CrossLink, oid: (id: string) => string): string {
  const label = link.label ? `<ap:Text PlainText="${esc(link.label)}"/>` : "";
  const conn = (id: string) =>
    `<ap:ConnectionGroup><ap:Connection><ap:ObjectReference OIdRef="${oid(id)}"/></ap:Connection></ap:ConnectionGroup>`;
  return `<ap:Relationship>${label}${conn(link.from)}${conn(link.to)}</ap:Relationship>`;
}

/** Canonical model -> a MindManager `.mmap` ZIP (`Document.xml`). Pure + deterministic. */
export function toMmap(doc: MindMapDoc): Uint8Array {
  // One OId per node id (root subtree + every floating subtree), so relationships and boundaries
  // reference the same OId the topic emits.
  const oidCache = new Map<string, string>();
  const oid = (id: string): string => {
    const hit = oidCache.get(id);
    if (hit !== undefined) return hit;
    const v = oidFor(id);
    oidCache.set(id, v);
    return v;
  };

  const allRoots = [doc.root, ...(doc.floatingTopics ?? [])];

  // Boundaries -> the topic whose full subtree they enclose (others dropped).
  const boundaryHeads = new Set<NodeId>();
  for (const b of doc.boundaries ?? []) {
    if (!b.nodeIds?.length) continue;
    const head = findSubtreeMatch(allRoots, new Set(b.nodeIds));
    if (head) boundaryHeads.add(head);
  }

  const rootXml = topicXml(doc.root, 0, oid, boundaryHeads, true);

  // Relationships — only links whose endpoints both exist (mirror the importer's >=2-ref rule).
  const ids = new Set<string>();
  for (const r of allRoots) collectIds(r, ids);
  const links = (doc.links ?? []).filter((l) => ids.has(l.from) && ids.has(l.to));
  const relXml =
    links.length > 0
      ? `<ap:Relationships>${links.map((l) => relationshipXml(l, oid)).join("")}</ap:Relationships>`
      : "";

  const floats = doc.floatingTopics ?? [];
  const floatXml =
    floats.length > 0
      ? `<ap:FloatingTopics>${floats.map((f) => topicXml(f, 0, oid, boundaryHeads, false)).join("")}</ap:FloatingTopics>`
      : "";

  // The map element's own OId is seeded from a space-prefixed sentinel (no node id realistically
  // begins with a space) and is NOT routed through `oid`, so it can't collide with any node's OId,
  // keeping every OId in the exported file unique.
  const mapOid = oidFor(" mindmap-studio:map");
  const mapOpen = `<ap:Map ${META} OId="${mapOid}" ${MAP_NS}>`;
  const xml = `${XML_DECL}${XML_CLIENT}${mapOpen}<ap:OneTopic>${rootXml}</ap:OneTopic>${STYLE_GROUP}${relXml}${floatXml}</ap:Map>`;

  return zipSync({ "Document.xml": [strToU8(xml), { mtime: FIXED_MTIME }] }, { level: 6 });
}
