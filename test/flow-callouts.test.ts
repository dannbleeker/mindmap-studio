import { describe, expect, it } from "vitest";
import { addCallout, deleteCallout, setCalloutText } from "../src/mindmap/flow/ops";
import type { MindMapDoc } from "../src/model/types";

const base = (): MindMapDoc => ({
  schemaVersion: 1,
  id: "d",
  title: "Root",
  root: { id: "r", topic: "Root", children: [{ id: "a", topic: "A", children: [] }] },
});

describe("callout ops", () => {
  it("adds a callout with default text and staggers repeats", () => {
    const d1 = addCallout(base(), "a").doc;
    const first = d1.root.children[0].callouts ?? [];
    expect(first).toHaveLength(1);
    expect(first[0].text).toBe("Note");
    const cs = addCallout(d1, "a").doc.root.children[0].callouts ?? [];
    expect(cs).toHaveLength(2);
    expect(cs[0].dy).not.toBe(cs[1].dy); // staggered so they don't stack
  });

  it("sets a callout's text", () => {
    const d1 = addCallout(base(), "a").doc;
    const id = d1.root.children[0].callouts?.[0].id ?? "";
    const d2 = setCalloutText(d1, "a", id, "Reviewed").doc;
    expect(d2.root.children[0].callouts?.[0].text).toBe("Reviewed");
  });

  it("deletes a callout, clearing the array when it empties", () => {
    const d1 = addCallout(base(), "a").doc;
    const id = d1.root.children[0].callouts?.[0].id ?? "";
    const d2 = deleteCallout(d1, "a", id).doc;
    expect(d2.root.children[0].callouts).toBeUndefined();
  });

  it("is a no-op for an unknown node or callout id", () => {
    const d = base();
    expect(addCallout(d, "nope").doc).toBe(d);
    expect(setCalloutText(d, "a", "missing", "y").doc).toBe(d);
    expect(deleteCallout(d, "a", "missing").doc).toBe(d);
  });
});
