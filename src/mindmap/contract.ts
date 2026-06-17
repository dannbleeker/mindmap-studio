import type { Ref } from "react";
import type {
  BackdropKind,
  ConditionalRule,
  MapAttachment,
  MapImage,
  MapNode,
  MindMapDoc,
  NodeStyle,
} from "../model/types";
import type { MindMapTheme } from "./theme";

// The contract between the app and the canvas. The React Flow engine implements this surface,
// so App / useFind / useMapExports / panels never depend on the engine internals — they import
// from `./mindmap`, which re-exports this file. Kept as a seam so the renderer stays swappable.

/** A node surfaced to the app's Notes panel when the canvas selection changes. */
export interface SelectedNode {
  id: string;
  topic: string;
  note: string;
}

/** Per-field summary of a multi-node selection, so the inspector can blank-out + label a field as
 *  "Mixed" when the selected topics disagree on it (instead of silently showing the anchor's value).
 *  Computed on the canvas, where both the selection set and the doc live. Only the task fields the
 *  Details tab reflects are tracked (the StyleBar applies patches without reflecting current state). */
export interface SelectionFields {
  /** How many nodes are selected (the inspector enters bulk mode when >1). */
  count: number;
  /** True when the selected nodes hold more than one distinct value for that field. */
  mixed: { progress: boolean; priority: boolean; start: boolean; due: boolean };
}

/** A relationship (cross-link) edge surfaced to the app's inspector when one is selected. Resolved —
 *  every field carries a concrete value (defaults filled), so the EdgeInspector renders directly. */
export interface SelectedEdge {
  id: string;
  label: string;
  arrow: "to" | "from" | "both" | "none";
  color: string;
  width: number;
  dash: "dashed" | "solid" | "dotted";
}

/** Imperative API a canvas component exposes via its ref. */
export interface MindMapHandle {
  exportSvg: () => Blob | null;
  focusNode: (id: string) => void;
  fit: () => void;
  /** Apply an image to the currently-selected node; false if nothing is selected. */
  setSelectedImage: (image: MapImage) => boolean;
  /** Set the note on the currently-selected node; false if nothing is selected. */
  setSelectedNote: (note: string) => boolean;
  /** Toggle a marker icon on the selected node; false if nothing is selected. */
  toggleSelectedIcon: (icon: string) => boolean;
  /** Replace the query in every matching node topic; returns the count changed. */
  replaceTopics: (query: string, replacement: string) => number;
  /** Collapse (false) or expand (true) every branch below the root. */
  setAllExpanded: (expanded: boolean) => void;
  /** Toggle free-canvas (whiteboard) mode. Enabling seeds each node's `pos` from its current
   *  on-screen position, so the switch is seamless; then nodes drag freely instead of re-parenting. */
  setFreeform: (on: boolean) => void;
  /** Add a dedicated diagram backdrop (onion / funnel / Venn) and switch to free-canvas mode so
   *  topics can be dragged into its regions. */
  setBackdrop: (kind: BackdropKind) => void;
  /** Add/remove a ring or stage on the current onion/funnel backdrop (no-op for venn). */
  setBackdropRings: (delta: number) => void;
  /** Remove the map's diagram backdrop. */
  clearBackdrop: () => void;
  /** Merge a style patch into the selected node ("" / null clears a key); false if none selected. */
  setSelectedStyle: (patch: Partial<NodeStyle>) => boolean;
  /** Set the hyperlink on the selected node ("" clears); false if nothing is selected. */
  setSelectedHyperlink: (url: string) => boolean;
  /** Group the node and its subtree in a filled boundary box; false if it isn't found. */
  groupBranch: (id: string) => boolean;
  /** Add a labelled summary bracket around the node and its subtree; false if it isn't found. */
  groupSummary: (id: string) => boolean;
  /** Rename the map — sets the root topic; doc.title follows (the same path as inline root rename). */
  renameMap: (title: string) => void;
  /** Set the per-map canvas background colour ("" clears it back to the theme default). */
  setBackground: (color: string) => void;
  /** Set the per-map canvas background image (a data: URL); "" clears it. Drawn behind everything,
   *  on top of the background colour; carried into the image/PDF/HTML exports. */
  setBackgroundImage: (url: string) => void;
  /** Toggle line-jumps: draw a hop where two relationship lines cross (per-map, lossless in .json). */
  setLineJumps: (on: boolean) => void;
  /** Replace the map's conditional-formatting rules (empty array clears them). */
  setRules: (rules: ConditionalRule[]) => void;
  /** Replace the tags on the selected node (empty array clears); false if nothing is selected. */
  setSelectedTags: (tags: string[]) => boolean;
  /** Set the selected node's task completion (0..1), or clear it with undefined; false if none. */
  setSelectedProgress: (progress: number | undefined) => boolean;
  /** Set the selected node's due date ("YYYY-MM-DD"), or clear with ""; false if nothing selected. */
  setSelectedDue: (due: string) => boolean;
  /** Set the selected node's start date ("YYYY-MM-DD"), or clear with ""; false if nothing selected. */
  setSelectedStart: (start: string) => boolean;
  /** Set the selected node's task priority (1=High..3=Low), or clear with undefined; false if none. */
  setSelectedPriority: (priority: number | undefined) => boolean;
  /** Attach a file to the selected node; false if nothing is selected. */
  addSelectedAttachment: (attachment: MapAttachment) => boolean;
  /** Remove the attachment at `index` from the selected node; false if nothing is selected. */
  removeSelectedAttachment: (index: number) => boolean;
  /** Graft a forest of nodes (e.g. parsed from pasted text) under the selected node; false if none. */
  addSubtreeToSelected: (nodes: MapNode[]) => boolean;
  /** Add a sticky note — a free-floating topic styled as an amber note card. */
  addStickyNote: () => void;
  /** Bind the selected node to mirror another map (a roll-up source); "" unbinds. False if none selected. */
  setSelectedRollup: (mapId: string) => boolean;
  /** Quick capture: add a named child under the selected node (or the root if none), keeping the
   *  current selection so repeated calls add siblings under the same parent. */
  quickAdd: (text: string) => void;
  /** Set (or clear, with "") the selected relationship's label; false if no edge is selected. */
  setLinkLabel: (label: string) => boolean;
  /** Set the selected relationship's arrowhead placement; false if no edge is selected. */
  setLinkArrow: (arrow: SelectedEdge["arrow"]) => boolean;
  /** Merge a style patch (colour / width / dash) into the selected relationship; false if none. */
  setLinkStyle: (patch: { color?: string; width?: number; dash?: SelectedEdge["dash"] }) => boolean;
  /** Delete the selected relationship; false if no edge is selected. */
  deleteLink: () => boolean;
}

/** Prefix marking a node hyperlink as an in-app link to another map. */
export const MAP_LINK_PREFIX = "#map=";

/** Prefix marking a node hyperlink as an in-map jump to another topic (by node id). */
export const NODE_LINK_PREFIX = "#node=";

/** What a node's hyperlink points at, once classified. */
export type ResolvedLink =
  | { kind: "node"; id: string }
  | { kind: "map"; id: string }
  | { kind: "external"; url: string };

/** Classify a node hyperlink: an in-map topic jump, an in-app map link, or an external URL. Pure. */
export function classifyLink(url: string): ResolvedLink {
  if (url.startsWith(NODE_LINK_PREFIX))
    return { kind: "node", id: url.slice(NODE_LINK_PREFIX.length) };
  if (url.startsWith(MAP_LINK_PREFIX))
    return { kind: "map", id: url.slice(MAP_LINK_PREFIX.length) };
  return { kind: "external", url };
}

/** The three horizontal directions (two-sided, or all branches left / right). */
export type LayoutDirection = "side" | "left" | "right";

/** Full layout set: the three directions plus the canvas's alternate layouts. */
export type LayoutKind =
  | LayoutDirection
  | "org-down"
  | "org-up"
  | "radial"
  | "timeline"
  | "fishbone"
  | "grid"
  | "brace"
  // Free-canvas mode is a per-map state (doc.meta.freeform), not a layout the user picks; it's a
  // LayoutKind so computeLayout has a single positioning entry point.
  | "freeform";

/** Props the canvas accepts. Kept engine-neutral so the renderer stays swappable behind
 *  the `index.tsx` chooser. */
export interface MindMapProps {
  doc: MindMapDoc;
  /** Fires after every canvas edit with the updated canonical doc. */
  onChange?: (doc: MindMapDoc) => void;
  /** Fires when the canvas selection changes (for the Notes panel). Reports the anchor node. */
  onSelect?: (selected: SelectedNode | null) => void;
  /** Fires when the number of selected nodes changes (the inspector enters bulk mode when >1). */
  onSelectionCount?: (count: number) => void;
  /** Fires with a per-field "mixed" summary of the selection, so the inspector can blank-out + label
   *  a task field whose value differs across the selected topics (instead of showing the anchor's). */
  onSelectionFields?: (fields: SelectionFields) => void;
  /** Fires when a relationship (cross-link) edge is selected/deselected — the inspector swaps to the
   *  EdgeInspector. Mutually exclusive with node selection (selecting one clears the other). */
  onSelectEdge?: (edge: SelectedEdge | null) => void;
  /** Fires when a node's on-canvas 📝 indicator is clicked — the app should open the inspector's
   *  Notes tab for the (now-selected) node. */
  onOpenNote?: () => void;
  /** Fires when a node's in-app map link (#map=…) is clicked, with the target map id. */
  onMapLink?: (mapId: string) => void;
  /** Canvas style/theme (light, dark, or a palette); image exports inherit it. */
  theme?: MindMapTheme;
  /** Layout: a direction, or an alternate layout (org-chart, radial, timeline, fishbone). */
  direction?: LayoutKind;
  /** Show hierarchical outline numbers (1, 1.2, …) as a prefix on each topic (view-only). */
  numbered?: boolean;
  /** Read-only Power Filter: ids to keep lit; all other nodes/edges dim. null/undefined = off. */
  litIds?: Set<string> | null;
  ref?: Ref<MindMapHandle>;
}
