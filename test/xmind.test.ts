import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { fromXmind, toXmind } from "../src/io/xmind";
import type { MindMapDoc } from "../src/model/types";

// biome-ignore lint/suspicious/noExplicitAny: building arbitrary XMind JSON for the fixture
function makeXmind(sheets: any): Uint8Array {
  return zipSync({ "content.json": strToU8(JSON.stringify(sheets)) });
}

const sheets = [
  {
    title: "Sheet 1",
    rootTopic: {
      title: "Central",
      children: {
        attached: [
          {
            title: "Main 1",
            href: "https://example.com",
            notes: { plain: { content: "a note" } },
            labels: ["tag1", "tag2"],
            children: { attached: [{ title: "Sub" }] },
          },
          { title: "Main 2", href: "xmind:#abc" },
        ],
      },
    },
  },
];

describe("XMind .xmind import", () => {
  it("maps the rootTopic + attached children into the canonical tree", () => {
    const doc = fromXmind(makeXmind(sheets));
    expect(doc.root.topic).toBe("Central");
    expect(doc.root.children.map((c) => c.topic)).toEqual(["Main 1", "Main 2"]);
    expect(doc.root.children[0].children[0].topic).toBe("Sub");
    expect(doc.title).toBe("Sheet 1");
  });

  it("carries notes, web hyperlinks, and labels→tags", () => {
    const main1 = fromXmind(makeXmind(sheets)).root.children[0];
    expect(main1.note).toBe("a note");
    expect(main1.hyperlink).toBe("https://example.com");
    expect(main1.tags).toEqual(["tag1", "tag2"]);
  });

  it("drops XMind-internal (xmind:) links", () => {
    const main2 = fromXmind(makeXmind(sheets)).root.children[1];
    expect(main2.hyperlink).toBeUndefined();
  });

  it("throws on a zip without content.json", () => {
    const bad = zipSync({ "manifest.json": strToU8("{}") });
    expect(() => fromXmind(bad)).toThrow(/content\.json/);
  });

  it("throws on non-zip bytes", () => {
    expect(() => fromXmind(new Uint8Array([1, 2, 3, 4]))).toThrow();
  });
});

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "My Map",
  root: {
    id: "r",
    topic: "Central",
    children: [
      {
        id: "a",
        topic: "Main 1",
        note: "a note",
        hyperlink: "https://example.com",
        tags: ["t1", "t2"],
        children: [{ id: "a1", topic: "Sub", children: [] }],
      },
      { id: "b", topic: "Main 2", children: [] },
    ],
  },
  links: [{ id: "l1", from: "a", to: "b", label: "rel" }],
  floatingTopics: [{ id: "f1", topic: "Legend", children: [] }],
};

const contentOf = (bytes: Uint8Array) => JSON.parse(strFromU8(unzipSync(bytes)["content.json"]))[0];

describe("XMind .xmind export", () => {
  it("writes a zip with content.json + metadata.json + manifest.json", () => {
    expect(Object.keys(unzipSync(toXmind(doc))).sort()).toEqual([
      "content.json",
      "manifest.json",
      "metadata.json",
    ]);
  });

  it("round-trips the tree, title, notes, web links, and tags", () => {
    const back = fromXmind(toXmind(doc));
    expect(back.title).toBe("My Map");
    expect(back.root.topic).toBe("Central");
    expect(back.root.children.map((c) => c.topic)).toEqual(["Main 1", "Main 2"]);
    expect(back.root.children[0].children[0].topic).toBe("Sub");
    const m1 = back.root.children[0];
    expect(m1.note).toBe("a note");
    expect(m1.hyperlink).toBe("https://example.com");
    expect(m1.tags).toEqual(["t1", "t2"]);
  });

  it("emits floating topics as detached and cross-links as relationships", () => {
    const sheet = contentOf(toXmind(doc));
    expect(sheet.rootTopic.children.detached.map((t: { title: string }) => t.title)).toEqual([
      "Legend",
    ]);
    expect(sheet.relationships).toEqual([{ id: "l1", end1Id: "a", end2Id: "b", title: "rel" }]);
  });

  it("drops a dangerous-scheme hyperlink on export", () => {
    const danger: MindMapDoc = {
      schemaVersion: 1,
      id: "x",
      title: "X",
      root: { id: "r", topic: "R", hyperlink: "javascript:alert(1)", children: [] },
    };
    expect(contentOf(toXmind(danger)).rootTopic.href).toBeUndefined();
  });
});
