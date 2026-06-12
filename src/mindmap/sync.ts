import type { Boundary, CrossLink, MapNode, MindMapDoc, NodeStyle } from "../model/types";

/** A mind-elixir summary ≈ our Boundary (a bracket over a node's subtree). */
export interface MeSummary {
  id: string;
  label: string;
  parent: string;
  start: number;
  end: number;
}

// Two-way bridge between mind-elixir's node shape and our canonical model.
// mind-elixir is the editor; this lets edits on the canvas flow back into the
// model (for export + persistence), while preserving canonical-only fields
// (notes, tasks, images) that mind-elixir doesn't carry.

/** The subset of mind-elixir's NodeObj we read and write. */
export interface MeNode {
  id: string;
  topic: string;
  children?: MeNode[];
  style?: NodeStyle;
  tags?: string[];
  icons?: string[];
  hyperLink?: string;
  note?: string;
  image?: { url: string; width: number; height: number };
  expanded?: boolean;
  root?: boolean;
}

/** mind-elixir arrow ≈ our CrossLink (a labelled connection between two nodes). */
export interface MeArrow {
  id: string;
  label: string;
  from: string;
  to: string;
  delta1: { x: number; y: number };
  delta2: { x: number; y: number };
}

export function toMindElixir(node: MapNode): MeNode {
  const me: MeNode = {
    id: node.id,
    topic: node.topic,
    expanded: !node.collapsed,
    children: node.children.map(toMindElixir),
  };
  if (node.style) me.style = node.style;
  if (node.tags?.length) me.tags = node.tags;
  if (node.icons?.length) me.icons = node.icons;
  if (node.hyperlink) me.hyperLink = node.hyperlink;
  if (node.note) me.note = node.note;
  if (node.image) {
    me.image = {
      url: node.image.url,
      width: node.image.width ?? 120,
      height: node.image.height ?? 120,
    };
  }
  return me;
}

/** Reserved id for the synthetic branch that surfaces imported floating topics. */
export const FLOATING_NODE_ID = "__floating__";

// Build the mind-elixir root, appending any imported floating topics as one
// labelled branch so they're visible on the canvas — mind-elixir has no
// first-class detached nodes. The branch is display-only: fromMindElixir strips
// it back out, so it never enters the canonical model and edits to it aren't kept.
export function toMindElixirRoot(doc: MindMapDoc): MeNode {
  const root = toMindElixir(doc.root);
  const floating = doc.floatingTopics ?? [];
  if (floating.length > 0) {
    root.children = [
      ...(root.children ?? []),
      {
        id: FLOATING_NODE_ID,
        topic: "⚲ Floating topics",
        expanded: true,
        style: { color: "#73726c" },
        children: floating.map(toMindElixir),
      },
    ];
  }
  return root;
}

export function toArrows(links: CrossLink[] | undefined): MeArrow[] {
  return (links ?? []).map((link) => ({
    id: link.id,
    label: link.label ?? "",
    from: link.from,
    to: link.to,
    // Default control-point offsets so the curve renders; mind-elixir adjusts on drag.
    delta1: { x: -64, y: -64 },
    delta2: { x: 64, y: 64 },
  }));
}

// Map canonical boundaries → mind-elixir summaries. A boundary encloses a
// subtree (its `nodeIds[0]` is the subtree root); mind-elixir brackets a child
// range of a parent, so we bracket the root node within its parent (start ===
// end), and the bracket spans that node's subtree height. A boundary on the map
// root has no parent to bracket and is skipped. Render-only for now — summaries
// drawn on the canvas aren't captured back into the model yet.
export function toSummaries(doc: MindMapDoc): MeSummary[] {
  const boundaries = doc.boundaries;
  if (!boundaries?.length) return [];
  // Index each node's parent id + position among its siblings.
  const place = new Map<string, { parent: string; index: number }>();
  const walk = (node: MapNode) => {
    node.children.forEach((child, index) => {
      place.set(child.id, { parent: node.id, index });
      walk(child);
    });
  };
  walk(doc.root);
  const summaries: MeSummary[] = [];
  for (const b of boundaries) {
    const at = place.get(b.nodeIds[0]);
    if (!at) continue; // boundary on the map root (or an unknown node) — can't bracket
    summaries.push({
      id: b.id,
      label: b.label ?? "",
      parent: at.parent,
      start: at.index,
      end: at.index,
    });
  }
  return summaries;
}

function subtreeIds(node: MapNode): string[] {
  const ids = [node.id];
  for (const child of node.children) ids.push(...subtreeIds(child));
  return ids;
}

// Inverse of toSummaries: rebuild canonical boundaries from mind-elixir summaries
// (read off the canvas after an edit), so boundaries drawn or removed on the canvas
// round-trip into the model. A summary brackets `parent.children[start..end]`; the
// boundary encloses the subtrees under that range.
function fromSummaries(summaries: MeSummary[], root: MapNode): Boundary[] {
  const byId = new Map<string, MapNode>();
  const index = (node: MapNode) => {
    byId.set(node.id, node);
    node.children.forEach(index);
  };
  index(root);
  const boundaries: Boundary[] = [];
  for (const s of summaries) {
    const parent = byId.get(s.parent);
    if (!parent) continue;
    const range = parent.children.slice(s.start, s.end + 1);
    if (range.length === 0) continue;
    boundaries.push({
      id: s.id,
      nodeIds: range.flatMap(subtreeIds),
      ...(s.label ? { label: s.label } : {}),
    });
  }
  return boundaries;
}

function fromArrows(arrows: MeArrow[]): CrossLink[] {
  return arrows.map((a) => ({
    id: a.id,
    from: a.from,
    to: a.to,
    ...(a.label ? { label: a.label } : {}),
  }));
}

function indexById(node: MapNode, into: Map<string, MapNode>): void {
  into.set(node.id, node);
  for (const child of node.children) indexById(child, into);
}

function meToNode(me: MeNode, prev: Map<string, MapNode>): MapNode {
  const node: MapNode = {
    id: me.id,
    topic: me.topic,
    children: (me.children ?? []).map((child) => meToNode(child, prev)),
  };
  if (me.icons?.length) node.icons = me.icons;
  if (me.tags?.length) node.tags = me.tags;
  if (me.hyperLink) node.hyperlink = me.hyperLink;
  if (me.style) node.style = me.style;
  if (me.expanded === false) node.collapsed = true;

  // mind-elixir 5 carries `note` + `image` — prefer the live value, else keep the
  // prior one. task is canonical-only: preserve by id.
  const before = prev.get(me.id);
  const note = me.note ?? before?.note;
  if (note) node.note = note;
  if (before?.task) node.task = before.task;
  if (me.image) {
    node.image = { url: me.image.url, width: me.image.width, height: me.image.height };
  } else if (before?.image) {
    node.image = before.image;
  }
  return node;
}

export function fromMindElixir(
  nodeData: MeNode,
  prevDoc: MindMapDoc,
  arrows?: MeArrow[],
  summaries?: MeSummary[],
): MindMapDoc {
  const prev = new Map<string, MapNode>();
  indexById(prevDoc.root, prev);
  const root = meToNode(nodeData, prev);
  // The floating-topics branch is display-only — strip it so it never enters the
  // model. floatingTopics itself is preserved from prevDoc via the spread below.
  root.children = root.children.filter((child) => child.id !== FLOATING_NODE_ID);
  // Keep prevDoc's floating/meta. Arrows and summaries (when mind-elixir reports
  // them) round-trip back into links/boundaries; otherwise the prior ones persist.
  const result: MindMapDoc = { ...prevDoc, title: root.topic, root };
  if (arrows !== undefined) {
    const links = fromArrows(arrows);
    result.links = links.length > 0 ? links : undefined;
  }
  if (summaries !== undefined) {
    const boundaries = fromSummaries(summaries, root);
    result.boundaries = boundaries.length > 0 ? boundaries : undefined;
  }
  return result;
}
