import { readFileSync } from "node:fs";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseMmap } from "../src/import/mmap";
import type { MapNode } from "../src/model/types";

// Synthetic Document.xml shaped like a real MindManager export (namespace
// http://schemas.mindjet.com/MindManager/Application/2003). Field shapes match
// the bundled XSD: text in <ap:Text PlainText>, notes in
// <ap:NotesGroup><ap:NotesXhtmlData PreviewPlainText>, etc.
const DOCUMENT_XML = `<?xml version="1.0" encoding="utf-8"?>
<ap:Map xmlns:ap="http://schemas.mindjet.com/MindManager/Application/2003">
  <ap:OneTopic>
    <ap:Topic OId="1">
      <ap:Text PlainText="Q3 Retail Plan" />
      <ap:NotesGroup><ap:NotesXhtmlData PreviewPlainText="Autumn season plan" /></ap:NotesGroup>
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

const MAP_OPEN = `<?xml version="1.0"?>
<ap:Map xmlns:ap="http://schemas.mindjet.com/MindManager/Application/2003">`;

function mmapOf(xml: string): Uint8Array {
  return zipSync({ "Document.xml": strToU8(xml) });
}

describe("parseMmap", () => {
  it("extracts the topic tree from a synthetic .mmap", () => {
    const { doc } = parseMmap(mmapOf(DOCUMENT_XML));
    expect(doc.title).toBe("Q3 Retail Plan");
    expect(doc.root.topic).toBe("Q3 Retail Plan");
    expect(doc.root.children.map((c) => c.topic)).toEqual(["Merchandising", "E-commerce"]);
    expect(doc.root.children[0].children.map((c) => c.topic)).toEqual([
      "Autumn drop",
      "Markdown cadence",
    ]);
  });

  it("captures notes (NotesXhtmlData PreviewPlainText)", () => {
    const { doc } = parseMmap(mmapOf(DOCUMENT_XML));
    expect(doc.root.note).toBe("Autumn season plan");
  });

  it("throws a helpful error when the zip is not a MindManager map", () => {
    const notAMap = zipSync({ "readme.txt": strToU8("hello") });
    expect(() => parseMmap(notAMap)).toThrow(/Document\.xml not found/);
  });

  it("imports MindManager stock icons as node.icons", () => {
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text PlainText="Root" />
    <ap:IconsGroup><ap:Icons>
      <ap:Icon xsi:type="ap:StockIcon" IconType="urn:mindjet:ThumbsUp" />
    </ap:Icons></ap:IconsGroup>
  </ap:Topic></ap:OneTopic>
</ap:Map>`),
    );
    expect(doc.root.icons).toEqual(["ThumbsUp"]);
  });

  it("imports topic hyperlinks", () => {
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text PlainText="Root" />
    <ap:Hyperlink Url="https://example.com/" Name="Example" />
  </ap:Topic></ap:OneTopic>
</ap:Map>`),
    );
    expect(doc.root.hyperlink).toBe("https://example.com/");
  });

  it("imports relationships as cross-links", () => {
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text PlainText="Root" />
    <ap:SubTopics>
      <ap:Topic OId="2"><ap:Text PlainText="A" /></ap:Topic>
      <ap:Topic OId="3"><ap:Text PlainText="B" /></ap:Topic>
    </ap:SubTopics>
  </ap:Topic></ap:OneTopic>
  <ap:Relationships><ap:Relationship>
    <ap:ConnectionGroup><ap:Connection><ap:ObjectReference OIdRef="2" /></ap:Connection></ap:ConnectionGroup>
    <ap:ConnectionGroup><ap:Connection><ap:ObjectReference OIdRef="3" /></ap:Connection></ap:ConnectionGroup>
  </ap:Relationship></ap:Relationships>
</ap:Map>`),
    );
    expect(doc.links).toEqual([{ id: "r1", from: "2", to: "3" }]);
  });

  it("imports a topic boundary over its subtree", () => {
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text PlainText="Root" />
    <ap:SubTopics>
      <ap:Topic OId="2"><ap:Text PlainText="Grouped" />
        <ap:OneBoundary><ap:Boundary /></ap:OneBoundary>
        <ap:SubTopics><ap:Topic OId="3"><ap:Text PlainText="Leaf" /></ap:Topic></ap:SubTopics>
      </ap:Topic>
    </ap:SubTopics>
  </ap:Topic></ap:OneTopic>
</ap:Map>`),
    );
    expect(doc.boundaries).toHaveLength(1);
    expect(doc.boundaries?.[0].nodeIds).toEqual(["2", "3"]);
  });

  it("imports map-level floating topics", () => {
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text PlainText="Root" /></ap:Topic></ap:OneTopic>
  <ap:FloatingTopics><ap:Topic OId="9"><ap:Text PlainText="Legend" /></ap:Topic></ap:FloatingTopics>
</ap:Map>`),
    );
    expect(doc.floatingTopics?.map((t) => t.topic)).toEqual(["Legend"]);
  });

  it("warns about topics it cannot reach", () => {
    // A topic buried in a relationship's own FloatingTopics — counted in the
    // source but not part of the importable hierarchy.
    const { warnings } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text PlainText="Root" /></ap:Topic></ap:OneTopic>
  <ap:Relationships><ap:Relationship>
    <ap:FloatingTopics><ap:Topic OId="9"><ap:Text PlainText="Orphan" /></ap:Topic></ap:FloatingTopics>
  </ap:Relationship></ap:Relationships>
</ap:Map>`),
    );
    expect(warnings.some((w) => /outside the central hierarchy/.test(w))).toBe(true);
  });
});

function countWith(node: MapNode, pred: (n: MapNode) => boolean): number {
  let n = pred(node) ? 1 : 0;
  for (const child of node.children) n += countWith(child, pred);
  return n;
}

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
    const iconTypes = new Set<string>();
    const walk = (node: MapNode, depth: number) => {
      count += 1;
      maxDepth = Math.max(maxDepth, depth);
      for (const icon of node.icons ?? []) iconTypes.add(icon);
      for (const child of node.children) walk(child, depth + 1);
    };
    walk(doc.root, 0);

    const branches = doc.root.children.map(
      (c) => `      - ${c.topic} (${c.children.length} children)`,
    );
    console.log(
      [
        "",
        `  root:        ${doc.root.topic}`,
        `  nodes:       ${count}    max depth: ${maxDepth}`,
        `  notes:       ${countWith(doc.root, (n) => !!n.note)}`,
        `  hyperlinks:  ${countWith(doc.root, (n) => !!n.hyperlink)}`,
        `  icons:       ${countWith(doc.root, (n) => !!n.icons?.length)} node(s); types: ${[...iconTypes].join(", ") || "none"}`,
        `  links:       ${doc.links?.length ?? 0}`,
        `  boundaries:  ${doc.boundaries?.length ?? 0}`,
        `  floating:    ${doc.floatingTopics?.length ?? 0}`,
        `  warnings:    ${warnings.length}`,
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
