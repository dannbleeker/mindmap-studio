import { describe, expect, it } from "vitest";
import { UNTAGGED, boardColumns } from "../src/board";
import type { MindMapDoc } from "../src/model/types";

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "T",
  root: {
    id: "r",
    topic: "Root",
    children: [
      {
        id: "a",
        topic: "Alpha",
        tags: ["now"],
        task: { progress: 0.5, due: "2026-07-01" },
        children: [],
      },
      { id: "b", topic: "Beta", tags: ["now", "next"], children: [] },
      { id: "c", topic: "Gamma", children: [] },
    ],
  },
  floatingTopics: [{ id: "f", topic: "Float", tags: ["next"], children: [] }],
};

describe("boardColumns", () => {
  const cols = boardColumns(doc);

  it("makes one column per tag, sorted, with the Untagged column last", () => {
    expect(cols.map((c) => c.tag)).toEqual(["next", "now", UNTAGGED]);
  });

  it("puts a multi-tagged topic in every matching column", () => {
    expect(cols.find((c) => c.tag === "now")?.cards.map((x) => x.topic)).toEqual(["Alpha", "Beta"]);
    expect(cols.find((c) => c.tag === "next")?.cards.map((x) => x.topic)).toEqual([
      "Beta",
      "Float",
    ]);
  });

  it("collects untagged topics (root + Gamma) into the Untagged column", () => {
    expect(cols.find((c) => c.tag === UNTAGGED)?.cards.map((x) => x.topic)).toEqual([
      "Root",
      "Gamma",
    ]);
  });

  it("carries each card's rolled-up progress + due", () => {
    const alpha = cols.find((c) => c.tag === "now")?.cards.find((x) => x.id === "a");
    expect(alpha?.progress).toBe(50);
    expect(alpha?.due).toBe("2026-07-01");
  });
});
