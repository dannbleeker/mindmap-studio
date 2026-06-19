// @vitest-environment jsdom
//
// mapActions.handleMapAction is the MapCard kebab logic (Open / Rename / Duplicate / Export /
// Delete), wired to the store and shared by Home / All maps / Recent. It's pure action code (no
// JSX) yet was sitting at 0% — this covers each branch end-to-end against a real fake-indexeddb
// store, plus the cancel/guard paths (unknown id, cancelled prompt/confirm) that are easy to break.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MapEntry } from "../src/components/start/MapCard";
import { handleMapAction } from "../src/components/start/mapActions";
import type { StartContext } from "../src/components/start/types";
import type { MindMapDoc } from "../src/model/types";
import { getAllMaps, loadMap, saveMap } from "../src/store/mapStore";

const docOf = (id: string, title: string): MindMapDoc => ({
  schemaVersion: 1,
  id,
  title,
  root: { id: "r", topic: title, children: [{ id: "c", topic: "child", children: [] }] },
});

const entryOf = (id: string, title: string): MapEntry => ({ id, title, nodeCount: 2 });

let ctx: StartContext;

beforeEach(() => {
  ctx = {
    onOpen: vi.fn(),
    onImportFiles: vi.fn(),
    go: vi.fn(),
    libraryRev: 0,
    onLibraryChange: vi.fn(),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleMapAction", () => {
  it("returns early (no callbacks) when the map id is unknown", async () => {
    await handleMapAction("open", entryOf("missing", "Gone"), ctx);
    expect(ctx.onOpen).not.toHaveBeenCalled();
    expect(ctx.onLibraryChange).not.toHaveBeenCalled();
  });

  it("open hands the loaded doc to onOpen", async () => {
    await saveMap(docOf("m-open", "Openable"));
    await handleMapAction("open", entryOf("m-open", "Openable"), ctx);
    expect(ctx.onOpen).toHaveBeenCalledTimes(1);
    expect((ctx.onOpen as ReturnType<typeof vi.fn>).mock.calls[0][0].id).toBe("m-open");
  });

  describe("rename", () => {
    it("persists the new title to both doc.title and root.topic, then refreshes", async () => {
      await saveMap(docOf("m-ren", "Old"));
      vi.spyOn(window, "prompt").mockReturnValue("  New Name  ");
      await handleMapAction("rename", entryOf("m-ren", "Old"), ctx);
      const saved = await loadMap("m-ren");
      expect(saved?.title).toBe("New Name");
      expect(saved?.root.topic).toBe("New Name");
      expect(ctx.onLibraryChange).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when the prompt is cancelled", async () => {
      await saveMap(docOf("m-ren2", "Keep"));
      vi.spyOn(window, "prompt").mockReturnValue(null);
      await handleMapAction("rename", entryOf("m-ren2", "Keep"), ctx);
      expect((await loadMap("m-ren2"))?.title).toBe("Keep");
      expect(ctx.onLibraryChange).not.toHaveBeenCalled();
    });

    it("is a no-op when the new name is blank", async () => {
      await saveMap(docOf("m-ren3", "Keep"));
      vi.spyOn(window, "prompt").mockReturnValue("   ");
      await handleMapAction("rename", entryOf("m-ren3", "Keep"), ctx);
      expect((await loadMap("m-ren3"))?.title).toBe("Keep");
      expect(ctx.onLibraryChange).not.toHaveBeenCalled();
    });
  });

  describe("duplicate", () => {
    it("saves an independent copy with a fresh id and a (copy) title", async () => {
      await saveMap(docOf("m-dup", "Original"));
      const before = (await getAllMaps()).length;
      await handleMapAction("duplicate", entryOf("m-dup", "Original"), ctx);
      const maps = await getAllMaps();
      expect(maps.length).toBe(before + 1);
      const copy = maps.find((m) => m.id !== "m-dup" && m.title === "Original (copy)");
      expect(copy).toBeTruthy();
      expect(copy?.id).not.toBe("m-dup");
      expect(copy?.root.topic).toBe("Original (copy)");
      expect(ctx.onLibraryChange).toHaveBeenCalledTimes(1);
    });

    it("deep-clones so editing the copy can't mutate the original", async () => {
      await saveMap(docOf("m-dup2", "Source"));
      await handleMapAction("duplicate", entryOf("m-dup2", "Source"), ctx);
      const copy = (await getAllMaps()).find((m) => m.title === "Source (copy)");
      expect(copy?.root).not.toBe((await loadMap("m-dup2"))?.root);
    });
  });

  describe("delete", () => {
    it("removes the map after confirmation and refreshes", async () => {
      await saveMap(docOf("m-del", "Doomed"));
      vi.spyOn(window, "confirm").mockReturnValue(true);
      await handleMapAction("delete", entryOf("m-del", "Doomed"), ctx);
      expect(await loadMap("m-del")).toBeNull();
      expect(ctx.onLibraryChange).toHaveBeenCalledTimes(1);
    });

    it("keeps the map when the confirm is declined", async () => {
      await saveMap(docOf("m-del2", "Spared"));
      vi.spyOn(window, "confirm").mockReturnValue(false);
      await handleMapAction("delete", entryOf("m-del2", "Spared"), ctx);
      expect(await loadMap("m-del2")).not.toBeNull();
      expect(ctx.onLibraryChange).not.toHaveBeenCalled();
    });
  });

  describe("export", () => {
    it("downloads a slugified .json file of the doc", async () => {
      await saveMap(docOf("m-exp", "My Great Map!"));
      let name = "";
      let blob: Blob | undefined;
      URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
        blob = b as Blob;
        return "blob:mock";
      });
      URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        name = this.download;
      });
      await handleMapAction("export", entryOf("m-exp", "My Great Map!"), ctx);
      expect(name).toBe("my-great-map.json");
      expect(blob?.type).toBe("application/json");
      const parsed = JSON.parse(await (blob as Blob).text());
      expect(parsed.id).toBe("m-exp");
    });

    it("falls back to 'map.json' when the title has no slug-able characters", async () => {
      await saveMap(docOf("m-exp2", "!!!"));
      let name = "";
      URL.createObjectURL = vi.fn(() => "blob:mock");
      URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        name = this.download;
      });
      await handleMapAction("export", entryOf("m-exp2", "!!!"), ctx);
      expect(name).toBe("map.json");
    });
  });
});
