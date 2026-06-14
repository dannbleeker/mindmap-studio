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
  /** CSS size string, e.g. "20px" — matches the editor's node-style shape. */
  fontSize?: string;
  fontWeight?: string;
  /** Per-topic shape (CSS border-radius, e.g. "4px" box, "999px" pill). */
  borderRadius?: string;
  /** Per-topic outline (CSS border shorthand, e.g. "2px solid #e23"). */
  border?: string;
  fontFamily?: string;
  textDecoration?: string;
}

export interface MapImage {
  url: string;
  width?: number;
  height?: number;
}

/** A file attached to a topic, stored inline as a data URL so maps stay offline + portable. */
export interface MapAttachment {
  name: string;
  /** The file contents as a data: URL. */
  dataUrl: string;
  /** Size in bytes (for display). */
  size: number;
}

/** A small annotation bubble anchored to a node (MindManager "callout"). */
export interface Callout {
  id: string;
  text: string;
  /** Offset of the bubble from the node's right edge / vertical centre, in flow units. */
  dx: number;
  dy: number;
}

export interface MapNode {
  id: NodeId;
  /** Plain-text topic — always kept in sync as the fallback for search, outline, and exports. */
  topic: string;
  /**
   * Optional inline rich-text HTML (a sanitised subset: bold/italic/underline/strike + safe
   * spans) shown on the React Flow canvas. `topic` stays the plain fallback, so every io/*
   * exporter, search, and the outline are untouched. Lossless in .json; ignored by flat formats.
   */
  topicRich?: string;
  note?: string;
  hyperlink?: string;
  image?: MapImage;
  /** Marker / icon ids (priority, progress, flags, ...). */
  icons?: string[];
  tags?: string[];
  /** Files attached to this topic (inline data URLs); lossless in .json, ignored by flat formats. */
  attachments?: MapAttachment[];
  style?: NodeStyle;
  collapsed?: boolean;
  task?: TaskInfo;
  /** Anchored annotation bubbles (MindManager callouts); lossless in .json, ignored by flat formats. */
  callouts?: Callout[];
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

/** A labelled bracket spanning a node + its subtree (MindManager "summary topic"). Like a Boundary,
 *  but drawn as a bracket to one side with a label, rather than a box enclosing the nodes. */
export interface Summary {
  id: string;
  nodeIds: NodeId[];
  label?: string;
}

/** A conditional-formatting rule: topics matching `kind`/`value` get `style` applied (view-only). */
export interface ConditionalRule {
  id: string;
  /** What to match: a tag, a marker icon, or completed (task at 100%). */
  kind: "tag" | "marker" | "completed";
  /** The tag/marker to match (unused for "completed"). */
  value?: string;
  style: NodeStyle;
}

export interface MindMapDoc {
  schemaVersion: 1;
  id: string;
  title: string;
  root: MapNode;
  links?: CrossLink[];
  boundaries?: Boundary[];
  /** Conditional-formatting rules (style topics by tag/marker/completed); view-only, per map. */
  rules?: ConditionalRule[];
  /** Summary brackets (a labelled bracket beside a node's subtree). */
  summaries?: Summary[];
  /** Top-level topics not attached to the central hierarchy (legends, notes). */
  floatingTopics?: MapNode[];
  theme?: string;
  meta?: {
    createdAt?: string;
    /** Where this doc came from: "sample" | "mmap" | "markdown" | ... */
    source?: string;
    /** Per-map canvas background colour (CSS colour); overrides the theme. Lossless in .json,
     *  ignored by flat exporters; carried into the image/PDF export. */
    background?: string;
  };
}
