import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { MindMapDoc } from "../src/model/types";
import { loadCurrent, saveCurrent } from "../src/store/mapStore";

const docOf = (title: string): MindMapDoc => ({
  schemaVersion: 1,
  id: title,
  title,
  root: { id: "r", topic: title, children: [{ id: "c", topic: "child", children: [] }] },
});

describe("mapStore", () => {
  it("persists and reloads the current map", async () => {
    await saveCurrent(docOf("Saved Map"));
    const back = await loadCurrent();
    expect(back?.title).toBe("Saved Map");
    expect(back?.root.children.map((c) => c.topic)).toEqual(["child"]);
  });

  it("overwrites the current map on the next save", async () => {
    await saveCurrent(docOf("First"));
    await saveCurrent(docOf("Second"));
    expect((await loadCurrent())?.title).toBe("Second");
  });
});
