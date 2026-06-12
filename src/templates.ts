import type { MapNode, MindMapDoc } from "./model/types";

// Starter maps for the "New" menu (MindManager's template gallery, lite).
export interface MapTemplate {
  id: string;
  name: string;
  build: () => MindMapDoc;
}

const leaf = (id: string, topic: string): MapNode => ({ id, topic, children: [] });

function doc(title: string, children: MapNode[]): MindMapDoc {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title,
    root: { id: "root", topic: title, children },
    meta: { source: "new" },
  };
}

export const templates: MapTemplate[] = [
  { id: "blank", name: "Blank", build: () => doc("Untitled map", []) },
  {
    id: "brainstorm",
    name: "Brainstorm",
    build: () =>
      doc("New idea", [
        leaf("who", "Who"),
        leaf("what", "What"),
        leaf("why", "Why"),
        leaf("how", "How"),
        leaf("when", "When"),
        leaf("where", "Where"),
      ]),
  },
  {
    id: "swot",
    name: "SWOT",
    build: () =>
      doc("SWOT", [
        leaf("s", "Strengths"),
        leaf("w", "Weaknesses"),
        leaf("o", "Opportunities"),
        leaf("t", "Threats"),
      ]),
  },
  {
    id: "project",
    name: "Project plan",
    build: () =>
      doc("Project", [
        leaf("g", "Goals"),
        leaf("sc", "Scope"),
        leaf("ms", "Milestones"),
        leaf("rk", "Risks"),
        leaf("tm", "Team"),
      ]),
  },
];

export function buildTemplate(id: string): MindMapDoc {
  return (templates.find((t) => t.id === id) ?? templates[0]).build();
}
