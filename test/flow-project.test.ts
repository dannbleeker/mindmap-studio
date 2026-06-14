import { describe, expect, it } from "vitest";
import { project } from "../src/mindmap/flow/project";
import type { MindMapDoc } from "../src/model/types";

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "Root",
  root: {
    id: "r",
    topic: "Root",
    children: [
      { id: "a", topic: "A", children: [{ id: "a1", topic: "A1", children: [] }] },
      { id: "b", topic: "B", collapsed: true, children: [{ id: "b1", topic: "B1", children: [] }] },
      { id: "c", topic: "C", side: "left", children: [] },
    ],
  },
  links: [{ id: "l1", from: "a", to: "c", label: "rel" }],
  floatingTopics: [
    { id: "f", topic: "Float", children: [{ id: "f1", topic: "F1", children: [] }] },
  ],
};

describe("flow project (model → React Flow)", () => {
  const { nodes, edges } = project(doc);
  const node = (id: string) => nodes.find((n) => n.id === id);

  it("emits the root flagged isRoot", () => {
    expect(node("r")?.data.isRoot).toBe(true);
  });

  it("omits descendants of a collapsed node but keeps the node (hasChildren)", () => {
    expect(node("b")).toBeDefined();
    expect(node("b")?.data.collapsed).toBe(true);
    expect(node("b")?.data.hasChildren).toBe(true);
    expect(node("b1")).toBeUndefined();
  });

  it("projects one node per visible MapNode", () => {
    // r, a, a1, b (collapsed → b1 omitted), c, f, f1
    expect(nodes.map((n) => n.id).sort()).toEqual(["a", "a1", "b", "c", "f", "f1", "r"]);
  });

  it("emits a branch edge per parent→child with side-based handles", () => {
    const ra = edges.find((e) => e.id === "e:r:a");
    expect(ra?.type).toBe("branch");
    expect(ra?.sourceHandle).toBe("sr"); // a is on the right
    const rc = edges.find((e) => e.id === "e:r:c");
    expect(rc?.sourceHandle).toBe("sl"); // c is pinned left
    expect(rc?.targetHandle).toBe("tr");
  });

  it("renders a cross-link as a dashed default edge with its label", () => {
    const link = edges.find((e) => e.id === "l1");
    expect(link?.type).toBe("default");
    expect(link?.label).toBe("rel");
    expect(link?.data?.crosslink).toBe(true);
  });

  it("flags floating topics and gives each branch a palette colour", () => {
    expect(node("f")?.data.floating).toBe(true);
    expect(node("f1")?.data.floating).toBe(true);
    expect(node("a")?.data.floating).toBe(false);
    // sibling branches get distinct palette colours
    expect(node("a")?.data.branchColor).not.toBe(node("b")?.data.branchColor);
  });

  it("honours an explicit side and assigns the rest", () => {
    expect(node("c")?.data.side).toBe("left");
    expect(["left", "right"]).toContain(node("a")?.data.side);
  });
});
