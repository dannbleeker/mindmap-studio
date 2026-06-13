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
  {
    id: "five-whys",
    name: "5 Whys (root cause)",
    build: () =>
      doc("5 Whys", [
        {
          id: "problem",
          topic: "Problem statement",
          children: [
            {
              id: "w1",
              topic: "Why? (1)",
              children: [
                {
                  id: "w2",
                  topic: "Why? (2)",
                  children: [
                    {
                      id: "w3",
                      topic: "Why? (3)",
                      children: [
                        {
                          id: "w4",
                          topic: "Why? (4)",
                          children: [leaf("w5", "Why? (5) → root cause")],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]),
  },
  {
    id: "decision",
    name: "Decision (pros & cons)",
    build: () =>
      doc("Decision", [
        leaf("context", "Context"),
        leaf("options", "Options"),
        leaf("pros", "Pros"),
        leaf("cons", "Cons"),
        leaf("criteria", "Criteria"),
        leaf("choice", "Decision"),
      ]),
  },
  {
    id: "retrospective",
    name: "Retrospective",
    build: () =>
      doc("Retrospective", [
        leaf("start", "Start"),
        leaf("stop", "Stop"),
        leaf("continue", "Continue"),
        leaf("actions", "Action items"),
      ]),
  },
  {
    id: "meeting",
    name: "Meeting notes",
    build: () =>
      doc("Meeting", [
        leaf("agenda", "Agenda"),
        leaf("attendees", "Attendees"),
        leaf("decisions", "Decisions"),
        leaf("actions", "Action items"),
        leaf("notes", "Notes"),
      ]),
  },
  {
    id: "pre-mortem",
    name: "Pre-mortem",
    build: () =>
      doc("Pre-mortem", [
        leaf("goal", "The goal"),
        leaf("failed", "Imagine it failed"),
        leaf("why", "Why it failed"),
        leaf("signs", "Early warning signs"),
        leaf("prevent", "Preventive actions"),
      ]),
  },
];

export function buildTemplate(id: string): MindMapDoc {
  return (templates.find((t) => t.id === id) ?? templates[0]).build();
}
