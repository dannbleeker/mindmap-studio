import { describe, expect, it } from "vitest";
import { project } from "../src/mindmap/flow/project";
import { normalizeDoc } from "../src/model/normalize";
import type { MindMapDoc } from "../src/model/types";

// normalizeDoc guards the load/parse boundary: a corrupt or schema-drifted map (from IndexedDB or a
// hand-edited file) is coerced to a projectable shape so it renders salvaged instead of white-screening
// the app. A well-formed doc passes through unchanged.

describe("normalizeDoc", () => {
  it("coerces a missing children into an empty array", () => {
    const corrupt = {
      schemaVersion: 1,
      id: "d",
      title: "T",
      root: { id: "r", topic: "R" }, // no children
    } as unknown as MindMapDoc;
    const d = normalizeDoc(corrupt);
    expect(Array.isArray(d.root.children)).toBe(true);
    expect(d.root.children).toEqual([]);
  });

  it("drops non-object children and normalises nested nodes (non-array children → [])", () => {
    const corrupt = {
      schemaVersion: 1,
      id: "d",
      title: "T",
      root: {
        id: "r",
        topic: "R",
        children: [null, "x", { id: "a", topic: "A", children: "nope" }],
      },
    } as unknown as MindMapDoc;
    const d = normalizeDoc(corrupt);
    expect(d.root.children.map((c) => c.id)).toEqual(["a"]); // null + "x" dropped
    expect(d.root.children[0].children).toEqual([]); // "nope" → []
  });

  it("supplies an id when missing and coerces a non-string topic to empty", () => {
    const corrupt = {
      schemaVersion: 1,
      id: "d",
      title: "T",
      root: { children: [{ topic: 5, children: [] }] },
    } as unknown as MindMapDoc;
    const d = normalizeDoc(corrupt);
    expect(typeof d.root.id).toBe("string");
    expect(d.root.id.length).toBeGreaterThan(0);
    expect(d.root.children[0].topic).toBe(""); // non-string → ""
  });

  it("coerces a non-array floatingTopics to undefined and normalises valid ones", () => {
    const bad = {
      schemaVersion: 1,
      id: "d",
      title: "T",
      root: { id: "r", topic: "R", children: [] },
      floatingTopics: "oops",
    } as unknown as MindMapDoc;
    expect(normalizeDoc(bad).floatingTopics).toBeUndefined();
    const ok = {
      schemaVersion: 1,
      id: "d",
      title: "T",
      root: { id: "r", topic: "R", children: [] },
      floatingTopics: [{ id: "f", topic: "F" }], // missing children
    } as unknown as MindMapDoc;
    expect(normalizeDoc(ok).floatingTopics?.[0].children).toEqual([]);
  });

  it("passes a well-formed doc through value-identical (links/boundaries/fields preserved)", () => {
    const good: MindMapDoc = {
      schemaVersion: 1,
      id: "d",
      title: "T",
      root: {
        id: "r",
        topic: "R",
        children: [{ id: "a", topic: "A", note: "n", children: [] }],
      },
      links: [{ id: "l", from: "a", to: "r", label: "x" }],
      boundaries: [{ id: "bd", nodeIds: ["a"], label: "g" }],
    };
    expect(normalizeDoc(good)).toEqual(good);
  });

  it("makes a corrupt doc projectable instead of throwing", () => {
    const corrupt = {
      schemaVersion: 1,
      id: "d",
      title: "T",
      root: { id: "r", topic: "R" }, // missing children → the hazard project() chokes on
    } as unknown as MindMapDoc;
    expect(() => project(corrupt, undefined, false, "side")).toThrow(); // the bug is real
    expect(() => project(normalizeDoc(corrupt), undefined, false, "side")).not.toThrow(); // fixed
  });
});
