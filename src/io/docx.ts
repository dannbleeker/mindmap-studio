// Word (.docx) export: the map as an indented outline document.
//
// A .docx is an Open Packaging Conventions ZIP of XML parts. We emit the
// minimal valid set — [Content_Types].xml, _rels/.rels, word/document.xml — and
// style every paragraph with DIRECT formatting (bold / size / indent) rather than
// named paragraph styles: a styles.xml-less document that relies on "latent"
// built-in styles renders inconsistently across Word / LibreOffice / Pages /
// Google Docs, whereas direct run properties render identically everywhere.
//
// Pure + deterministic (entry mtimes pinned), so it's unit-testable by unzipping
// and validating the XML. Only escaped topic/note text is interpolated.

import type { MapNode, MindMapDoc } from "../model/types";
import { escapeXml, zipOoxml } from "./ooxml";

const TWIPS_PER_LEVEL = 360; // 0.25" of left indent per outline level

interface RunOpts {
  bold?: boolean;
  italic?: boolean;
  /** Font size in half-points (Word's unit): 24 = 12pt. */
  sizeHalfPt?: number;
}

function run(text: string, opts: RunOpts = {}): string {
  const rPr = [
    opts.bold ? "<w:b/>" : "",
    opts.italic ? "<w:i/>" : "",
    opts.sizeHalfPt ? `<w:sz w:val="${opts.sizeHalfPt}"/>` : "",
  ].join("");
  // xml:space="preserve" keeps the bullet's trailing space and any indentation.
  return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function paragraph(runsXml: string, indentTwips = 0): string {
  const pPr = indentTwips ? `<w:pPr><w:ind w:left="${indentTwips}"/></w:pPr>` : "";
  return `<w:p>${pPr}${runsXml}</w:p>`;
}

// A note may be multi-line; each non-blank line becomes its own italic paragraph.
function noteParagraphs(note: string, indentTwips: number): string[] {
  return note
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => paragraph(run(line, { italic: true }), indentTwips));
}

function bodyXml(doc: MindMapDoc): string {
  const out: string[] = [];
  const title = doc.title || doc.root.topic || "Mind map";
  out.push(paragraph(run(title, { bold: true, sizeHalfPt: 36 }))); // 18pt title
  if (doc.root.note?.trim()) out.push(...noteParagraphs(doc.root.note, TWIPS_PER_LEVEL));

  const walk = (node: MapNode, depth: number) => {
    for (const child of node.children) {
      const isBranch = depth === 0; // a direct child of the root is a top-level branch
      const indent = (depth + 1) * TWIPS_PER_LEVEL;
      out.push(
        paragraph(
          run(`• ${child.topic}`, { bold: isBranch, sizeHalfPt: isBranch ? 28 : undefined }),
          indent,
        ),
      );
      if (child.note?.trim()) out.push(...noteParagraphs(child.note, indent + TWIPS_PER_LEVEL));
      walk(child, depth + 1);
    }
  };
  walk(doc.root, 0);
  return out.join("");
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

function documentXml(doc: MindMapDoc): string {
  // A4 page (11906×16838 twips) with 1" (1440 twip) margins.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml(doc)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
}

export function buildDocx(doc: MindMapDoc): Uint8Array {
  return zipOoxml({
    "[Content_Types].xml": CONTENT_TYPES,
    "_rels/.rels": RELS,
    "word/document.xml": documentXml(doc),
  });
}
