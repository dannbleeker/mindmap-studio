import type { MapNode, MindMapDoc, NodeStyle } from "../model/types";

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
  expanded?: boolean;
  root?: boolean;
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
  return me;
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

  // mind-elixir doesn't carry these — preserve from the previous doc by id so an
  // edit doesn't drop a node's note/task/image.
  const before = prev.get(me.id);
  if (before?.note) node.note = before.note;
  if (before?.task) node.task = before.task;
  if (before?.image) node.image = before.image;
  return node;
}

export function fromMindElixir(nodeData: MeNode, prevDoc: MindMapDoc): MindMapDoc {
  const prev = new Map<string, MapNode>();
  indexById(prevDoc.root, prev);
  const root = meToNode(nodeData, prev);
  // Keep prevDoc's links/boundaries/floating/meta — mind-elixir doesn't edit them.
  return { ...prevDoc, title: root.topic, root };
}
