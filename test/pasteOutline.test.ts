import { describe, expect, it } from "vitest";
import { parseOutline } from "../src/io/pasteOutline";
import type { MapNode } from "../src/model/types";

// Compare structure (topic + children) without caring about generated ids.
type Shape = { topic: string; children: Shape[] };
const shape = (nodes: MapNode[]): Shape[] =>
  nodes.map((n) => ({ topic: n.topic, children: shape(n.children) }));
const leaf = (topic: string): Shape => ({ topic, children: [] });

describe("parseOutline", () => {
  it("nests an indented bullet list (mixed -/* markers)", () => {
    expect(shape(parseOutline("- A\n  - B\n  * C\n- D"))).toEqual([
      { topic: "A", children: [leaf("B"), leaf("C")] },
      leaf("D"),
    ]);
  });

  it("uses heading levels for depth", () => {
    expect(shape(parseOutline("# A\n## B\n## C\n### D"))).toEqual([
      { topic: "A", children: [leaf("B"), { topic: "C", children: [leaf("D")] }] },
    ]);
  });

  it("strips numbered markers and treats tabs as indentation", () => {
    expect(shape(parseOutline("1. A\n\t2. B\n3. C"))).toEqual([
      { topic: "A", children: [leaf("B")] },
      leaf("C"),
    ]);
  });

  it("nests bullets under the nearest heading and ignores blank lines", () => {
    expect(shape(parseOutline("# Root\n\n- one\n- two\n  - sub\n"))).toEqual([
      { topic: "Root", children: [leaf("one"), { topic: "two", children: [leaf("sub")] }] },
    ]);
  });

  it("handles plain indented lines (no markers) and empty input", () => {
    expect(shape(parseOutline("A\n  B\n  C"))).toEqual([
      { topic: "A", children: [leaf("B"), leaf("C")] },
    ]);
    expect(parseOutline("   \n\n")).toEqual([]);
  });

  it("generates unique ids", () => {
    const collectIds = (ns: MapNode[]): string[] =>
      ns.flatMap((n) => [n.id, ...collectIds(n.children)]);
    const ids = collectIds(parseOutline("- A\n  - B\n- C"));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
