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

/** Node outline shape. The first three are CSS rounded rectangles (set via borderRadius);
 *  the rest ("geometric") paint an SVG backdrop — the flowchart vocabulary. */
export type NodeShape =
  | "round"
  | "rect"
  | "pill"
  | "ellipse"
  | "diamond"
  | "parallelogram"
  | "hexagon"
  | "cylinder"
  | "trapezoid"
  | "octagon"
  | "document"
  | "callout"
  | "star"
  | "cloud";

export interface NodeStyle {
  color?: string;
  background?: string;
  /** CSS size string, e.g. "20px" — matches the editor's node-style shape. */
  fontSize?: string;
  fontWeight?: string;
  /** Per-topic shape (CSS border-radius, e.g. "4px" box, "999px" pill). */
  borderRadius?: string;
  /** Per-topic geometric shape (diamond/ellipse/parallelogram/hexagon/cylinder/trapezoid/
   *  octagon/document/callout/star/cloud). When set to a geometric shape the node is drawn as
   *  an SVG path; otherwise borderRadius rules. */
  shape?: NodeShape;
  /** Per-topic outline (CSS border shorthand, e.g. "2px solid #e23"). */
  border?: string;
  fontFamily?: string;
  textDecoration?: string;
  /** Fill treatment derived from the topic's branch colour (or its explicit `background`): a soft
   *  branch-colour `tint`, or a vertical `gradient`. Absent = a flat fill (today's look). */
  fill?: "tint" | "gradient";
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
  /** Colour override (the bubble's accent); absent = the default sticky-yellow. Lossless in .json. */
  color?: string;
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
  /** Free-canvas position (top-left, in flow coords). Used only when the map is in freeform mode
   *  (`meta.freeform`); the auto-layouts ignore it. Lossless in .json, ignored by flat exporters. */
  pos?: { x: number; y: number };
  /** Per-branch layout override: this node's subtree lays out with this layout kind (a `LayoutKind`)
   *  instead of the map's. Lossless in .json, ignored by flat exporters. */
  layout?: string;
  /** Per-branch connector colour (`#rrggbb`): overrides the auto-cycled palette for this node AND its
   *  subtree's branches (the subtree inherits it). Lossless in .json, ignored by flat exporters. */
  branchColor?: string;
  /** Line style of THIS node's incoming branch connector; absent = solid. Lossless in .json. */
  lineDash?: "solid" | "dashed" | "dotted";
  /** Roll-up source: the library map id this node mirrors. On "Refresh roll-ups" the node's children
   *  are replaced with a fresh copy of that map's branches — so one map can aggregate several others.
   *  Lossless in .json, ignored by flat exporters. */
  rollup?: string;
  /** Created (ms epoch), stamped when the node is born. Lossless in .json, ignored by flat exporters
   *  and never drawn on the canvas; shown in the inspector facts line. Optional → pre-timestamp maps
   *  are valid and backfill `createdAt` on their first content edit. */
  createdAt?: number;
  /** Last content-edit time (ms epoch), bumped on any content/property edit (not pure restructuring).
   *  Lossless in .json, ignored by flat exporters; shown in the inspector facts line. */
  modifiedAt?: number;
}

/** A labelled cross-link between two nodes (MindManager "relationship"). The optional style fields
 *  are json-lossless and ignored by flat exporters; when absent the link renders with today's look
 *  (a single arrowhead at the target, the shared accent colour, 1.5px dashed). */
export interface CrossLink {
  id: string;
  from: NodeId;
  to: NodeId;
  label?: string;
  /** Which end(s) carry an arrowhead. Absent = "to" (the historical single-headed default). */
  arrow?: "to" | "from" | "both" | "none";
  /** Stroke colour override; absent = the shared CROSSLINK_COLOR accent. */
  color?: string;
  /** Stroke width override (px); absent = CROSSLINK_WIDTH. */
  width?: number;
  /** Line style; absent = "dashed" (the historical CROSSLINK_DASH). */
  dash?: "dashed" | "solid" | "dotted";
  /** Signed perpendicular offset (px) of the arc's midpoint from the straight chord — the draggable
   *  curve handle / inspector sets it to bow the relationship around clutter. Absent = a gentle
   *  auto-bow. Lossless in .json, ignored by flat exporters. */
  curve?: number;
}

/** A visual grouping around a set of nodes (MindManager "boundary"). */
export interface Boundary {
  id: string;
  nodeIds: NodeId[];
  label?: string;
  /** Stroke/fill override; absent = the shared boundary accent. Lossless in .json. */
  color?: string;
  /** Outline shape; absent = "roundRect" (the historical rounded box). Lossless in .json. */
  shape?: "roundRect" | "rect" | "ellipse" | "cloud" | "polygon";
  /** Outline line style; absent = solid. Lossless in .json. */
  dash?: "solid" | "dashed" | "dotted";
}

/** A labelled bracket spanning a node + its subtree (MindManager "summary topic"). Like a Boundary,
 *  but drawn as a bracket to one side with a label, rather than a box enclosing the nodes. */
export interface Summary {
  id: string;
  nodeIds: NodeId[];
  label?: string;
  /** Bracket/label colour override; absent = the default green. Lossless in .json. */
  color?: string;
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

/** A dedicated diagram backdrop drawn behind freely-positioned topics (a geometric frame). The
 *  region labels are ordinary topics placed at the frame's anchors — the backdrop is just the shape. */
export type BackdropKind = "onion" | "funnel" | "venn2" | "venn3";
export interface Backdrop {
  kind: BackdropKind;
  /** Ring/stage count for onion + funnel (ignored by the fixed venn frames). */
  rings?: number;
  /** Stroke/fill override; absent = the default backdrop accent. Lossless in .json. */
  color?: string;
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
  /** A dedicated diagram backdrop (onion / funnel / Venn) drawn behind freely-positioned topics. */
  backdrop?: Backdrop;
  /** Top-level topics not attached to the central hierarchy (legends, notes). */
  floatingTopics?: MapNode[];
  theme?: string;
  meta?: {
    createdAt?: string;
    /** Last-edited time (ms epoch), stamped on every save; drives the start screen's Recent grouping. */
    updatedAt?: number;
    /** Where this doc came from: "sample" | "mmap" | "markdown" | ... */
    source?: string;
    /** Per-map canvas background colour (CSS colour); overrides the theme. Lossless in .json,
     *  ignored by flat exporters; carried into the image/PDF export. */
    background?: string;
    /** Per-map canvas background image, stored inline as a data: URL (like node images) so maps
     *  stay offline + portable. Drawn behind everything, on top of the background colour. Lossless
     *  in .json, ignored by flat exporters; carried into the image/PDF/HTML export. */
    backgroundImage?: string;
    /** Free-canvas (whiteboard) mode: nodes use their own `pos` instead of an auto-layout, and
     *  dragging a node moves it freely rather than re-parenting it. */
    freeform?: boolean;
    /** Line-jumps: draw a small semicircular "hop" where two relationship lines cross, so the
     *  crossing reads as "passes over", not "joins" (MindManager convention). Off by default.
     *  Lossless in .json, ignored by flat exporters; carried into the image/PDF/HTML export. */
    lineJumps?: boolean;
    /** Connector (branch line) style for the whole map: "organic" (the adaptive tapered default),
     *  "curved", "elbow" (right-angle), or "straight". Absent = "organic". Lossless in .json, ignored
     *  by flat exporters; carried into the image/PDF/HTML export. */
    connectorStyle?: "organic" | "curved" | "elbow" | "straight";
  };
}
