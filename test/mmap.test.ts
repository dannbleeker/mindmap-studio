import { readFileSync } from "node:fs";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseMmap } from "../src/import/mmap";
import type { MapNode } from "../src/model/types";

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

  it("imports MindManager stock icons as node.icons", () => {
    const xml = `<?xml version="1.0"?>
<ap:Map xmlns:ap="http://schemas.mindjet.com/MindManager/Application/2003">
  <ap:OneTopic>
    <ap:Topic OId="1">
      <ap:Text PlainText="Root" />
      <ap:IconsGroup><ap:Icons>
        <ap:Icon xsi:type="ap:StockIcon" IconType="urn:mindjet:ThumbsUp" />
      </ap:Icons></ap:IconsGroup>
    </ap:Topic>
  </ap:OneTopic>
</ap:Map>`;
    const { doc } = parseMmap(zipSync({ "Document.xml": strToU8(xml) }));
    expect(doc.root.icons).toEqual(["ThumbsUp"]);
  });

  it("warns about topics left outside the central hierarchy", () => {
    const xml = `<?xml version="1.0"?>
<ap:Map xmlns:ap="http://schemas.mindjet.com/MindManager/Application/2003">
  <ap:OneTopic>
    <ap:Topic OId="1">
      <ap:Text PlainText="Root" />
      <ap:SubTopics>
        <ap:Topic OId="2"><ap:Text PlainText="Child" /></ap:Topic>
      </ap:SubTopics>
    </ap:Topic>
  </ap:OneTopic>
  <ap:FloatingTopics>
    <ap:Topic OId="3"><ap:Text PlainText="Floating" /></ap:Topic>
  </ap:FloatingTopics>
</ap:Map>`;
    const { doc, warnings } = parseMmap(zipSync({ "Document.xml": strToU8(xml) }));
    expect(doc.root.children).toHaveLength(1);
    expect(warnings.some((w) => /outside the central hierarchy/.test(w))).toBe(true);
  });
});

// Opt-in integration check against a REAL MindManager export. CI-safe: it skips
// when MMAP_FILE is unset, so the repo never depends on a personal file. Run it
// locally with:  $env:MMAP_FILE="C:\path\to\file.mmap"; pnpm test
const realFile = process.env.MMAP_FILE;
describe.skipIf(!realFile)("parseMmap — real .mmap (MMAP_FILE)", () => {
  it("imports the real map and reports what survives vs. is lost", () => {
    const bytes = new Uint8Array(readFileSync(realFile as string));
    const { doc, warnings } = parseMmap(bytes);

    let count = 0;
    let maxDepth = 0;
    let withIcons = 0;
    const iconTypes = new Set<string>();
    const walk = (node: MapNode, depth: number) => {
      count += 1;
      maxDepth = Math.max(maxDepth, depth);
      if (node.icons?.length) {
        withIcons += 1;
        for (const icon of node.icons) iconTypes.add(icon);
      }
      for (const child of node.children) walk(child, depth + 1);
    };
    walk(doc.root, 0);

    const branches = doc.root.children.map(
      (c) => `      - ${c.topic} (${c.children.length} children)`,
    );
    console.log(
      [
        "",
        `  root:       ${doc.root.topic}`,
        `  nodes:      ${count}`,
        `  max depth:  ${maxDepth}`,
        `  icons:      ${withIcons} node(s); types: ${[...iconTypes].join(", ") || "none"}`,
        `  warnings:   ${warnings.length}`,
        ...warnings.slice(0, 12).map((w) => `      ! ${w}`),
        "  top-level branches:",
        ...branches,
        "",
      ].join("\n"),
    );

    expect(doc.root.topic.length).toBeGreaterThan(0);
    expect(count).toBeGreaterThan(1);
  });
});
