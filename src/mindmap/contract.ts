import type { Ref } from "react";
import type {
  BackdropKind,
  ConditionalRule,
  MapAttachment,
  MapImage,
  MapNode,
  MindMapDoc,
  NodeStyle,
  NumberStyle,
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

/** A string-set field (markers/tags) summarised across a multi-node selection: values present on
 *  EVERY selected topic (`all`) vs only SOME (`some`). Drives the inspector's tri-state bulk chips. */
export interface MarkerTagSummary {
  all: string[];
  some: string[];
}

/** Markers + tags summaries for the selection (bulk mode). */
export interface SelectionMarkerTags {
  markers: MarkerTagSummary;
  tags: MarkerTagSummary;
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
  /** Curve bow (perpendicular offset, px); `0` = straight, `undefined` = the gentle auto-bow. */
  curve?: number;
}

/** A selected overlay object (boundary box / summary bracket / callout bubble), surfaced to the
 *  inspector's OverlayInspector. Resolved (label filled). `nodeId` is set only for callouts (which
 *  live on a node). Mutually exclusive with node + edge selection. */
export interface SelectedOverlay {
  kind: "boundary" | "summary" | "callout";
  id: string;
  /** The owning node id — callouts only. */
  nodeId?: string;
  label: string;
  /** Whether a Delete control should show (all overlay kinds are deletable today). */
  deletable: boolean;
  /** The overlay's colour override (`#rrggbb`), or undefined when it uses the default accent —
   *  lets the inspector pre-select the current swatch and show a "Reset" affordance. */
  color?: string;
  /** Boundary outline shape (boundary kind only); undefined = the default rounded box. */
  shape?: "roundRect" | "rect" | "ellipse" | "cloud" | "polygon";
  /** Boundary outline line style (boundary kind only); undefined = solid. */
  dash?: "solid" | "dashed" | "dotted";
}

/** Imperative API a canvas component exposes via its ref. */
export interface MindMapHandle {
  exportSvg: () => Blob | null;
  focusNode: (id: string) => void;
  fit: () => void;
  /** Snapshot the live canvas session — viewport (pan/zoom) + undo/redo stacks — so the app can
   *  stash it when switching away from a document tab and restore it (via `initialSession`) on a
   *  remount, making tab switches lossless for the recently-used set. */
  getSession: () => CanvasSession;
  /** Apply an image to the currently-selected node; false if nothing is selected. */
  setSelectedImage: (image: MapImage) => boolean;
  /** Set the note on the currently-selected node; false if nothing is selected. */
  setSelectedNote: (note: string) => boolean;
  /** Toggle a marker icon on the selected node; false if nothing is selected. */
  toggleSelectedIcon: (icon: string) => boolean;
  /** Tri-state bulk marker toggle across the whole selection: if every selected topic already has
   *  the icon, remove it from all; else add it to those lacking it (one undo step). False if none. */
  bulkToggleSelectedIcon: (icon: string) => boolean;
  /** Tri-state bulk tag toggle across the whole selection (same semantics). False if none selected. */
  bulkToggleSelectedTag: (tag: string) => boolean;
  /** Replace the query in every matching node topic; returns the count changed. */
  replaceTopics: (query: string, replacement: string) => number;
  /** Collapse (false) or expand (true) every branch below the root. */
  setAllExpanded: (expanded: boolean) => void;
  /** Expand the map to a detail level: topics deeper than `level` collapse (level 1 = top branches
   *  only). MindManager's detail-level control. */
  setExpandedToLevel: (level: number) => void;
  /** Pin a main branch to the left/right half of the two-sided ("side") map, or `undefined` to let it
   *  auto-balance again. Inert on non-root nodes / other layouts. */
  setNodeSide: (id: string, side: "left" | "right" | undefined) => void;
  /** Re-balance the two-sided map: clear every main branch's pinned side so the auto-balancer
   *  redistributes them evenly by subtree weight. */
  balanceMap: () => void;
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
  /** Merge a style patch into the selected node(s) ("" / null clears a key); false if none selected.
   *  Applies to the whole selection (bulk). */
  setSelectedStyle: (patch: Partial<NodeStyle>) => boolean;
  /** Read the anchor selected node's style (the Format-Painter "copy"); null if nothing is selected.
   *  Returns an empty object for a selected-but-unstyled node. Paste with `setSelectedStyle`. */
  copySelectedStyle: () => NodeStyle | null;
  /** Auto-colour the top branches from the active theme palette (one-click "restyle branches"). */
  shuffleBranchColors: () => void;
  /** Align the selected free-canvas nodes to a shared edge/centre (freeform mode; needs 2+ selected). */
  alignSelection: (mode: "left" | "hcenter" | "right" | "top" | "vmiddle" | "bottom") => void;
  /** Evenly space the selected free-canvas nodes along an axis (freeform mode; needs 3+ selected). */
  distributeSelection: (axis: "h" | "v") => void;
  /** Set the hyperlink on the selected node ("" clears); false if nothing is selected. */
  setSelectedHyperlink: (url: string) => boolean;
  /** Group the node and its subtree in a filled boundary box; false if it isn't found. */
  groupBranch: (id: string) => boolean;
  /** Add a labelled summary bracket around the node and its subtree; false if it isn't found. */
  groupSummary: (id: string) => boolean;
  /** Rename the map — sets the root topic; doc.title follows (the same path as inline root rename). */
  renameMap: (title: string) => void;
  /** Set a specific node's topic text by id (the editable outline's inline rename); root rename
   *  updates doc.title too. No-op if the id isn't found. */
  renameNode: (id: string, topic: string) => void;
  /** Promote (outdent) or demote (indent) a specific node by id — the outline's ◂ ▸ controls, the
   *  same ops as the Alt+Shift+←/→ keys. No-op when the move isn't possible. */
  indentNode: (id: string, dir: "in" | "out") => void;
  /** Restructure the central tree from an outline drag: place `dragId` before/after `targetId`, or as
   *  its child. No-op on a self/cycle/root drag. */
  moveOutlineNode: (dragId: string, targetId: string, where: "before" | "after" | "child") => void;
  /** Set the per-map canvas background colour ("" clears it back to the theme default). */
  setBackground: (color: string) => void;
  /** Set the per-map canvas background image (a data: URL); "" clears it. Drawn behind everything,
   *  on top of the background colour; carried into the image/PDF/HTML exports. */
  setBackgroundImage: (url: string) => void;
  /** Toggle line-jumps: draw a hop where two relationship lines cross (per-map, lossless in .json). */
  setLineJumps: (on: boolean) => void;
  /** Set the map's branch connector style (organic / curved / elbow / straight). */
  setConnectorStyle: (style: "organic" | "curved" | "elbow" | "straight") => void;
  /** Set the outline-numbering scheme (decimal / outline); decimal clears the override. */
  setNumberStyle: (style: NumberStyle) => void;
  /** Replace the map's conditional-formatting rules (empty array clears them). */
  setRules: (rules: ConditionalRule[]) => void;
  /** Replace the tags on the selected node (empty array clears); false if nothing is selected. */
  setSelectedTags: (tags: string[]) => boolean;
  /** Rename a tag map-wide (central tree + floating topics); renaming to an existing tag MERGES them.
   *  The tag manager's rename/merge. No-op on a blank target or when nothing carries the tag. */
  renameTag: (from: string, to: string) => void;
  /** Delete a tag from every node in the map (the tag manager's delete). */
  deleteTag: (tag: string) => void;
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
  /** Add an empty child to the selected node and drop straight into editing it (the ⌘K / command
   *  path for "add child"); false if nothing is selected. */
  addChildToSelected: () => boolean;
  /** Delete the selected node and its subtree (shared by ⌘K and the keyboard); false if none
   *  selected. Reversible — undo / the delete toast restores it. */
  deleteSelected: () => boolean;
  /** Undo / redo the last edit (the same doc-snapshot stack as Ctrl+Z / Ctrl+Shift+Z), exposed so
   *  the Row-1 buttons + ⌘K can drive it. No-op when the respective stack is empty. */
  undo: () => void;
  redo: () => void;
  /** Set (or clear, with "") the selected relationship's label; false if no edge is selected. */
  setLinkLabel: (label: string) => boolean;
  /** Set the selected relationship's arrowhead placement; false if no edge is selected. */
  setLinkArrow: (arrow: SelectedEdge["arrow"]) => boolean;
  /** Merge a style patch (colour / width / dash) into the selected relationship; false if none. */
  setLinkStyle: (patch: {
    color?: string;
    width?: number;
    dash?: SelectedEdge["dash"];
    curve?: number;
  }) => boolean;
  /** Delete the selected relationship; false if no edge is selected. */
  deleteLink: () => boolean;
  /** Set the selected overlay's label (boundary/summary) or text (callout); false if none selected. */
  setOverlayLabel: (label: string) => boolean;
  /** Set the selected overlay's colour override (`#rrggbb`); "" resets to the default accent. The
   *  same picked colour re-tints the whole object (stroke/fill/label) on canvas + in every export.
   *  False if no overlay is selected. */
  setOverlayColor: (color: string) => boolean;
  /** Set the selected boundary's outline shape; false if no boundary is selected. */
  setOverlayShape: (shape: NonNullable<SelectedOverlay["shape"]>) => boolean;
  /** Set the selected boundary's outline line style; false if no boundary is selected. */
  setOverlayDash: (dash: NonNullable<SelectedOverlay["dash"]>) => boolean;
  /** Delete the selected overlay (boundary/summary/callout); false if none selected. */
  deleteOverlay: () => boolean;
  /** Set the map's diagram-backdrop colour override (`#rrggbb`); "" resets to the default accent.
   *  No-op if the map has no backdrop. */
  setBackdropColor: (color: string) => void;
}

/** DataTransfer MIME for a marker dragged from the palette onto a topic (drag-and-drop markers). */
export const MARKER_DND_TYPE = "application/x-mm-marker";

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
/** A saved canvas session — the viewport + the undo/redo snapshot stacks — used to make document-tab
 *  switches lossless (captured via `MindMapHandle.getSession`, restored via `MindMapProps.initialSession`).
 *  The history shape is structurally the flow engine's `History<MindMapDoc>`, kept inline so the
 *  engine-neutral contract doesn't import from the flow layer. */
export interface CanvasSession {
  viewport: { x: number; y: number; zoom: number };
  history: { past: MindMapDoc[]; future: MindMapDoc[] };
}

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
  /** Fires with the markers/tags-on-all-vs-some summary of the selection, so the inspector can show
   *  tri-state bulk marker + tag chips. */
  onSelectionMarkerTags?: (summary: SelectionMarkerTags) => void;
  /** Fires when a relationship (cross-link) edge is selected/deselected — the inspector swaps to the
   *  EdgeInspector. Mutually exclusive with node selection (selecting one clears the other). */
  onSelectEdge?: (edge: SelectedEdge | null) => void;
  /** Fires when an overlay object (boundary / summary / callout) is selected/deselected — the
   *  inspector swaps to the OverlayInspector. Mutually exclusive with node + edge selection. */
  onSelectOverlay?: (overlay: SelectedOverlay | null) => void;
  /** Fires when a node's on-canvas 📝 indicator is clicked — the app should open the inspector's
   *  Notes tab for the (now-selected) node. */
  onOpenNote?: () => void;
  /** Fires when a node's in-app map link (#map=…) is clicked, with the target map id. */
  onMapLink?: (mapId: string) => void;
  /** Fires whenever the undo/redo stack depth changes, so the chrome can live-enable/disable the
   *  Row-1 undo + redo buttons (the depths aren't otherwise observable from outside the canvas). */
  onHistory?: (canUndo: boolean, canRedo: boolean) => void;
  /** Fires right after a node is deleted (keyboard / menu / popover), with the deleted topic + the
   *  number of sub-topics that went with it, so the app can show a "… deleted — Undo" toast. The
   *  delete is already done + reversible via undo(); this never blocks. */
  onDelete?: (topic: string, descendants: number) => void;
  /** Canvas style/theme (light, dark, or a palette); image exports inherit it. */
  theme?: MindMapTheme;
  /** Layout: a direction, or an alternate layout (org-chart, radial, timeline, fishbone). */
  direction?: LayoutKind;
  /** Show hierarchical outline numbers (1, 1.2, …) as a prefix on each topic (view-only). */
  numbered?: boolean;
  /** Read-only Power Filter: ids to keep lit; all other nodes/edges dim. null/undefined = off. */
  litIds?: Set<string> | null;
  /** Find results: node ids to draw with a highlight ring. null/undefined = no active search. */
  highlightIds?: Set<string> | null;
  /** Drill-in (focus-on-topic): re-root the *view* at this node id so its subtree fills the canvas.
   *  A pure view transform — edits still apply to the full map. null/undefined = the whole map. */
  drillId?: string | null;
  /** A session to restore at mount — the viewport + undo/redo stacks captured from a previous
   *  `getSession()` (used by the document-tab switcher so returning to a tab keeps its pan/zoom +
   *  history). Absent → fresh canvas (fit-to-view, empty history). */
  initialSession?: CanvasSession;
  ref?: Ref<MindMapHandle>;
}
