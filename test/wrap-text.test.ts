import { describe, expect, it } from "vitest";
import { wrapText } from "../src/mindmap/flow/text";

// Shared word-wrap used by the exporter + the layout estimate so a long label stays inside its box
// (canvas == export) and the reserved height matches the wrapped line count.
describe("wrapText", () => {
  it("keeps short text on one line", () => {
    expect(wrapText("Hi there", 200, 16)).toEqual(["Hi there"]);
  });

  it("wraps long text to multiple lines that fit the width", () => {
    const lines = wrapText("the quick brown fox jumps over the lazy dog", 80, 16);
    expect(lines.length).toBeGreaterThan(1);
    // ~9 chars per 80px line at 16px; allow a little slack for word boundaries
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(12);
  });

  it("respects explicit newlines", () => {
    expect(wrapText("a\nb", 200, 16)).toEqual(["a", "b"]);
  });

  it("hard-splits a single word longer than the line, losing no characters", () => {
    const lines = wrapText("supercalifragilistic", 40, 16);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe("supercalifragilistic");
  });

  it("always returns at least one (possibly empty) line", () => {
    expect(wrapText("", 100, 16)).toEqual([""]);
  });
});
