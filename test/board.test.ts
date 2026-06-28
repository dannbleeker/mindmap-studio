import { describe, expect, it } from "vitest";
import { UNTAGGED, boardColumns, retagForMove } from "../src/board";
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

  it("leaves a non-task card's progress undefined", () => {
    const beta = cols.find((c) => c.tag === "now")?.cards.find((x) => x.id === "b");
    expect(beta?.progress).toBeUndefined();
  });

  it("omits the Untagged column when every node is tagged", () => {
    const allTagged: MindMapDoc = {
      schemaVersion: 1,
      id: "d2",
      title: "T",
      root: {
        id: "r",
        topic: "Root",
        tags: ["x"],
        children: [{ id: "k", topic: "K", tags: ["x"], children: [] }],
      },
    };
    expect(boardColumns(allTagged).map((c) => c.tag)).toEqual(["x"]);
  });

  it("lists a topic once per column even if it carries the same tag twice", () => {
    // A duplicate tag (from an import or a hand-edited file) must not list — or double-count — a card.
    const dup: MindMapDoc = {
      schemaVersion: 1,
      id: "d3",
      title: "T",
      root: { id: "r", topic: "Root", tags: ["dup", "dup"], children: [] },
    };
    const col = boardColumns(dup).find((c) => c.tag === "dup");
    expect(col?.cards.map((x) => x.id)).toEqual(["r"]); // once, not ["r","r"]
  });
});

describe("retagForMove (drag-to-retag)", () => {
  it("drops the source tag and adds the target tag, preserving other tags", () => {
    expect(retagForMove(["now", "next"], "now", "later").sort()).toEqual(["later", "next"]);
  });
  it("dropping into Untagged only removes the source tag", () => {
    expect(retagForMove(["now"], "now", UNTAGGED)).toEqual([]);
  });
  it("dragging from Untagged only adds the target tag", () => {
    expect(retagForMove([], UNTAGGED, "now")).toEqual(["now"]);
  });
  it("doesn't duplicate a tag the card already carries", () => {
    expect(retagForMove(["a", "b"], "a", "b")).toEqual(["b"]);
  });
});
