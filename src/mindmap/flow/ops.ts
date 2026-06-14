import type {
  Callout,
  CrossLink,
  MapImage,
  MapNode,
  MindMapDoc,
  NodeStyle,
} from "../../model/types";

// Pure tree-edit transforms on the canonical MindMapDoc. Each returns a NEW doc (the input
// is never mutated) plus, where relevant, the id to select next. This is the model-first
// heart of the React Flow editor: keyboard/drag/handle edits all run through these, then the
// canvas re-projects + re-lays-out from the result — so the model is always the source of
// truth (which also makes snapshot undo trivially correct). Fully unit-tested.

export interface OpResult {
  doc: MindMapDoc;
  /** The node to select/edit after the op (when the op implies one). */
  selectId?: string;
}

function makeId(): string {
  const c = globalThis.crypto;
  return c?.randomUUID
    ? c.randomUUID()
    : `n-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

interface Located {
  node: MapNode;
  parent: MapNode | null;
  index: number;
}

/** Find a node (and its parent + sibling index) in a tree. */
function locate(root: MapNode, id: string): Located | null {
  if (root.id === id) return { node: root, parent: null, index: -1 };
  const walk = (parent: MapNode): Located | null => {
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      if (child.id === id) return { node: child, parent, index: i };
      const found = walk(child);
      if (found) return found;
    }
    return null;
  };
  return walk(root);
}

function isDescendant(node: MapNode, id: string): boolean {
  return node.children.some((c) => c.id === id || isDescendant(c, id));
}

/** Find a node by id (read-only convenience). */
export function findNode(doc: MindMapDoc, id: string): MapNode | null {
  return locate(doc.root, id)?.node ?? null;
}

// --- structural edits ------------------------------------------------------

/** Add an empty sibling after `id` (a root gets a child, since it has no sibling). */
export function addSibling(doc: MindMapDoc, id: string): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc) return { doc };
  if (!loc.parent) return addChild(doc, id);
  const sib: MapNode = { id: makeId(), topic: "", children: [] };
  loc.parent.children.splice(loc.index + 1, 0, sib);
  return { doc: next, selectId: sib.id };
}

/** Append an empty child to `id` and expand it. */
export function addChild(doc: MindMapDoc, id: string): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc) return { doc };
  const child: MapNode = { id: makeId(), topic: "", children: [] };
  loc.node.children.push(child);
  loc.node.collapsed = false;
  return { doc: next, selectId: child.id };
}

/** Move `id` up to be a sibling of its parent (no-op if the parent is the root). */
export function outdent(doc: MindMapDoc, id: string): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc || !loc.parent) return { doc };
  const grand = locate(next.root, loc.parent.id);
  if (!grand || !grand.parent) return { doc };
  loc.parent.children.splice(loc.index, 1);
  grand.parent.children.splice(grand.index + 1, 0, loc.node);
  return { doc: next, selectId: loc.node.id };
}

/** Move `id` under its previous sibling (no-op if it's the first child). */
export function indent(doc: MindMapDoc, id: string): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc || !loc.parent || loc.index === 0) return { doc };
  const prev = loc.parent.children[loc.index - 1];
  loc.parent.children.splice(loc.index, 1);
  prev.children.push(loc.node);
  prev.collapsed = false;
  return { doc: next, selectId: loc.node.id };
}

/** Remove a node's subtree; prune dangling links/boundaries; select a neighbour. */
export function deleteNode(doc: MindMapDoc, id: string): OpResult {
  const probe = locate(doc.root, id);
  if (!probe || !probe.parent) return { doc }; // can't delete the root
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc || !loc.parent) return { doc };
  const parent = loc.parent;
  parent.children.splice(loc.index, 1);
  const selectId =
    parent.children[loc.index]?.id ?? parent.children[loc.index - 1]?.id ?? parent.id;

  const removed = new Set<string>();
  const collect = (n: MapNode) => {
    removed.add(n.id);
    for (const c of n.children) collect(c);
  };
  collect(loc.node);
  if (next.links) next.links = next.links.filter((l) => !removed.has(l.from) && !removed.has(l.to));
  if (next.boundaries) {
    const kept = next.boundaries
      .map((b) => ({ ...b, nodeIds: b.nodeIds.filter((nid) => !removed.has(nid)) }))
      .filter((b) => b.nodeIds.length > 0);
    next.boundaries = kept.length > 0 ? kept : undefined;
  }
  return { doc: next, selectId };
}

/** Move a subtree under a new parent (guards against cycles). */
export function reparent(
  doc: MindMapDoc,
  id: string,
  newParentId: string,
  index?: number,
): OpResult {
  if (id === newParentId) return { doc };
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  const dest = locate(next.root, newParentId);
  if (!loc || !loc.parent || !dest) return { doc };
  if (isDescendant(loc.node, newParentId)) return { doc }; // would create a cycle
  loc.parent.children.splice(loc.index, 1);
  const at = index ?? dest.node.children.length;
  dest.node.children.splice(at, 0, loc.node);
  dest.node.collapsed = false;
  return { doc: next, selectId: id };
}

// --- content edits ---------------------------------------------------------

/** Set a node's topic text (renaming the root also updates the doc title). */
export function setTopic(doc: MindMapDoc, id: string, topic: string): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc) return { doc };
  loc.node.topic = topic;
  if (!loc.parent) next.title = topic || next.title;
  return { doc: next };
}

/**
 * Set a node's rich-text topic. `rich` is already-sanitised inline HTML (or undefined when the
 * text carries no formatting); `plain` is its plain-text form, stored on `topic` as the fallback.
 * Pure — the caller (a browser context) does the DOM sanitising, so this stays node-testable.
 */
export function setTopicRich(
  doc: MindMapDoc,
  id: string,
  rich: string | undefined,
  plain: string,
): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc) return { doc };
  loc.node.topic = plain;
  loc.node.topicRich = rich || undefined;
  if (!loc.parent) next.title = plain || next.title;
  return { doc: next };
}

/** Toggle a node's collapsed state (no-op for a leaf). */
export function toggleCollapse(doc: MindMapDoc, id: string): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc || loc.node.children.length === 0) return { doc };
  loc.node.collapsed = !loc.node.collapsed;
  return { doc: next };
}

/** Collapse (false) or expand (true) every branch below the root. */
export function setAllExpanded(doc: MindMapDoc, expanded: boolean): OpResult {
  const next = structuredClone(doc);
  const walk = (node: MapNode, isRoot: boolean) => {
    if (!isRoot && node.children.length > 0) node.collapsed = !expanded;
    for (const c of node.children) walk(c, false);
  };
  walk(next.root, true);
  return { doc: next };
}

/** Set the note on a node (empty or whitespace-only clears it). */
export function setNote(doc: MindMapDoc, id: string, note: string): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc) return { doc };
  // A blank or whitespace-only note is "no note" — clear it so the 📝 indicator disappears
  // (matches the Outline panel, which has always judged notes by their trimmed content).
  loc.node.note = note.trim() ? note : undefined;
  return { doc: next };
}

/** Set a node's hyperlink ("" clears it). */
export function setHyperlink(doc: MindMapDoc, id: string, url: string): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc) return { doc };
  loc.node.hyperlink = url || undefined;
  return { doc: next };
}

/** Set a node's image. */
export function setImage(doc: MindMapDoc, id: string, image: MapImage): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc) return { doc };
  loc.node.image = image;
  return { doc: next };
}

/** Toggle a marker icon on a node. */
export function toggleIcon(doc: MindMapDoc, id: string, icon: string): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc) return { doc };
  const icons = loc.node.icons ?? [];
  const i = icons.indexOf(icon);
  if (i >= 0) icons.splice(i, 1);
  else icons.push(icon);
  loc.node.icons = icons.length > 0 ? icons : undefined;
  return { doc: next };
}

// --- callouts (anchored annotation bubbles) --------------------------------

/** Add a callout to a node (offset staggered by existing count so they don't stack). */
export function addCallout(doc: MindMapDoc, nodeId: string): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, nodeId);
  if (!loc) return { doc };
  const callouts = loc.node.callouts ?? [];
  const callout: Callout = { id: makeId(), text: "Note", dx: 48, dy: -28 + callouts.length * 46 };
  loc.node.callouts = [...callouts, callout];
  return { doc: next, selectId: nodeId };
}

/** Set a callout's text. */
export function setCalloutText(
  doc: MindMapDoc,
  nodeId: string,
  calloutId: string,
  text: string,
): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, nodeId);
  const callout = loc?.node.callouts?.find((c) => c.id === calloutId);
  if (!callout) return { doc };
  callout.text = text;
  return { doc: next };
}

/** Remove a callout (clearing the array when it empties). */
export function deleteCallout(doc: MindMapDoc, nodeId: string, calloutId: string): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, nodeId);
  if (!loc?.node.callouts) return { doc };
  const kept = loc.node.callouts.filter((c) => c.id !== calloutId);
  loc.node.callouts = kept.length > 0 ? kept : undefined;
  return { doc: next };
}

// --- cross-links (relationship arrows) -------------------------------------

/** Add a labelled cross-link between two distinct, existing nodes (no exact duplicate). */
export function addLink(doc: MindMapDoc, from: string, to: string, label?: string): OpResult {
  if (from === to || !findNode(doc, from) || !findNode(doc, to)) return { doc };
  if ((doc.links ?? []).some((l) => l.from === from && l.to === to)) return { doc };
  const next = structuredClone(doc);
  const link: CrossLink = { id: makeId(), from, to, ...(label ? { label } : {}) };
  next.links = [...(next.links ?? []), link];
  return { doc: next };
}

/** Set (or clear, with "") a cross-link's label. */
export function setLinkLabel(doc: MindMapDoc, id: string, label: string): OpResult {
  if (!(doc.links ?? []).some((l) => l.id === id)) return { doc };
  const next = structuredClone(doc);
  next.links = (next.links ?? []).map((l) =>
    l.id === id ? (label ? { ...l, label } : { id: l.id, from: l.from, to: l.to }) : l,
  );
  return { doc: next };
}

/** Remove a cross-link by id (clearing the array when it empties). */
export function deleteLink(doc: MindMapDoc, id: string): OpResult {
  if (!(doc.links ?? []).some((l) => l.id === id)) return { doc };
  const next = structuredClone(doc);
  const kept = (next.links ?? []).filter((l) => l.id !== id);
  next.links = kept.length > 0 ? kept : undefined;
  return { doc: next };
}

/** Add a filled boundary around a node and its whole subtree. */
export function groupBranch(doc: MindMapDoc, id: string): OpResult {
  const node = findNode(doc, id);
  if (!node) return { doc };
  const ids: string[] = [];
  const collect = (n: MapNode) => {
    ids.push(n.id);
    for (const c of n.children) collect(c);
  };
  collect(node);
  const next = structuredClone(doc);
  next.boundaries = [...(next.boundaries ?? []), { id: makeId(), nodeIds: ids }];
  return { doc: next, selectId: id };
}

/** Replace `query` (case-insensitive) in every topic; returns the doc + count changed. */
export function replaceTopics(
  doc: MindMapDoc,
  query: string,
  replacement: string,
): { doc: MindMapDoc; count: number } {
  if (!query) return { doc, count: 0 };
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const next = structuredClone(doc);
  let count = 0;
  const walk = (n: MapNode) => {
    const replaced = n.topic.replace(new RegExp(escaped, "gi"), replacement);
    if (replaced !== n.topic) {
      n.topic = replaced;
      count += 1;
    }
    for (const c of n.children) walk(c);
  };
  walk(next.root);
  if (count > 0) next.title = next.root.topic || next.title;
  return { doc: count > 0 ? next : doc, count };
}

/** Merge a style patch into a node ("" / null clears a key; an empty style is dropped). */
export function mergeStyle(doc: MindMapDoc, id: string, patch: Partial<NodeStyle>): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc) return { doc };
  const merged: Record<string, string> = { ...(loc.node.style ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === "" || v == null) delete merged[k];
    else merged[k] = v;
  }
  loc.node.style = Object.keys(merged).length > 0 ? (merged as NodeStyle) : undefined;
  return { doc: next };
}
