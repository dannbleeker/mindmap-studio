import { describe, expect, it } from "vitest";
import { MAP_LINK_PREFIX, NODE_LINK_PREFIX, classifyLink } from "../src/mindmap/contract";

describe("classifyLink", () => {
  it("recognises an in-map topic jump (#node=)", () => {
    expect(classifyLink(`${NODE_LINK_PREFIX}abc123`)).toEqual({ kind: "node", id: "abc123" });
  });

  it("recognises an in-app map link (#map=)", () => {
    expect(classifyLink(`${MAP_LINK_PREFIX}map-7`)).toEqual({ kind: "map", id: "map-7" });
  });

  it("treats anything else as an external URL", () => {
    expect(classifyLink("https://example.test/x")).toEqual({
      kind: "external",
      url: "https://example.test/x",
    });
    expect(classifyLink("")).toEqual({ kind: "external", url: "" });
  });

  it("handles an empty target id gracefully", () => {
    expect(classifyLink(NODE_LINK_PREFIX)).toEqual({ kind: "node", id: "" });
  });
});
