import { describe, expect, it } from "vitest";
import { buildDeckHtml } from "../src/io/deck";
import type { MindMapDoc } from "../src/model/types";

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "Plan",
  root: {
    id: "r",
    topic: "Plan",
    children: [
      { id: "a", topic: "Alpha", children: [{ id: "a1", topic: "Alpha One", children: [] }] },
      { id: "b", topic: "Beta", children: [] },
    ],
  },
};

describe("buildDeckHtml", () => {
  it("produces a self-contained html document", () => {
    const html = buildDeckHtml(doc);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Plan</title>");
    // Self-contained: no external stylesheet/script references.
    expect(html).not.toMatch(/<link\b/);
    expect(html).not.toMatch(/<script[^>]*\bsrc=/);
  });

  it("emits an overview slide plus one slide per top-level branch", () => {
    const html = buildDeckHtml(doc);
    const slides = html.match(/<section class="slide">/g) ?? [];
    expect(slides).toHaveLength(3); // overview + Alpha + Beta
    expect(html).toContain("<h1>Plan</h1>");
    expect(html).toContain("<h1>Alpha</h1>");
    expect(html).toContain("<h1>Beta</h1>");
  });

  it("renders nested bullets for a branch's subtree", () => {
    const html = buildDeckHtml(doc);
    expect(html).toContain("<li>Alpha One</li>");
  });

  it("collapses to a single overview slide for a childless map", () => {
    const lonely: MindMapDoc = {
      schemaVersion: 1,
      id: "x",
      title: "Solo",
      root: { id: "r", topic: "Solo", children: [] },
    };
    const html = buildDeckHtml(lonely);
    expect(html.match(/<section class="slide">/g) ?? []).toHaveLength(1);
  });

  it("escapes topic text so a malicious topic cannot inject markup", () => {
    const evil: MindMapDoc = {
      schemaVersion: 1,
      id: "e",
      title: "T",
      root: {
        id: "r",
        topic: "T",
        children: [{ id: "x", topic: '<img src=x onerror="alert(1)">', children: [] }],
      },
    };
    const html = buildDeckHtml(evil);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});
