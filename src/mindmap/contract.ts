import type { Ref } from "react";
import type { MapImage, MindMapDoc, NodeStyle } from "../model/types";
import type { MindElixirTheme } from "./theme";

// The engine-neutral contract between the app and whichever canvas engine renders the map.
// Both the mind-elixir canvas (today) and the React Flow canvas (in progress) implement
// this identical surface, so App / useFind / useMapExports / panels never depend on the
// engine — they import from `./mindmap` (the engine chooser), which re-exports this file.

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

/** The original three horizontal directions (mind-elixir's only modes). */
export type LayoutDirection = "side" | "left" | "right";

/**
 * Full layout set. The first three are the mind-elixir directions (and the React Flow
 * engine matches them); the rest are React-Flow-only alternate layouts. On the mind-elixir
 * engine the extra kinds gracefully fall back to "side".
 */
export type LayoutKind =
  | LayoutDirection
  | "org-down"
  | "org-up"
  | "radial"
  | "timeline"
  | "fishbone";

/** Props every canvas engine accepts. Engine-neutral so both the mind-elixir and React
 *  Flow components — and the lazy chooser in `index.tsx` — share one type. */
export interface MindMapProps {
  doc: MindMapDoc;
  /** Fires after every canvas edit with the updated canonical doc. */
  onChange?: (doc: MindMapDoc) => void;
  /** Fires when the canvas selection changes (for the Notes panel). */
  onSelect?: (selected: SelectedNode | null) => void;
  /** Fires when a node's in-app map link (#map=…) is clicked, with the target map id. */
  onMapLink?: (mapId: string) => void;
  /** Canvas style/theme (light, dark, or a palette); image exports inherit it. */
  theme?: MindElixirTheme;
  /** Layout (direction or alternate layout; alternate kinds are React-Flow-only). */
  direction?: LayoutKind;
  ref?: Ref<MindMapHandle>;
}
