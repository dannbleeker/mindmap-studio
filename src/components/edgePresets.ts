import type { SelectedEdge } from "../mindmap";

// One-click relationship looks for the EdgeInspector. Each preset is a full style patch applied via
// the single `setLinkStyle` op (which now also takes `arrow`), so a preset sets the whole look —
// dash, width, curve, arrowhead — in one undo step. Pure data so it's trivially unit-tested.

export interface EdgePreset {
  name: string;
  title: string;
  patch: {
    color?: string;
    width?: number;
    dash?: SelectedEdge["dash"];
    curve?: number;
    arrow?: SelectedEdge["arrow"];
  };
}

export const EDGE_PRESETS: EdgePreset[] = [
  {
    name: "Arrow",
    title: "Solid straight line, single arrowhead",
    patch: { dash: "solid", width: 1.5, curve: 0, arrow: "to" },
  },
  {
    name: "Dashed",
    title: "Dashed line with a gentle auto-bow",
    patch: { dash: "dashed", width: 1.5, curve: undefined, arrow: "to" },
  },
  {
    name: "Dotted",
    title: "Dotted line, single arrowhead",
    patch: { dash: "dotted", width: 1.5, curve: undefined, arrow: "to" },
  },
  {
    name: "Thick",
    title: "Thick solid line, single arrowhead",
    patch: { dash: "solid", width: 3, curve: 0, arrow: "to" },
  },
  {
    name: "Curved",
    title: "Solid line bowed into an arc",
    patch: { dash: "solid", width: 1.5, curve: 30, arrow: "to" },
  },
  {
    name: "Double",
    title: "Solid line with arrowheads at both ends",
    patch: { dash: "solid", width: 1.5, curve: 0, arrow: "both" },
  },
];
