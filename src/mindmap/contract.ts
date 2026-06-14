import type { Ref } from "react";
import type { MapImage, MindMapDoc, NodeStyle } from "../model/types";
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
  /** Merge a style patch into the selected node ("" / null clears a key); false if none selected. */
  setSelectedStyle: (patch: Partial<NodeStyle>) => boolean;
  /** Set the hyperlink on the selected node ("" clears); false if nothing is selected. */
  setSelectedHyperlink: (url: string) => boolean;
  /** Group the node and its subtree in a filled boundary box; false if it isn't found. */
  groupBranch: (id: string) => boolean;
}

/** Prefix marking a node hyperlink as an in-app link to another map. */
export const MAP_LINK_PREFIX = "#map=";

/** The three horizontal directions (two-sided, or all branches left / right). */
export type LayoutDirection = "side" | "left" | "right";

/** Full layout set: the three directions plus the canvas's alternate layouts. */
export type LayoutKind =
  | LayoutDirection
  | "org-down"
  | "org-up"
  | "radial"
  | "timeline"
  | "fishbone";

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
