import { describe, expect, it } from "vitest";
import type { MindMapDoc } from "../src/model/types";
import { mapStats } from "../src/stats";

// mapStats summarises a map in one walk — structure, task health, and content tallies — for the
// Map-statistics panel. Pure + deterministic (overdue is anchored on the passed `today`).
const doc = (): MindMapDoc => ({
  schemaVersion: 1,
  id: "d",
  title: "Root",
  root: {
    id: "r",
    topic: "Root",
    children: [
      {
        id: "a",
        topic: "Alpha",
        note: "a note",
        tags: ["x"],
        icons: ["⭐"],
        task: { progress: 1, due: "2026-01-01" },
        attachments: [{ name: "f.pdf", dataUrl: "data:,", size: 1 }],
        children: [
          {
            id: "a1",
            topic: "A1",
            tags: ["x", "y"],
            task: { progress: 0.5, due: "2026-01-01" },
            children: [],
          },
        ],
      },
      { id: "b", topic: "Bravo", icons: ["❗"], children: [] },
    ],
  },
  links: [{ id: "l", from: "a", to: "b" }],
  boundaries: [{ id: "bd", nodeIds: ["a", "b"], label: "g" }],
  floatingTopics: [{ id: "f", topic: "Float", children: [] }],
});

describe("mapStats", () => {
  it("counts structure, tasks, and content in a single pass", () => {
    const s = mapStats(doc(), "2026-06-21");
    expect(s.topics).toBe(4); // r, a, a1, b
    expect(s.leaves).toBe(2); // a1, b
    expect(s.maxDepth).toBe(2); // a1
    expect(s.floating).toBe(1);
    expect(s.tasks).toBe(2); // a, a1
    expect(s.completed).toBe(1); // a
    expect(s.overdue).toBe(1); // a1 (past due, 50%)
    expect(s.completion).toBeCloseTo(0.5);
    expect(s.notes).toBe(1);
    expect(s.attachments).toBe(1);
    expect(s.tags).toBe(2); // x, y
    expect(s.markers).toBe(2); // ⭐, ❗
    expect(s.links).toBe(1);
    expect(s.boundaries).toBe(1);
  });

  it("reports zero completion + no overdue for a task-free map", () => {
    const s = mapStats({
      schemaVersion: 1,
      id: "e",
      title: "E",
      root: { id: "r", topic: "R", children: [] },
    });
    expect(s.tasks).toBe(0);
    expect(s.completion).toBe(0);
    expect(s.overdue).toBe(0);
    expect(s.topics).toBe(1);
  });
});
