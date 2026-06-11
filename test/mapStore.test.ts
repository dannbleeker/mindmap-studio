import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { MindMapDoc } from "../src/model/types";
import {
  deleteMap,
  getLastOpened,
  listMaps,
  loadMap,
  saveMap,
  setLastOpened,
} from "../src/store/mapStore";

const docOf = (id: string, title: string): MindMapDoc => ({
  schemaVersion: 1,
  id,
  title,
  root: { id: "r", topic: title, children: [{ id: "c", topic: "child", children: [] }] },
});

describe("mapStore", () => {
  it("saves and loads a map by id", async () => {
    await saveMap(docOf("m1", "First"));
    const back = await loadMap("m1");
    expect(back?.title).toBe("First");
    expect(back?.root.children.map((c) => c.topic)).toEqual(["child"]);
  });

  it("returns null for an unknown id", async () => {
    expect(await loadMap("nope")).toBeNull();
  });

  it("lists saved maps (sorted by title)", async () => {
    await saveMap(docOf("m2", "Beta"));
    await saveMap(docOf("m3", "Alpha"));
    const ids = (await listMaps()).map((m) => m.id);
    expect(ids).toContain("m2");
    expect(ids).toContain("m3");
  });

  it("deletes a map", async () => {
    await saveMap(docOf("m4", "Doomed"));
    await deleteMap("m4");
    expect(await loadMap("m4")).toBeNull();
  });

  it("remembers the last-opened map", async () => {
    await setLastOpened("m1");
    expect(await getLastOpened()).toBe("m1");
  });
});
