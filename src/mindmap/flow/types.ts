import type { Edge, Node } from "@xyflow/react";
import type { MapImage, NodeStyle } from "../../model/types";
import type { ProgressInfo } from "../../progress";

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
  /** Conditional-formatting style (view-only); merged *under* `style` at render. */
  condStyle?: NodeStyle;
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
  /** Rolled-up task progress (0..1 + done/total), or undefined when the node isn't a task. */
  progress?: ProgressInfo;
  /** Task due date ("YYYY-MM-DD"), shown as a chip (red when overdue). */
  due?: string;
  /** Task start date ("YYYY-MM-DD"). */
  start?: string;
  /** How many files are attached (shown as a 📎 chip; the files live in the model). */
  attachmentCount?: number;
  /** A detached/floating topic (not part of the central hierarchy). */
  floating: boolean;
  /** Dimmed by the read-only Power Filter (not on a path to a match); view-only opacity. */
  dimmed?: boolean;
};

/** Data carried by an edge (branch or cross-link). */
export type EdgeData = {
  depth: number;
  branchColor: string;
  /** true = a cross-link/relationship (dashed), false = a parent→child branch. */
  crosslink: boolean;
  /** Dimmed by the read-only Power Filter (an endpoint isn't lit); view-only opacity. */
  dimmed?: boolean;
};

export type TopicNode = Node<TopicData, "topic">;
export type FlowEdge = Edge<EdgeData>;
