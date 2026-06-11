// Canonical, format-agnostic mind-map model.
// Every importer/exporter and renderer targets THIS shape — it is the single
// source of truth, so the rendering engine and file formats stay replaceable.

export type NodeId = string;

export interface TaskInfo {
  start?: string;
  due?: string;
  durationDays?: number;
  /** 0..1 */
  progress?: number;
  /** 1 (highest) .. 9 */
  priority?: number;
  resources?: string[];
}

export interface NodeStyle {
  color?: string;
  background?: string;
  fontSize?: number;
  fontWeight?: string;
}

export interface MapImage {
  url: string;
  width?: number;
  height?: number;
}

export interface MapNode {
  id: NodeId;
  /** Plain text for now; rich text comes in a later phase. */
  topic: string;
  note?: string;
  hyperlink?: string;
  image?: MapImage;
  /** Marker / icon ids (priority, progress, flags, ...). */
  icons?: string[];
  tags?: string[];
  style?: NodeStyle;
  collapsed?: boolean;
  task?: TaskInfo;
  children: MapNode[];
  /** For the two-sided radial layout; left undefined = engine decides. */
  side?: "left" | "right";
}

/** A labelled cross-link between two nodes (MindManager "relationship"). */
export interface CrossLink {
  id: string;
  from: NodeId;
  to: NodeId;
  label?: string;
}

/** A visual grouping around a set of nodes (MindManager "boundary"). */
export interface Boundary {
  id: string;
  nodeIds: NodeId[];
  label?: string;
}

export interface MindMapDoc {
  schemaVersion: 1;
  id: string;
  title: string;
  root: MapNode;
  links?: CrossLink[];
  boundaries?: Boundary[];
  theme?: string;
  meta?: {
    createdAt?: string;
    /** Where this doc came from: "sample" | "mmap" | "markdown" | ... */
    source?: string;
  };
}
