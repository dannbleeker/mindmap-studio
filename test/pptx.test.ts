import { XMLValidator } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildPptx } from "../src/io/pptx";
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

function open(d: MindMapDoc) {
  const files = unzipSync(buildPptx(d));
  return { files, names: Object.keys(files), text: (name: string) => strFromU8(files[name]) };
}

const SLIDE_RE = /^ppt\/slides\/slide\d+\.xml$/;

describe("buildPptx", () => {
  it("emits an overview slide plus one slide per top-level branch", () => {
    const slides = open(doc).names.filter((n) => SLIDE_RE.test(n));
    expect(slides).toHaveLength(3); // overview + Alpha + Beta
  });

  it("packages the required OPC parts, with a .rels for each slide", () => {
    const { names } = open(doc);
    for (const required of [
      "[Content_Types].xml",
      "_rels/.rels",
      "ppt/presentation.xml",
      "ppt/_rels/presentation.xml.rels",
      "ppt/theme/theme1.xml",
      "ppt/slideMasters/slideMaster1.xml",
      "ppt/slideMasters/_rels/slideMaster1.xml.rels",
      "ppt/slideLayouts/slideLayout1.xml",
      "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
      "ppt/slides/slide1.xml",
      "ppt/slides/_rels/slide1.xml.rels",
    ]) {
      expect(names).toContain(required);
    }
  });

  it("emits well-formed XML for every part", () => {
    const { files } = open(doc);
    for (const name of Object.keys(files)) {
      expect(XMLValidator.validate(strFromU8(files[name]))).toBe(true);
    }
  });

  it("declares a content-type override for every part PowerPoint needs", () => {
    const { names, text } = open(doc);
    const ct = text("[Content_Types].xml");
    expect(ct).toContain("/ppt/presentation.xml");
    expect(ct).toContain("/ppt/slideMasters/slideMaster1.xml");
    expect(ct).toContain("/ppt/slideLayouts/slideLayout1.xml");
    expect(ct).toContain("/ppt/theme/theme1.xml");
    for (const slide of names.filter((n) => SLIDE_RE.test(n))) {
      expect(ct).toContain(`/${slide}`);
    }
  });

  it("resolves every r:id in presentation.xml against its .rels (no dangling refs)", () => {
    const { text } = open(doc);
    const referenced = [...text("ppt/presentation.xml").matchAll(/r:id="(rId\d+)"/g)].map(
      (m) => m[1],
    );
    const defined = new Set(
      [...text("ppt/_rels/presentation.xml.rels").matchAll(/Id="(rId\d+)"/g)].map((m) => m[1]),
    );
    expect(referenced.length).toBeGreaterThan(0);
    for (const id of referenced) expect(defined.has(id)).toBe(true);
  });

  it("wires each slide's .rels to the shared layout, and the master to layout + theme", () => {
    const { text } = open(doc);
    expect(text("ppt/slides/_rels/slide1.xml.rels")).toContain("slideLayouts/slideLayout1.xml");
    const masterRels = text("ppt/slideMasters/_rels/slideMaster1.xml.rels");
    expect(masterRels).toContain("slideLayouts/slideLayout1.xml");
    expect(masterRels).toContain("theme/theme1.xml");
  });

  it("lists the branches on the overview and the subtree on a branch slide", () => {
    const { text } = open(doc);
    expect(text("ppt/slides/slide1.xml")).toContain("Alpha");
    expect(text("ppt/slides/slide1.xml")).toContain("Beta");
    expect(text("ppt/slides/slide2.xml")).toContain("Alpha One");
  });

  it("escapes XML metacharacters in topics", () => {
    const evil: MindMapDoc = {
      schemaVersion: 1,
      id: "e",
      title: "T",
      root: { id: "r", topic: "T", children: [{ id: "x", topic: "A & B <c>", children: [] }] },
    };
    const xml = strFromU8(unzipSync(buildPptx(evil))["ppt/slides/slide1.xml"]);
    expect(xml).toContain("A &amp; B &lt;c&gt;");
    expect(xml).not.toContain("<c>");
  });

  it("is deterministic — the same map produces identical bytes", () => {
    expect(Buffer.from(buildPptx(doc)).equals(Buffer.from(buildPptx(doc)))).toBe(true);
  });
});
