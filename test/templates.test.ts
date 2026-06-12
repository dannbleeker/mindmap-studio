import { describe, expect, it } from "vitest";
import { buildTemplate, templates } from "../src/templates";

// templates.ts was on the dashboard's least-covered list — pure logic, worth pinning.

describe("buildTemplate", () => {
  it("builds each catalogued template into a valid doc", () => {
    for (const t of templates) {
      const doc = buildTemplate(t.id);
      expect(doc.schemaVersion).toBe(1);
      expect(doc.id).toBeTruthy();
      expect(doc.root.id).toBe("root");
      expect(doc.meta?.source).toBe("new");
      expect(Array.isArray(doc.root.children)).toBe(true);
    }
  });

  it("gives the expected starter structure per template", () => {
    expect(buildTemplate("blank").root.children).toHaveLength(0);
    expect(buildTemplate("brainstorm").root.children.map((c) => c.topic)).toEqual([
      "Who",
      "What",
      "Why",
      "How",
      "When",
      "Where",
    ]);
    expect(buildTemplate("swot").root.children).toHaveLength(4);
    expect(buildTemplate("project").root.children).toHaveLength(5);
  });

  it("falls back to the first template for an unknown id", () => {
    const fallback = buildTemplate("does-not-exist");
    const blank = buildTemplate(templates[0].id);
    expect(fallback.root.children).toHaveLength(blank.root.children.length);
    expect(fallback.title).toBe(blank.title);
  });

  it("mints a fresh id per build (no shared reference)", () => {
    expect(buildTemplate("blank").id).not.toBe(buildTemplate("blank").id);
  });
});
