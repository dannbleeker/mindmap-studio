import type { Edge, Node } from "@xyflow/react";
import type { MapImage, NodeStyle } from "../../model/types";
import type { ProgressInfo } from "../../progress";
import type { AttachSide, ConnectorStyle } from "./floating";

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
  /** Free-canvas position (top-left) — used by the freeform layout when the map is in that mode. */
  pos?: { x: number; y: number };
  /** Per-branch layout override (a LayoutKind); this node's subtree lays out with it. */
  layout?: string;
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
  /** When collapsed, the number of direct subtopics folded away — shown in the +N expand affordance. */
  hiddenCount?: number;
  /** Rolled-up task progress (0..1 + done/total), or undefined when the node isn't a task. */
  progress?: ProgressInfo;
  /** Task due date ("YYYY-MM-DD"), shown as a chip (red when overdue). */
  due?: string;
  /** Task start date ("YYYY-MM-DD"). */
  start?: string;
  /** Task duration in days — shown in the inline task-info line (e.g. "5d"). */
  durationDays?: number;
  /** Assigned resources/people — shown in the inline task-info line (e.g. "@Ann, Bo"). */
  resources?: string[];
  /** Task priority (1=High..3=Low; imported maps may carry 4..9), shown as a coloured chip. */
  priority?: number;
  /** How many files are attached (shown as a 📎 chip; the files live in the model). */
  attachmentCount?: number;
  /** Attached file names (for the hover-peek tooltip on the 📎 chip). */
  attachmentNames?: string[];
  /** A detached/floating topic (not part of the central hierarchy). */
  floating: boolean;
  /** Dimmed by the read-only Power Filter (not on a path to a match); view-only opacity. */
  dimmed?: boolean;
  /** During a drag-to-reparent, the node the dragged topic would become a child of — highlighted as
   *  the drop target (view-only, canvas-only; never exported). */
  dropTarget?: boolean;
};

/** Data carried by an edge (branch or cross-link). */
export type EdgeData = {
  depth: number;
  branchColor: string;
  /** true = a cross-link/relationship (dashed), false = a parent→child branch. */
  crosslink: boolean;
  /** Line-jumps on (per-map meta.lineJumps): a crosslink draws its line as a chord with semicircular
   *  hops where it crosses another crosslink. Carried on crosslink edges so CrosslinkEdge can decide. */
  lineJumps?: boolean;
  /** Per-link style overrides carried from CrossLink so the renderer + exporter resolve one source
   *  (see resolveLinkStyle). Absent fields fall back to today's accent/1.5px/dashed/arrow-at-target. */
  arrow?: "to" | "from" | "both" | "none";
  color?: string;
  width?: number;
  dash?: "dashed" | "solid" | "dotted";
  /** Relationship arc bow: signed perpendicular offset of the midpoint (crosslink edges only). */
  curve?: number;
  /** Dimmed by the read-only Power Filter (an endpoint isn't lit); view-only opacity. */
  dimmed?: boolean;
  /** Which side of the parent this branch springs from — one shared origin per parent-side, computed
   *  per parent in sync() so siblings stay consistent (no crossed fan). Branch edges only. */
  attachSide?: AttachSide;
  /** Perpendicular bow that routes this branch's tapered ribbon AROUND an intervening node box (0 =
   *  straight through, the default). Computed per branch in sync() from the other node boxes; the SVG
   *  exporter recomputes it the same way (canvas == export). Branch edges only. */
  attachBow?: number;
  /** Render as a right-angle org-chart elbow (uniform stroke) instead of the organic tapered ribbon.
   *  Set in project() when the branch's governing layout is org-down/org-up. Branch edges only. */
  elbow?: boolean;
  /** The map's connector style (organic / curved / elbow / straight), stamped on every branch edge so
   *  the canvas + exporter render the chosen shape. Absent = "organic". Branch edges only. */
  connectorStyle?: ConnectorStyle;
};

export type TopicNode = Node<TopicData, "topic">;
export type FlowEdge = Edge<EdgeData>;
