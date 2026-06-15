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
  /** Set the per-map canvas background colour ("" clears it back to the theme default). */
  setBackground: (color: string) => void;
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
  /** Fires when the canvas selection changes (for the Notes panel). */
  onSelect?: (selected: SelectedNode | null) => void;
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
