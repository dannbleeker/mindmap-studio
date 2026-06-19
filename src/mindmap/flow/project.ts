import type { MapNode, MindMapDoc } from "../../model/types";
import { outlineNumbers } from "../../outline";
import { type ProgressInfo, progressMap } from "../../progress";
import { conditionalStyle } from "../../rules";
import type { LayoutKind } from "../contract";
import { CROSSLINK_COLOR } from "./style";
import type { FlowEdge, TopicNode } from "./types";

// Pure projection: canonical MindMapDoc → React Flow nodes + edges (positions are 0,0
// here; layout.ts assigns them). One node per MapNode; one "branch" edge per parent→child;
// cross-links become "crosslink" edges; floating topics become detached nodes. Branch
// colour follows the palette cycled by root-branch (the MindManager "coloured branch"
// identity). Collapsed subtrees are omitted (the node stays, flagged hasChildren). Pure +
// unit-tested — the read-only render and (later) the SVG export both build on it.

const FALLBACK_PALETTE = [
  "#E8593C",
  "#3B8BD4",
  "#27500A",
  "#BA7517",
  "#72243E",
  "#0C447C",
  "#993C1D",
];
const ROOT_COLOR = "#26215c";

export interface ProjectResult {
  nodes: TopicNode[];
  edges: FlowEdge[];
}

/** Count nodes in a subtree (used to balance the two sides). */
function subtreeSize(node: MapNode): number {
  return 1 + node.children.reduce((sum, c) => sum + subtreeSize(c), 0);
}

/** Assign each root-child to a side: honour an explicit `side`, else balance by subtree size. */
function assignSides(children: MapNode[]): ("left" | "right")[] {
  let left = 0;
  let right = 0;
  return children.map((child) => {
    const size = subtreeSize(child);
    const side = child.side ?? (right <= left ? "right" : "left");
    if (side === "right") right += size;
    else left += size;
    return side;
  });
}

/** Org-chart layouts (vertical hierarchy) draw right-angle elbow connectors, not the organic taper. */
const isOrg = (k: LayoutKind): boolean => k === "org-down" || k === "org-up";

export function project(
  doc: MindMapDoc,
  palette: string[] = FALLBACK_PALETTE,
  numbered = false,
  kind: LayoutKind = "side",
): ProjectResult {
  const pal = palette.length > 0 ? palette : FALLBACK_PALETTE;
  const connectorStyle = doc.meta?.connectorStyle;
  const nodes: TopicNode[] = [];
  const edges: FlowEdge[] = [];
  // Auto-numbering is a view concern: numbers are computed from the tree and shown as a prefix,
  // never written into the model's `topic` (so exports/search/outline stay clean).
  const numbers = numbered ? outlineNumbers(doc.root) : undefined;
  // Task progress rolls up per subtree; compute once for the central tree + each floating root.
  const progress = new Map<string, ProgressInfo>(progressMap(doc.root));
  for (const f of doc.floatingTopics ?? []) for (const [k, v] of progressMap(f)) progress.set(k, v);
  // Conditional formatting: a view-only style layered *under* each node's own style.
  const rules = doc.rules ?? [];

  const emit = (
    node: MapNode,
    parentId: string | undefined,
    depth: number,
    side: "left" | "right",
    color: string,
    floating: boolean,
    isRoot: boolean,
    recurse = true,
    // The layout governing the edge INTO this node (= the layout that placed it). Org layouts → the
    // branch renders as a right-angle elbow. A node's own `layout` override governs its children.
    edgeLayout: LayoutKind = kind,
  ): void => {
    // A node's own `branchColor` override (if set) recolours it AND its subtree (inherited via the
    // `color` passed down to children); otherwise it keeps the inherited auto-palette colour.
    // `|| color` (not `??`): an imported/hand-edited "" branchColor must fall back to the palette
    // colour, not pass through as an empty stroke (setBranchColor already normalises "" → undefined).
    const nodeColor = node.branchColor || color;
    nodes.push({
      id: node.id,
      type: "topic",
      position: { x: 0, y: 0 },
      data: {
        topic: node.topic,
        topicRich: node.topicRich,
        number: numbers?.get(node.id),
        note: node.note,
        hyperlink: node.hyperlink,
        image: node.image,
        icons: node.icons,
        tags: node.tags,
        style: node.style,
        // Conditional formatting is a separate view-only overlay (merged under `style` at render),
        // so the model + fromFlow stay lossless — nothing bakes into node.style.
        condStyle: conditionalStyle(node, rules, progress.get(node.id)?.progress),
        pos: node.pos,
        layout: node.layout,
        isRoot,
        depth,
        branchColor: nodeColor,
        side,
        collapsed: Boolean(node.collapsed),
        hasChildren: node.children.length > 0,
        hiddenCount: node.collapsed ? node.children.length : undefined,
        progress: progress.get(node.id),
        due: node.task?.due,
        start: node.task?.start,
        durationDays: node.task?.durationDays,
        resources: node.task?.resources,
        priority: node.task?.priority,
        attachmentCount: node.attachments?.length,
        floating,
      },
    });
    if (parentId !== undefined) {
      edges.push({
        id: `e:${parentId}:${node.id}`,
        source: parentId,
        target: node.id,
        type: "branch", // a floating tapered edge — routes itself from the node borders
        data: {
          depth,
          branchColor: nodeColor,
          crosslink: false,
          elbow: isOrg(edgeLayout),
          connectorStyle,
          dash: node.lineDash,
        },
      });
    }
    // Collapsed → keep the node (with hasChildren) but omit its descendants. The root is
    // emitted with recurse=false so its children are emitted once, per-branch (colour/side).
    if (node.collapsed || !recurse) return;
    // This node's children are governed by its own layout override, else the layout that placed it.
    const childLayout = (node.layout as LayoutKind | undefined) ?? edgeLayout;
    for (const child of node.children) {
      emit(child, node.id, depth + 1, side, nodeColor, floating, false, true, childLayout);
    }
  };

  const root = doc.root;
  emit(root, undefined, 0, "right", ROOT_COLOR, false, true, false);
  const sides = assignSides(root.children);
  if (!root.collapsed) {
    root.children.forEach((child, i) => {
      emit(child, root.id, 1, sides[i], pal[i % pal.length], false, false);
    });
  }

  // Floating topics: each a detached subtree (no edge to the root). Each gets its own palette colour
  // (cycled) rather than a washed-out grey, so a floating cluster reads like a normal coloured mini-map
  // (MindManager). Floating subtrees are always placed horizontally (placeFloating), so their branches
  // stay organic even in an org-chart map. A sticky note keeps its explicit amber style (set per-node).
  (doc.floatingTopics ?? []).forEach((floating, i) => {
    emit(floating, undefined, 1, "right", pal[i % pal.length], true, false, true, "right");
  });

  // Cross-links: dashed, labelled relationship edges (floating custom edge).
  const lineJumps = Boolean(doc.meta?.lineJumps);
  for (const link of doc.links ?? []) {
    edges.push({
      id: link.id,
      source: link.from,
      target: link.to,
      type: "crosslink",
      label: link.label,
      data: {
        depth: 0,
        branchColor: CROSSLINK_COLOR,
        crosslink: true,
        lineJumps,
        arrow: link.arrow,
        color: link.color,
        width: link.width,
        dash: link.dash,
        curve: link.curve,
      },
    });
  }

  return { nodes, edges };
}
