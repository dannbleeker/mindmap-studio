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

  it("throws when a <Map> has no root <Topic>", () => {
    expect(() => parseMmap(mmapOf(`${MAP_OPEN}\n  <ap:OneTopic />\n</ap:Map>`))).toThrow(
      /no root <Topic>/,
    );
  });

  it("warns about task info but still imports the topic", () => {
    const { doc, warnings } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text PlainText="Scheduled work" />
    <ap:Task ap:Priority="1" />
  </ap:Topic></ap:OneTopic>
</ap:Map>`),
    );
    expect(doc.root.topic).toBe("Scheduled work");
    expect(warnings.some((w) => /task info/i.test(w))).toBe(true);
  });

  it("generates an id for a topic that has no OId", () => {
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic><ap:Text PlainText="No id here" /></ap:Topic></ap:OneTopic>
</ap:Map>`),
    );
    expect(doc.root.topic).toBe("No id here");
    expect(doc.root.id).toBeTruthy(); // a generated id, not undefined
  });

  it("reads a root <Topic> placed directly under <Map> (no <OneTopic>)", () => {
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:Topic OId="1"><ap:Text PlainText="Direct root" /></ap:Topic>
</ap:Map>`),
    );
    expect(doc.root.topic).toBe("Direct root");
  });

  it("falls back to the @Text attribute for topic text", () => {
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text Text="Via Text attr" /></ap:Topic></ap:OneTopic>
</ap:Map>`),
    );
    expect(doc.root.topic).toBe("Via Text attr");
  });

  it("tolerates a legacy <Notes><CDATA> note shape", () => {
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text PlainText="Root" />
    <ap:Notes><ap:CDATA Text="Legacy note text" /></ap:Notes>
  </ap:Topic></ap:OneTopic>
</ap:Map>`),
    );
    expect(doc.root.note).toBe("Legacy note text");
  });

  it("ignores an icon that has no IconType", () => {
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text PlainText="Root" />
    <ap:IconsGroup><ap:Icons><ap:Icon /></ap:Icons></ap:IconsGroup>
  </ap:Topic></ap:OneTopic>
</ap:Map>`),
    );
    expect(doc.root.icons).toBeUndefined(); // the empty icon is filtered out
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
    expect(doc.root.icons).toEqual(["👍"]); // urn:mindjet:ThumbsUp -> emoji
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

  it("drops a dangerous-scheme hyperlink on import (XSS guard)", () => {
    // A malicious .mmap could smuggle a javascript:/data: hyperlink; the
    // importer must not store it (defense-in-depth alongside the export sanitiser).
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text PlainText="Root" />
    <ap:Hyperlink Url="javascript:alert(1)" Name="x" />
  </ap:Topic></ap:OneTopic>
</ap:Map>`),
    );
    expect(doc.root.hyperlink).toBeUndefined();
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

  it("imports map-level floating topics and warns they aren't drawn", () => {
    const { doc, warnings } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text PlainText="Root" /></ap:Topic></ap:OneTopic>
  <ap:FloatingTopics><ap:Topic OId="9"><ap:Text PlainText="Legend" /></ap:Topic></ap:FloatingTopics>
</ap:Map>`),
    );
    expect(doc.floatingTopics?.map((t) => t.topic)).toEqual(["Legend"]);
    expect(warnings.some((w) => /floating topic\(s\) imported/.test(w))).toBe(true);
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

  it("throws when Document.xml parses but has no <Map> root element", () => {
    const noMap = `<?xml version="1.0"?><ap:Document xmlns:ap="http://schemas.mindjet.com/MindManager/Application/2003" />`;
    expect(() => parseMmap(mmapOf(noMap))).toThrow(/no <Map> root/);
  });

  it("imports a relationship's label when present", () => {
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1"><ap:Text PlainText="Root" />
    <ap:SubTopics>
      <ap:Topic OId="2"><ap:Text PlainText="A" /></ap:Topic>
      <ap:Topic OId="3"><ap:Text PlainText="B" /></ap:Topic>
    </ap:SubTopics>
  </ap:Topic></ap:OneTopic>
  <ap:Relationships><ap:Relationship>
    <ap:Text PlainText="depends on" />
    <ap:ConnectionGroup><ap:Connection><ap:ObjectReference OIdRef="2" /></ap:Connection></ap:ConnectionGroup>
    <ap:ConnectionGroup><ap:Connection><ap:ObjectReference OIdRef="3" /></ap:Connection></ap:ConnectionGroup>
  </ap:Relationship></ap:Relationships>
</ap:Map>`),
    );
    expect(doc.links).toEqual([{ id: "r1", from: "2", to: "3", label: "depends on" }]);
  });

  it("defaults the map title when the root topic has no text", () => {
    const { doc } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic><ap:Topic OId="1" /></ap:OneTopic>
</ap:Map>`),
    );
    expect(doc.title).toBe("Imported map");
    expect(doc.root.topic).toBe("");
  });

  // One realistic map exercising every feature at once — the rich features are
  // each covered in isolation above, but Dann's real sample used none of them, so
  // this guards that they all decode correctly together.
  it("imports a map using every feature together", () => {
    const { doc, warnings } = parseMmap(
      mmapOf(`${MAP_OPEN}
  <ap:OneTopic>
    <ap:Topic OId="1">
      <ap:Text PlainText="Company Plan" />
      <ap:NotesGroup><ap:NotesXhtmlData PreviewPlainText="Top-level note" /></ap:NotesGroup>
      <ap:IconsGroup><ap:Icons><ap:Icon xsi:type="ap:StockIcon" IconType="urn:mindjet:Flag" /></ap:Icons></ap:IconsGroup>
      <ap:SubTopics>
        <ap:Topic OId="2">
          <ap:Text PlainText="Strategy" />
          <ap:Hyperlink Url="https://plan.example/" Name="Plan" />
          <ap:OneBoundary><ap:Boundary /></ap:OneBoundary>
          <ap:SubTopics>
            <ap:Topic OId="3"><ap:Text PlainText="Grow EU" />
              <ap:NotesGroup><ap:NotesXhtmlData PreviewPlainText="Expand into EU" /></ap:NotesGroup>
            </ap:Topic>
            <ap:Topic OId="4"><ap:Text PlainText="Cut costs" />
              <ap:IconsGroup><ap:Icons><ap:Icon xsi:type="ap:StockIcon" IconType="urn:mindjet:Priority1" /></ap:Icons></ap:IconsGroup>
            </ap:Topic>
          </ap:SubTopics>
        </ap:Topic>
        <ap:Topic OId="5"><ap:Text PlainText="Ops" /></ap:Topic>
      </ap:SubTopics>
    </ap:Topic>
  </ap:OneTopic>
  <ap:Relationships><ap:Relationship>
    <ap:ConnectionGroup><ap:Connection><ap:ObjectReference OIdRef="3" /></ap:Connection></ap:ConnectionGroup>
    <ap:ConnectionGroup><ap:Connection><ap:ObjectReference OIdRef="5" /></ap:Connection></ap:ConnectionGroup>
  </ap:Relationship></ap:Relationships>
  <ap:FloatingTopics><ap:Topic OId="9"><ap:Text PlainText="Legend" /></ap:Topic></ap:FloatingTopics>
</ap:Map>`),
    );

    // tree + text
    expect(doc.title).toBe("Company Plan");
    expect(doc.root.children.map((c) => c.topic)).toEqual(["Strategy", "Ops"]);
    const strategy = doc.root.children[0];
    expect(strategy.children.map((c) => c.topic)).toEqual(["Grow EU", "Cut costs"]);
    // notes + icons + hyperlink, on the nodes that carry them
    expect(doc.root.note).toBe("Top-level note");
    expect(doc.root.icons).toEqual(["🚩"]); // Flag -> emoji
    expect(strategy.hyperlink).toBe("https://plan.example/");
    expect(strategy.children[0].note).toBe("Expand into EU");
    expect(strategy.children[1].icons).toEqual(["1️⃣"]); // Priority1 -> emoji
    // boundary over Strategy's subtree, relationship as a cross-link, floating topic
    expect(doc.boundaries).toEqual([{ id: "b1", nodeIds: ["2", "3", "4"] }]);
    expect(doc.links).toEqual([{ id: "r1", from: "3", to: "5" }]);
    expect(doc.floatingTopics?.map((t) => t.topic)).toEqual(["Legend"]);
    // floating-topics note surfaced; nothing left behind
    expect(warnings.some((w) => /floating topic/.test(w))).toBe(true);
    expect(warnings.some((w) => /outside the central hierarchy/.test(w))).toBe(false);
    expect(doc.meta?.source).toBe("mmap");
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
