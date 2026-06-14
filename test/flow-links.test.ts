import { describe, expect, it } from "vitest";
import { addLink, deleteLink, setLinkLabel } from "../src/mindmap/flow/ops";
import type { MindMapDoc } from "../src/model/types";

const base = (): MindMapDoc => ({
  schemaVersion: 1,
  id: "d",
  title: "Root",
  root: {
    id: "r",
    topic: "Root",
    children: [
      { id: "a", topic: "A", children: [] },
      { id: "b", topic: "B", children: [] },
    ],
  },
});

describe("cross-link ops", () => {
  it("adds a labelled link between two nodes", () => {
    const links = addLink(base(), "a", "b", "depends on").doc.links ?? [];
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ from: "a", to: "b", label: "depends on" });
    expect(links[0].id).toBeTruthy();
  });

  it("adds an unlabelled link with no label key", () => {
    const link = (addLink(base(), "a", "b").doc.links ?? [])[0];
    expect(link.from).toBe("a");
    expect("label" in link).toBe(false);
  });

  it("is a no-op for a self-link, an unknown node, or an exact duplicate", () => {
    const d = base();
    expect(addLink(d, "a", "a").doc).toBe(d);
    expect(addLink(d, "a", "nope").doc).toBe(d);
    const once = addLink(d, "a", "b").doc;
    expect(addLink(once, "a", "b").doc).toBe(once);
  });

  it("sets and clears a link label", () => {
    const d1 = addLink(base(), "a", "b").doc;
    const id = (d1.links ?? [])[0].id;
    expect(setLinkLabel(d1, id, "rel").doc.links?.[0]?.label).toBe("rel");
    const cleared = setLinkLabel(setLinkLabel(d1, id, "rel").doc, id, "").doc.links?.[0];
    expect(cleared && "label" in cleared).toBe(false);
  });

  it("deletes a link, clearing the array when it empties", () => {
    const d1 = addLink(base(), "a", "b").doc;
    const id = (d1.links ?? [])[0].id;
    expect(deleteLink(d1, id).doc.links).toBeUndefined();
  });

  it("is a no-op when setting/deleting an unknown link id", () => {
    const d = addLink(base(), "a", "b").doc;
    expect(setLinkLabel(d, "nope", "x").doc).toBe(d);
    expect(deleteLink(d, "nope").doc).toBe(d);
  });
});
