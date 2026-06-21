import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { MindMapDoc } from "../src/model/types";
import {
  deleteMap,
  getAllMaps,
  getLastOpened,
  latestVersionDoc,
  listMaps,
  loadMap,
  loadMapHandle,
  saveMap,
  saveMapHandle,
  saveVersion,
  setLastOpened,
} from "../src/store/mapStore";

const docOf = (id: string, title: string): MindMapDoc => ({
  schemaVersion: 1,
  id,
  title,
  root: { id: "r", topic: title, children: [{ id: "c", topic: "child", children: [] }] },
});

// fake-indexeddb gives this file its own fresh database; tests within it share that DB and run in
// source order. The cold-boot assertions below rely on running before anything is written, so they
// come first.
describe("mapStore — cold boot", () => {
  it("getLastOpened returns null before anything has been opened", async () => {
    expect(await getLastOpened()).toBeNull();
  });

  it("getAllMaps returns an empty list on a fresh store", async () => {
    expect(await getAllMaps()).toEqual([]);
  });

  it("latestVersionDoc returns null for a map with no snapshots", async () => {
    expect(await latestVersionDoc("never-saved")).toBeNull();
  });
});

describe("mapStore", () => {
  it("saves and loads a map by id", async () => {
    await saveMap(docOf("m1", "First"));
    const back = await loadMap("m1");
    expect(back?.title).toBe("First");
    expect(back?.root.children.map((c) => c.topic)).toEqual(["child"]);
  });

  it("stamps meta.updatedAt on save without mutating the caller's doc", async () => {
    const doc = docOf("m1b", "Stamped");
    await saveMap(doc);
    expect(doc.meta?.updatedAt).toBeUndefined(); // caller's object is untouched
    expect((await loadMap("m1b"))?.meta?.updatedAt).toBeTypeOf("number");
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

describe("mapStore — disk-file handles", () => {
  // A minimal stand-in for a FileSystemFileHandle; only needs to be structured-cloneable for IndexedDB.
  const fakeHandle = (name: string) => ({ kind: "file", name }) as unknown as FileSystemFileHandle;

  it("saves, loads, and re-binds a handle by map id", async () => {
    await saveMapHandle("h1", fakeHandle("plan.mmst"));
    expect((await loadMapHandle("h1"))?.name).toBe("plan.mmst");
  });

  it("returns null for a map with no bound file", async () => {
    expect(await loadMapHandle("never-bound")).toBeNull();
  });

  it("drops the handle when the map is deleted", async () => {
    await saveMap(docOf("h2", "Bound"));
    await saveMapHandle("h2", fakeHandle("bound.mmst"));
    await deleteMap("h2");
    expect(await loadMapHandle("h2")).toBeNull();
  });
});

describe("mapStore — getAllMaps / listMaps", () => {
  it("getAllMaps returns the full docs that were saved", async () => {
    await saveMap(docOf("g1", "Gamma"));
    await saveMap(docOf("g2", "Delta"));
    const all = await getAllMaps();
    const byId = new Map(all.map((d) => [d.id, d]));
    expect(byId.get("g1")?.root.topic).toBe("Gamma"); // full doc, not just a summary
    expect(byId.get("g2")?.root.children).toHaveLength(1);
  });

  it("getAllMaps reflects deletions", async () => {
    await saveMap(docOf("g3", "Temp"));
    expect((await getAllMaps()).some((d) => d.id === "g3")).toBe(true);
    await deleteMap("g3");
    expect((await getAllMaps()).some((d) => d.id === "g3")).toBe(false);
  });

  it("listMaps sorts by title across the whole library", async () => {
    await saveMap(docOf("s-c", "Zeta"));
    await saveMap(docOf("s-a", "Acme"));
    await saveMap(docOf("s-b", "Mid"));
    const list = await listMaps();
    const titles = list.map((m) => m.title);
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });
});

describe("mapStore — latestVersionDoc edge cases", () => {
  it("returns the newest snapshot's doc regardless of save order", async () => {
    // Save out of order: the later timestamp must win even though it was written first.
    await saveVersion(docOf("lv", "Newer"), 5000);
    await saveVersion(docOf("lv", "Older"), 1000);
    expect((await latestVersionDoc("lv"))?.title).toBe("Newer");
  });

  it("does not bleed across maps (each map's latest is its own)", async () => {
    await saveVersion(docOf("lvA", "A-latest"), 2000);
    await saveVersion(docOf("lvB", "B-latest"), 9000);
    expect((await latestVersionDoc("lvA"))?.title).toBe("A-latest");
    expect((await latestVersionDoc("lvB"))?.title).toBe("B-latest");
  });
});

describe("mapStore — concurrency", () => {
  it("handles concurrent saveMap + saveVersion without losing writes", async () => {
    const doc = docOf("cc", "Concurrent");
    // Fire a map save and several version snapshots at once; all must land.
    await Promise.all([
      saveMap(doc),
      saveVersion(docOf("cc", "v1"), 1000),
      saveVersion(docOf("cc", "v2"), 2000),
      saveVersion(docOf("cc", "v3"), 3000),
    ]);
    expect((await loadMap("cc"))?.title).toBe("Concurrent");
    expect((await latestVersionDoc("cc"))?.title).toBe("v3"); // newest snapshot is intact
  });

  it("parallel saveMap calls for distinct ids all persist", async () => {
    await Promise.all([
      saveMap(docOf("p1", "P1")),
      saveMap(docOf("p2", "P2")),
      saveMap(docOf("p3", "P3")),
    ]);
    const ids = (await getAllMaps()).map((d) => d.id);
    expect(ids).toEqual(expect.arrayContaining(["p1", "p2", "p3"]));
  });
});
