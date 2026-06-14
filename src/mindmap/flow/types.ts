import type { Edge, Node } from "@xyflow/react";
import type { MapImage, NodeStyle } from "../../model/types";

// Shared data shapes for the React Flow canvas. Using `type` (not `interface`) so the
// shapes satisfy React Flow's `Record<string, unknown>` data constraint.

/** Data carried by a topic node (one per MapNode). */
export type TopicData = {
  topic: string;
  /** Inline rich-text HTML (sanitised subset); rendered on the canvas, `topic` is the fallback. */
  topicRich?: string;
  /** Outline number ("1.2.3") shown as a prefix when auto-numbering is on; undefined = off / root. */
  number?: string;
  note?: string;
  hyperlink?: string;
  image?: MapImage;
  icons?: string[];
  tags?: string[];
  style?: NodeStyle;
  /** The central topic — distinct styling, no incoming branch. */
  isRoot: boolean;
  /** Depth from the root (root = 0); drives branch tapering. */
  depth: number;
  /** Colour of this node's branch (palette-by-root-branch — the MindManager identity). */
  branchColor: string;
  /** Which half of the two-sided radial layout this node sits on. */
  side: "left" | "right";
  collapsed: boolean;
  hasChildren: boolean;
  /** A detached/floating topic (not part of the central hierarchy). */
  floating: boolean;
};

/** Data carried by an edge (branch or cross-link). */
export type EdgeData = {
  depth: number;
  branchColor: string;
  /** true = a cross-link/relationship (dashed), false = a parent→child branch. */
  crosslink: boolean;
};

export type TopicNode = Node<TopicData, "topic">;
export type FlowEdge = Edge<EdgeData>;
