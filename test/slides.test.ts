import { describe, expect, it } from "vitest";
import type { MindMapDoc } from "../src/model/types";
import { presentationSlides } from "../src/present/slides";

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "Plan",
  root: {
    id: "r",
    topic: "Plan",
    children: [
      { id: "a", topic: "Alpha", children: [{ id: "a1", topic: "Alpha One", children: [] }] },
      { id: "b", topic: "Beta", children: [] },
    ],
  },
};

describe("presentationSlides", () => {
  it("opens with an overview, then one slide per top-level branch", () => {
    const slides = presentationSlides(doc);
    expect(slides.map((s) => s.heading)).toEqual(["Plan", "Alpha", "Beta"]);
    expect(slides[0].isOverview).toBe(true);
    expect(slides[1].isOverview).toBe(false);
    expect(slides[1].node.children.map((c) => c.topic)).toEqual(["Alpha One"]);
  });

  it("produces a single overview slide for a childless map", () => {
    const lonely: MindMapDoc = {
      schemaVersion: 1,
      id: "x",
      title: "Solo",
      root: { id: "r", topic: "Solo", children: [] },
    };
    expect(presentationSlides(lonely).map((s) => s.heading)).toEqual(["Solo"]);
  });
});
