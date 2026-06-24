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
  {
    id: "pestle",
    name: "PESTLE",
    build: () =>
      doc("PESTLE analysis", [
        leaf("political", "Political"),
        leaf("economic", "Economic"),
        leaf("social", "Social"),
        leaf("technological", "Technological"),
        leaf("legal", "Legal"),
        leaf("environmental", "Environmental"),
      ]),
  },
  {
    id: "fishbone",
    name: "Fishbone (cause & effect)",
    // The spine is the effect; the branches are the classic 6M cause categories. Switch to the
    // Fishbone layout (Layout menu) to draw it as the herringbone diagram.
    build: () =>
      doc("Effect / problem", [
        leaf("people", "People"),
        leaf("process", "Process"),
        leaf("equipment", "Equipment"),
        leaf("materials", "Materials"),
        leaf("environment", "Environment"),
        leaf("management", "Management"),
      ]),
  },
  {
    id: "okrs",
    name: "OKRs",
    build: () =>
      doc("Objective", [
        leaf("kr1", "Key result 1"),
        leaf("kr2", "Key result 2"),
        leaf("kr3", "Key result 3"),
        leaf("initiatives", "Initiatives"),
      ]),
  },
  {
    id: "essay",
    name: "Essay outline",
    build: () =>
      doc("Essay", [
        leaf("thesis", "Thesis"),
        leaf("intro", "Introduction"),
        leaf("p1", "Point 1"),
        leaf("p2", "Point 2"),
        leaf("p3", "Point 3"),
        leaf("counter", "Counterpoint"),
        leaf("conclusion", "Conclusion"),
      ]),
  },
  {
    id: "presentation",
    name: "Presentation outline",
    build: () =>
      doc("Presentation", [
        leaf("hook", "Hook"),
        leaf("message", "Core message"),
        leaf("pt1", "Point 1"),
        leaf("pt2", "Point 2"),
        leaf("pt3", "Point 3"),
        leaf("cta", "Call to action"),
      ]),
  },
  {
    id: "lean-canvas",
    name: "Lean Canvas",
    build: () =>
      doc("Lean Canvas", [
        leaf("problem", "Problem"),
        leaf("solution", "Solution"),
        leaf("uvp", "Unique value proposition"),
        leaf("customers", "Customer segments"),
        leaf("channels", "Channels"),
        leaf("revenue", "Revenue streams"),
        leaf("costs", "Cost structure"),
        leaf("metrics", "Key metrics"),
        leaf("advantage", "Unfair advantage"),
      ]),
  },
  {
    id: "persona",
    name: "Persona",
    build: () =>
      doc("Persona", [
        leaf("goals", "Goals"),
        leaf("pains", "Pains"),
        leaf("behaviours", "Behaviours"),
        leaf("context", "Context"),
        leaf("quote", "Quote"),
      ]),
  },
];

export function buildTemplate(id: string): MindMapDoc {
  return (templates.find((t) => t.id === id) ?? templates[0]).build();
}
