import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseMmap } from "../src/import/mmap";

// Synthetic Document.xml modelled on MindManager's documented schema
// (namespace http://schemas.mindjet.com/MindManager/Application/2003).
//
// NOTE: this is a stand-in fixture. Real exports carry far more attributes and
// may differ in element names; the goal here is to lock the parser's tree-walk
// behaviour now, then run it against a real .mmap to tune the field mapping.
const DOCUMENT_XML = `<?xml version="1.0" encoding="utf-8"?>
<ap:Map xmlns:ap="http://schemas.mindjet.com/MindManager/Application/2003">
  <ap:OneTopic>
    <ap:Topic OId="1">
      <ap:Text PlainText="Q3 Retail Plan" />
      <ap:Notes><ap:CDATA Text="Autumn season plan" /></ap:Notes>
      <ap:SubTopics>
        <ap:Topic OId="2">
          <ap:Text PlainText="Merchandising" />
          <ap:SubTopics>
            <ap:Topic OId="3"><ap:Text PlainText="Autumn drop" /></ap:Topic>
            <ap:Topic OId="4"><ap:Text PlainText="Markdown cadence" /></ap:Topic>
          </ap:SubTopics>
        </ap:Topic>
        <ap:Topic OId="5">
          <ap:Text PlainText="E-commerce" />
        </ap:Topic>
      </ap:SubTopics>
    </ap:Topic>
  </ap:OneTopic>
</ap:Map>`;

// A .mmap is a ZIP; the map lives in Document.xml at the archive root.
function syntheticMmap(): Uint8Array {
  return zipSync({ "Document.xml": strToU8(DOCUMENT_XML) });
}

describe("parseMmap", () => {
  it("extracts the topic tree from a synthetic .mmap", () => {
    const { doc } = parseMmap(syntheticMmap());
    expect(doc.title).toBe("Q3 Retail Plan");
    expect(doc.root.topic).toBe("Q3 Retail Plan");
    expect(doc.root.children.map((c) => c.topic)).toEqual(["Merchandising", "E-commerce"]);
    expect(doc.root.children[0].children.map((c) => c.topic)).toEqual([
      "Autumn drop",
      "Markdown cadence",
    ]);
  });

  it("captures top-level notes", () => {
    const { doc } = parseMmap(syntheticMmap());
    expect(doc.root.note).toBe("Autumn season plan");
  });

  it("throws a helpful error when the zip is not a MindManager map", () => {
    const notAMap = zipSync({ "readme.txt": strToU8("hello") });
    expect(() => parseMmap(notAMap)).toThrow(/Document\.xml not found/);
  });
});
