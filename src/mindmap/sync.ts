import type { CrossLink, MapNode, MindMapDoc, NodeStyle } from "../model/types";

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
  return me;
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

  // mind-elixir 5 carries `note` (node-menu's memo editor) — prefer the live
  // value, else keep the prior one. task/image are canonical-only: preserve by id.
  const before = prev.get(me.id);
  const note = me.note ?? before?.note;
  if (note) node.note = note;
  if (before?.task) node.task = before.task;
  if (before?.image) node.image = before.image;
  return node;
}

export function fromMindElixir(
  nodeData: MeNode,
  prevDoc: MindMapDoc,
  arrows?: MeArrow[],
): MindMapDoc {
  const prev = new Map<string, MapNode>();
  indexById(prevDoc.root, prev);
  const root = meToNode(nodeData, prev);
  // Keep prevDoc's boundaries/floating/meta. Arrows (when mind-elixir reports
  // them) round-trip back into links; otherwise the prior links are preserved.
  const result: MindMapDoc = { ...prevDoc, title: root.topic, root };
  if (arrows !== undefined) {
    const links = fromArrows(arrows);
    result.links = links.length > 0 ? links : undefined;
  }
  return result;
}
