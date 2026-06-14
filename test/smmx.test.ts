import { strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { fromSmmx, toSmmx } from "../src/io/smmx";
import type { MapNode, MindMapDoc } from "../src/model/types";

const makeSmmx = (xml: string) => zipSync({ "document/mindmap.xml": strToU8(xml) });

const fixture = `<?xml version="1.0" encoding="UTF-8"?>
<simplemind-mindmaps>
<mindmap>
<meta><title text="My SimpleMind Map"/></meta>
<topics>
<topic id="0" parent="-1" text="Central"/>
<topic id="1" parent="0" text="Child A"><note>a note</note><link urllink="https://x.test/"/></topic>
<topic id="2" parent="0" text="Child B"/>
<topic id="3" parent="1" text="Grandchild"/>
<topic id="4" parent="0" text="Bad"><link urllink="javascript:alert(1)"/></topic>
</topics>
<relations><relation source="1" target="2" label="rel"/></relations>
</mindmap>
</simplemind-mindmaps>`;

describe("SimpleMind .smmx import", () => {
  it("builds the tree from the flat parent references", () => {
    const doc = fromSmmx(makeSmmx(fixture));
    expect(doc.title).toBe("My SimpleMind Map");
    expect(doc.root.topic).toBe("Central");
    expect(doc.root.children.map((c) => c.topic)).toEqual(["Child A", "Child B", "Bad"]);
    expect(doc.root.children[0].children.map((c) => c.topic)).toEqual(["Grandchild"]);
  });

  it("carries notes, web links, and relations→cross-links; drops dangerous links", () => {
    const doc = fromSmmx(makeSmmx(fixture));
    const a = doc.root.children[0];
    expect(a.note).toBe("a note");
    expect(a.hyperlink).toBe("https://x.test/");
    expect(doc.root.children[2].hyperlink).toBeUndefined(); // javascript: dropped
    expect(doc.links).toEqual([{ id: "sm-rel-0", from: "sm-1", to: "sm-2", label: "rel" }]);
  });

  it("throws on a zip without document/mindmap.xml", () => {
    expect(() => fromSmmx(zipSync({ "x.txt": strToU8("hi") }))).toThrow(/mindmap\.xml/);
  });
});

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "Plan",
  root: {
    id: "r",
    topic: "Central",
    children: [
      {
        id: "a",
        topic: "A",
        note: "n",
        hyperlink: "https://ok.test/",
        children: [{ id: "a1", topic: "Sub", children: [] }],
      },
      { id: "b", topic: "B", children: [] },
    ],
  },
  links: [{ id: "l1", from: "a", to: "b", label: "depends" }],
  floatingTopics: [{ id: "f1", topic: "Legend", children: [] }],
};

describe("SimpleMind .smmx export", () => {
  it("writes a zip containing document/mindmap.xml", () => {
    expect(Object.keys(unzipSync(toSmmx(doc)))).toEqual(["document/mindmap.xml"]);
  });

  it("round-trips the tree, title, notes, and web links", () => {
    const back = fromSmmx(toSmmx(doc));
    expect(back.title).toBe("Plan");
    expect(back.root.topic).toBe("Central");
    expect(back.root.children.map((c) => c.topic)).toEqual(["A", "B"]);
    expect(back.root.children[0].children[0].topic).toBe("Sub");
    expect(back.root.children[0].note).toBe("n");
    expect(back.root.children[0].hyperlink).toBe("https://ok.test/");
  });

  it("round-trips a relation between the right topics", () => {
    const back = fromSmmx(toSmmx(doc));
    const find = (n: MapNode, t: string): string | undefined => {
      if (n.topic === t) return n.id;
      for (const c of n.children) {
        const hit = find(c, t);
        if (hit) return hit;
      }
      return undefined;
    };
    const idByTopic = (t: string): string | undefined =>
      find(back.root, t) ?? back.floatingTopics?.map((f) => find(f, t)).find(Boolean);
    expect(back.links?.length).toBe(1);
    expect(back.links?.[0].label).toBe("depends");
    expect(back.links?.[0].from).toBe(idByTopic("A"));
    expect(back.links?.[0].to).toBe(idByTopic("B"));
  });

  it("round-trips a floating topic as a separate root", () => {
    expect(fromSmmx(toSmmx(doc)).floatingTopics?.map((f) => f.topic)).toEqual(["Legend"]);
  });
});
