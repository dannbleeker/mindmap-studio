import { describe, expect, it } from "vitest";
import { parseLibrary, serializeLibrary, tryParseLibrary } from "../src/io/library";
import type { MindMapDoc } from "../src/model/types";

const map = (id: string, title: string): MindMapDoc => ({
  schemaVersion: 1,
  id,
  title,
  root: { id: "root", topic: title, children: [] },
});

describe("library backup I/O", () => {
  it("round-trips all maps", () => {
    const docs = [map("a", "Alpha"), map("b", "Beta")];
    expect(parseLibrary(serializeLibrary(docs))).toEqual(docs);
  });

  it("preserves a workbook's sheetGroup so its sheets stay grouped on import", () => {
    const s1 = { ...map("s1", "Sheet 1"), meta: { sheetGroup: "wb" } };
    const s2 = { ...map("s2", "Sheet 2"), meta: { sheetGroup: "wb" } };
    const back = parseLibrary(serializeLibrary([s1, s2]));
    expect(back.map((m) => m.meta?.sheetGroup)).toEqual(["wb", "wb"]);
  });

  it("rejects a single-map .json (not a library backup)", () => {
    const single = JSON.stringify(map("a", "Alpha"));
    expect(() => parseLibrary(single)).toThrow(/library backup/);
    expect(tryParseLibrary(single)).toBeNull();
  });

  it("rejects a backup that contains an invalid map", () => {
    const bad = JSON.stringify({
      schemaVersion: 1,
      kind: "mindmap-library",
      maps: [{ nope: true }],
    });
    expect(() => parseLibrary(bad)).toThrow(/invalid map/);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseLibrary("{not json")).toThrow(/Not valid JSON/);
    expect(tryParseLibrary("{not json")).toBeNull();
  });
});
