import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { fromXmind } from "../src/io/xmind";

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
