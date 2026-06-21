import type { MapNode } from "./model/types";

// "Map parts" — ready-made mini-structures inserted under the selected topic (MindManager's map
// parts). Each builds a small forest (a labelled parent + its prompts) grafted via
// addSubtreeToSelected, which re-ids the nodes. Pure + deterministic (counter ids); listed in the
// Insert menu + ⌘K.

export interface MapPart {
  id: string;
  name: string;
  build: () => MapNode[];
}

let pid = 0;
/** A labelled parent topic with a flat list of child prompts (deterministic local ids). */
function tree(root: string, kids: string[]): MapNode[] {
  pid = 0;
  const children = kids.map<MapNode>((topic) => ({ id: `mp${++pid}`, topic, children: [] }));
  return [{ id: `mp${++pid}`, topic: root, children }];
}

export const MAP_PARTS: readonly MapPart[] = [
  {
    id: "swot",
    name: "SWOT",
    build: () => tree("SWOT", ["Strengths", "Weaknesses", "Opportunities", "Threats"]),
  },
  { id: "pros-cons", name: "Pros & cons", build: () => tree("Pros & cons", ["Pros", "Cons"]) },
  {
    id: "5w1h",
    name: "5W1H",
    build: () => tree("5W1H", ["Who", "What", "When", "Where", "Why", "How"]),
  },
  {
    id: "agenda",
    name: "Meeting agenda",
    build: () =>
      tree("Meeting agenda", ["Attendees", "Topics", "Decisions", "Action items", "Next steps"]),
  },
];

/** Build a map part's forest by id (or null). Pure. */
export function buildMapPart(id: string): MapNode[] | null {
  return MAP_PARTS.find((p) => p.id === id)?.build() ?? null;
}
