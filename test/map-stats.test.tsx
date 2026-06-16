// MapStats — the right-panel empty state (shown when no node is selected). Renders to static markup
// (node env) so the tally over the live doc (topics / branches / task-progress from node.task.progress)
// is exercised across the with-tasks, no-tasks, nested, and empty-title cases.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapStats } from "../src/components/MapStats";
import type { MindMapDoc } from "../src/model/types";

const doc = (title: string, root: MindMapDoc["root"]): MindMapDoc => ({
  schemaVersion: 1,
  id: "d",
  title,
  root,
});

describe("MapStats", () => {
  it("counts topics + first-level branches and shows task progress", () => {
    const d = doc("Plan", {
      id: "root",
      topic: "Plan",
      children: [
        { id: "a", topic: "A", task: { progress: 1 }, children: [] },
        {
          id: "b",
          topic: "B",
          task: { progress: 0.5 },
          children: [{ id: "b1", topic: "B1", children: [] }],
        },
        { id: "c", topic: "C", children: [] },
      ],
    });
    const html = renderToStaticMarkup(<MapStats doc={d} />);
    expect(html).toContain("Plan"); // title in the head
    expect(html).toContain("No node selected");
    expect(html).toContain(">5<"); // 5 topics total (root + a + b + b1 + c)
    expect(html).toContain(">3<"); // 3 branches
    expect(html).toContain("branches");
    expect(html).toContain("Task progress");
    expect(html).toContain("1/2"); // 1 of 2 tasks done (progress>=1)
  });

  it("hides the task-progress block when no node carries progress", () => {
    const d = doc("Ideas", {
      id: "root",
      topic: "Ideas",
      children: [{ id: "a", topic: "A", children: [] }],
    });
    const html = renderToStaticMarkup(<MapStats doc={d} />);
    expect(html).not.toContain("Task progress");
    expect(html).toContain(">2<"); // root + a
    expect(html).toContain("branch"); // singular for 1 branch
  });

  it("falls back to 'Map' for an empty title and shows a hint", () => {
    const d = doc("", { id: "root", topic: "", children: [] });
    const html = renderToStaticMarkup(<MapStats doc={d} />);
    expect(html).toContain("Map");
    expect(html).toContain("Click any node to inspect it");
    expect(html).toContain(">1<"); // just the root
    expect(html).toContain(">0<"); // zero branches
  });
});
