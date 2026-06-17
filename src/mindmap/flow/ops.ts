import type {
  BackdropKind,
  Callout,
  ConditionalRule,
  CrossLink,
  MapAttachment,
  MapImage,
  MapNode,
  MindMapDoc,
  NodeStyle,
  TaskInfo,
} from "../../model/types";
import type { SelectionFields } from "../contract";

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

/** The ancestor chain (root → parent, excluding the node itself) and depth of a node in the central
 *  tree; depth 0 = the root. Returns null if the id isn't in the central tree (e.g. a floating
 *  topic). Pure — feeds the inspector's breadcrumb + facts line. */
export function nodePath(
  doc: MindMapDoc,
  id: string,
): { ancestors: MapNode[]; depth: number } | null {
  const path: MapNode[] = [];
  const walk = (node: MapNode): boolean => {
    if (node.id === id) return true;
    for (const child of node.children) {
      path.push(node);
      if (walk(child)) return true;
      path.pop();
    }
    return false;
  };
  if (!walk(doc.root)) return null;
  return { ancestors: path, depth: path.length };
}

/** Find a node by id anywhere in the doc — the central tree OR inside a floating topic's subtree. */
export function findAnyNode(doc: MindMapDoc, id: string): MapNode | null {
  const inTree = locate(doc.root, id)?.node;
  if (inTree) return inTree;
  for (const f of doc.floatingTopics ?? []) {
    const found = locate(f, id)?.node;
    if (found) return found;
  }
  return null;
}

/** Summarise the task fields across a multi-node selection: a field is "mixed" when the selected
 *  nodes hold more than one distinct value for it. Lets the inspector blank-out + label a field as
 *  "Mixed" in bulk mode instead of showing (and silently overwriting from) the anchor's value. Pure;
 *  `count` reflects only ids that resolve to a node. */
export function selectionFields(doc: MindMapDoc, ids: Iterable<string>): SelectionFields {
  const progress = new Set<number | undefined>();
  const priority = new Set<number | undefined>();
  const start = new Set<string | undefined>();
  const due = new Set<string | undefined>();
  let count = 0;
  for (const id of ids) {
    const node = findAnyNode(doc, id);
    if (!node) continue;
    count++;
    progress.add(node.task?.progress);
    priority.add(node.task?.priority);
    start.add(node.task?.start);
    due.add(node.task?.due);
  }
  return {
    count,
    mixed: {
      progress: progress.size > 1,
      priority: priority.size > 1,
      start: start.size > 1,
      due: due.size > 1,
    },
  };
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
  if (next.summaries) {
    const kept = next.summaries
      .map((s) => ({ ...s, nodeIds: s.nodeIds.filter((nid) => !removed.has(nid)) }))
      .filter((s) => s.nodeIds.length > 0);
    next.summaries = kept.length > 0 ? kept : undefined;
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

/** Deep-clone a subtree with fresh ids (so grafted/pasted nodes never collide with existing ones). */
function reId(node: MapNode): MapNode {
  return { ...node, id: makeId(), children: node.children.map(reId) };
}

/** Graft a forest of nodes (e.g. parsed from pasted text) as children of a node; expands it.
 *  The nodes are re-id'd, so the same parsed forest can be pasted repeatedly without id clashes. */
export function addSubtree(doc: MindMapDoc, parentId: string, nodes: MapNode[]): OpResult {
  if (nodes.length === 0) return { doc };
  const next = structuredClone(doc);
  const loc = locate(next.root, parentId);
  if (!loc) return { doc };
  const grafted = nodes.map(reId);
  loc.node.children.push(...grafted);
  loc.node.collapsed = false;
  return { doc: next, selectId: grafted[0]?.id };
}

/** Paste a copied branch: graft it (re-id'd) under `parentId` when that's a tree node, otherwise
 *  drop it in as a floating topic. Always inserts — the cross-map branch paste. Re-ids so the same
 *  clipboard branch can be pasted repeatedly (and across maps) without id clashes. */
export function pasteBranch(doc: MindMapDoc, parentId: string | null, node: MapNode): OpResult {
  const next = structuredClone(doc);
  const fresh = reId(node);
  if (parentId) {
    const loc = locate(next.root, parentId);
    if (loc) {
      loc.node.children.push(fresh);
      loc.node.collapsed = false;
      return { doc: next, selectId: fresh.id };
    }
  }
  next.floatingTopics = [...(next.floatingTopics ?? []), fresh];
  return { doc: next, selectId: fresh.id };
}

/** Add a detached floating topic (e.g. a link dropped onto the canvas), optionally with a link. */
export function addFloatingTopic(doc: MindMapDoc, topic: string, hyperlink?: string): OpResult {
  const next = structuredClone(doc);
  const node: MapNode = {
    id: makeId(),
    topic,
    children: [],
    ...(hyperlink ? { hyperlink } : {}),
  };
  next.floatingTopics = [...(next.floatingTopics ?? []), node];
  return { doc: next, selectId: node.id };
}

/** The look of a sticky note — an amber card with square corners. A sticky note is just a floating
 *  topic carrying this style, so it renders + exports through the normal per-topic style path. */
const STICKY_NOTE_STYLE: NodeStyle = {
  background: "#fef3c7",
  border: "1px solid #fcd34d",
  color: "#713f12",
  borderRadius: "2px",
};

/** Add a sticky note: a free-floating topic styled as an amber note card. New notes stagger so
 *  they don't stack exactly (the offset matters only in free-canvas mode; auto-layouts ignore it). */
export function addStickyNote(doc: MindMapDoc, text = "Note"): OpResult {
  const next = structuredClone(doc);
  const n = (next.floatingTopics ?? []).length;
  const node: MapNode = {
    id: makeId(),
    topic: text,
    children: [],
    style: { ...STICKY_NOTE_STYLE },
    pos: { x: 40 + n * 24, y: 40 + n * 24 },
  };
  next.floatingTopics = [...(next.floatingTopics ?? []), node];
  return { doc: next, selectId: node.id };
}

/** Replace a node's tags (an empty array clears them). */
export function setTags(doc: MindMapDoc, id: string, tags: string[]): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc) return { doc };
  loc.node.tags = tags.length > 0 ? tags : undefined;
  return { doc: next };
}

/** Merge a patch into a node's TaskInfo; a key set to undefined/"" is dropped, and the whole `task`
 *  object falls away once it carries nothing — so clearing the last field stops it being a task. */
function patchTask(doc: MindMapDoc, id: string, patch: Partial<TaskInfo>): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc) return { doc };
  const merged: TaskInfo = {};
  for (const [k, v] of Object.entries({ ...(loc.node.task ?? {}), ...patch }))
    if (v !== undefined && v !== "") (merged as Record<string, unknown>)[k] = v;
  loc.node.task = Object.keys(merged).length > 0 ? merged : undefined;
  return { doc: next };
}

/** Set a node's task completion (0..1), or clear its task status with `undefined`. */
export function setProgress(doc: MindMapDoc, id: string, progress: number | undefined): OpResult {
  return patchTask(doc, id, {
    progress: progress === undefined ? undefined : Math.max(0, Math.min(1, progress)),
  });
}

/** Set a node's due date ("YYYY-MM-DD"), or clear it with "" / undefined. */
export function setDue(doc: MindMapDoc, id: string, due: string | undefined): OpResult {
  return patchTask(doc, id, { due: due || undefined });
}

/** Set a node's start date ("YYYY-MM-DD"), or clear it with "" / undefined. */
export function setStart(doc: MindMapDoc, id: string, start: string | undefined): OpResult {
  return patchTask(doc, id, { start: start || undefined });
}

/** Set a node's task priority (1 = High .. 3 = Low), or clear it with undefined. */
export function setPriority(doc: MindMapDoc, id: string, priority: number | undefined): OpResult {
  return patchTask(doc, id, { priority });
}

/** Replace the map's conditional-formatting rules (an empty array clears them). */
export function setRules(doc: MindMapDoc, rules: ConditionalRule[]): OpResult {
  const next = structuredClone(doc);
  next.rules = rules.length > 0 ? rules : undefined;
  return { doc: next };
}

/** Set the per-map canvas background colour ("" clears it back to the theme default). */
export function setBackground(doc: MindMapDoc, color: string): OpResult {
  const next = structuredClone(doc);
  next.meta = { ...next.meta, background: color || undefined };
  return { doc: next };
}

/** Set the per-map canvas background image (a data: URL); "" clears it. The image draws behind
 *  everything, on top of any background colour. */
export function setBackgroundImage(doc: MindMapDoc, url: string): OpResult {
  const next = structuredClone(doc);
  next.meta = { ...next.meta, backgroundImage: url || undefined };
  return { doc: next };
}

/** Toggle line-jumps: draw a hop where two relationship lines cross (false clears the flag). */
export function setLineJumps(doc: MindMapDoc, on: boolean): OpResult {
  const next = structuredClone(doc);
  next.meta = { ...next.meta, lineJumps: on || undefined };
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

/** Append a file attachment to a node. */
export function addAttachment(doc: MindMapDoc, id: string, attachment: MapAttachment): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc) return { doc };
  loc.node.attachments = [...(loc.node.attachments ?? []), attachment];
  return { doc: next };
}

/** Remove the attachment at `index` from a node (clearing the array when it empties). */
export function removeAttachment(doc: MindMapDoc, id: string, index: number): OpResult {
  const next = structuredClone(doc);
  const loc = locate(next.root, id);
  if (!loc?.node.attachments) return { doc };
  const kept = loc.node.attachments.filter((_, i) => i !== index);
  loc.node.attachments = kept.length > 0 ? kept : undefined;
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

/** Set (or clear, with "") a cross-link's label — preserving its style fields. */
export function setLinkLabel(doc: MindMapDoc, id: string, label: string): OpResult {
  if (!(doc.links ?? []).some((l) => l.id === id)) return { doc };
  const next = structuredClone(doc);
  next.links = (next.links ?? []).map((l) => {
    if (l.id !== id) return l;
    const { label: _drop, ...rest } = l;
    return label ? { ...rest, label } : rest;
  });
  return { doc: next };
}

/** Set a cross-link's arrowhead placement. "to" is the implicit default (single-headed at the
 *  target, today's look), so it's stored as the absence of the field to keep the .json lean. */
export function setLinkArrow(doc: MindMapDoc, id: string, arrow: CrossLink["arrow"]): OpResult {
  if (!(doc.links ?? []).some((l) => l.id === id)) return { doc };
  const next = structuredClone(doc);
  next.links = (next.links ?? []).map((l) => {
    if (l.id !== id) return l;
    const { arrow: _drop, ...rest } = l;
    return arrow && arrow !== "to" ? { ...rest, arrow } : rest;
  });
  return { doc: next };
}

/** Merge a style patch (colour / width / dash) into a cross-link. A field cleared to a falsy value —
 *  or `dash:"dashed"` (the implicit default) — is dropped, so a reset link serialises field-free. */
export function setLinkStyle(
  doc: MindMapDoc,
  id: string,
  patch: { color?: string; width?: number; dash?: CrossLink["dash"] },
): OpResult {
  if (!(doc.links ?? []).some((l) => l.id === id)) return { doc };
  const next = structuredClone(doc);
  next.links = (next.links ?? []).map((l) => {
    if (l.id !== id) return l;
    const merged = {
      ...l,
      ...("color" in patch ? { color: patch.color || undefined } : {}),
      ...("width" in patch ? { width: patch.width || undefined } : {}),
      ...("dash" in patch
        ? { dash: patch.dash && patch.dash !== "dashed" ? patch.dash : undefined }
        : {}),
    };
    // Strip keys now undefined so a cleared field doesn't survive in the lossless .json.
    return Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined),
    ) as unknown as CrossLink;
  });
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

/** Add a labelled summary bracket around a node and its whole subtree. */
export function groupSummary(doc: MindMapDoc, id: string): OpResult {
  const node = findNode(doc, id);
  if (!node) return { doc };
  const ids: string[] = [];
  const collect = (n: MapNode) => {
    ids.push(n.id);
    for (const c of n.children) collect(c);
  };
  collect(node);
  const next = structuredClone(doc);
  next.summaries = [...(next.summaries ?? []), { id: makeId(), nodeIds: ids, label: "Summary" }];
  return { doc: next, selectId: id };
}

/** Set (or clear, with "") a summary's label by id. */
export function setSummaryLabel(doc: MindMapDoc, id: string, label: string): OpResult {
  if (!(doc.summaries ?? []).some((s) => s.id === id)) return { doc };
  const next = structuredClone(doc);
  next.summaries = (next.summaries ?? []).map((s) =>
    s.id === id ? { ...s, label: label.trim() || undefined } : s,
  );
  return { doc: next };
}

/** Remove a summary by id (clearing the array when it empties). */
export function deleteSummary(doc: MindMapDoc, id: string): OpResult {
  if (!(doc.summaries ?? []).some((s) => s.id === id)) return { doc };
  const next = structuredClone(doc);
  const kept = (next.summaries ?? []).filter((s) => s.id !== id);
  next.summaries = kept.length > 0 ? kept : undefined;
  return { doc: next };
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

// --- free-canvas (whiteboard) mode -----------------------------------------

/** Set a node's explicit free-canvas position (top-left, flow coords). Searches the tree and
 *  floating topics, so any node can be placed; a no-op (same doc) if the id isn't found. */
export function setNodePos(doc: MindMapDoc, id: string, x: number, y: number): OpResult {
  const next = structuredClone(doc);
  const walk = (n: MapNode): boolean => {
    if (n.id === id) {
      n.pos = { x, y };
      return true;
    }
    return n.children.some(walk);
  };
  let hit = walk(next.root);
  if (!hit) {
    for (const f of next.floatingTopics ?? []) {
      if (walk(f)) {
        hit = true;
        break;
      }
    }
  }
  return { doc: hit ? next : doc };
}

// --- dedicated diagram backdrops (onion / funnel / Venn) -------------------

/** Set (or replace) the map's diagram backdrop. */
export function setBackdrop(doc: MindMapDoc, kind: BackdropKind, rings?: number): OpResult {
  const next = structuredClone(doc);
  next.backdrop = rings !== undefined ? { kind, rings } : { kind };
  return { doc: next };
}

/** Add/remove a ring or stage on an onion/funnel backdrop (clamped to 2..6); no-op for venn. */
export function setBackdropRings(doc: MindMapDoc, delta: number): OpResult {
  const b = doc.backdrop;
  if (!b || b.kind === "venn2" || b.kind === "venn3") return { doc };
  const next = structuredClone(doc);
  if (next.backdrop) next.backdrop.rings = Math.max(2, Math.min(6, (b.rings ?? 3) + delta));
  return { doc: next };
}

/** Remove the diagram backdrop. */
export function clearBackdrop(doc: MindMapDoc): OpResult {
  if (!doc.backdrop) return { doc };
  const next = structuredClone(doc);
  next.backdrop = undefined;
  return { doc: next };
}

/** Per-branch layout: set (or clear, with undefined / "") a node's subtree layout override.
 *  Searches the tree and floating topics; a no-op (same doc) if the id isn't found. */
export function setNodeLayout(doc: MindMapDoc, id: string, kind: string | undefined): OpResult {
  const next = structuredClone(doc);
  const walk = (n: MapNode): boolean => {
    if (n.id === id) {
      n.layout = kind || undefined;
      return true;
    }
    return n.children.some(walk);
  };
  let hit = walk(next.root);
  if (!hit) {
    for (const f of next.floatingTopics ?? []) {
      if (walk(f)) {
        hit = true;
        break;
      }
    }
  }
  return { doc: hit ? next : doc };
}

// --- automated multi-map roll-ups -----------------------------------------

/** Bind (or unbind, with undefined / "") a node to a roll-up source map id. The node's children then
 *  mirror that map, refreshed by `refreshRollups`. Searches tree + floating; no-op if id not found. */
export function setRollup(doc: MindMapDoc, id: string, mapId: string | undefined): OpResult {
  const next = structuredClone(doc);
  const walk = (n: MapNode): boolean => {
    if (n.id === id) {
      n.rollup = mapId || undefined;
      return true;
    }
    return n.children.some(walk);
  };
  let hit = walk(next.root);
  if (!hit) {
    for (const f of next.floatingTopics ?? []) {
      if (walk(f)) {
        hit = true;
        break;
      }
    }
  }
  return { doc: hit ? next : doc };
}

/** Every distinct roll-up source map id referenced in the doc (tree + floating topics). */
export function collectRollupMapIds(doc: MindMapDoc): string[] {
  const ids = new Set<string>();
  const walk = (n: MapNode) => {
    if (n.rollup) ids.add(n.rollup);
    n.children.forEach(walk);
  };
  walk(doc.root);
  for (const f of doc.floatingTopics ?? []) walk(f);
  return [...ids];
}

/** Replace every roll-up node's children with a fresh copy of its source map's branches. `sources`
 *  maps a source map id → that map's root children. Pure; re-ids so pulled nodes never clash, and a
 *  refreshed node isn't recursed into (its subtree is fully managed by the pull). A source missing
 *  from `sources` leaves that node untouched. Returns the doc + the number of roll-ups refreshed. */
export function applyRollups(
  doc: MindMapDoc,
  sources: Map<string, MapNode[]>,
): { doc: MindMapDoc; count: number } {
  const next = structuredClone(doc);
  let count = 0;
  const walk = (n: MapNode) => {
    if (n.rollup && sources.has(n.rollup)) {
      n.children = (sources.get(n.rollup) ?? []).map(reId);
      n.collapsed = false;
      count += 1;
      return; // the pulled subtree is owned by the roll-up — don't recurse into it
    }
    n.children.forEach(walk);
  };
  walk(next.root);
  for (const f of next.floatingTopics ?? []) walk(f);
  return { doc: count > 0 ? next : doc, count };
}

/** Toggle free-canvas mode. When enabling with a positions map, seed each node's `pos` from it so
 *  the switch is seamless; disabling clears the flag but keeps positions (for re-enabling). */
export function setFreeform(
  doc: MindMapDoc,
  on: boolean,
  positions?: Map<string, { x: number; y: number }>,
): OpResult {
  const next = structuredClone(doc);
  next.meta = { ...next.meta, freeform: on || undefined };
  if (on && positions) {
    const seed = (n: MapNode): void => {
      const p = positions.get(n.id);
      if (p) n.pos = { x: p.x, y: p.y };
      n.children.forEach(seed);
    };
    seed(next.root);
    for (const f of next.floatingTopics ?? []) seed(f);
  }
  return { doc: next };
}
