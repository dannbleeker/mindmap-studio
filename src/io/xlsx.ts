// Excel (.xlsx) export: the map as an indented outline worksheet — each node on its
// own row, its topic placed in the column matching its depth (so the tree reads as an
// indented outline across columns), with a trailing Notes column.
//
// A .xlsx is an Open Packaging Conventions ZIP of SpreadsheetML parts. We emit the
// minimal valid set — [Content_Types].xml, _rels/.rels, xl/workbook.xml (+ rels),
// xl/worksheets/sheet1.xml, xl/styles.xml — using inline strings (no sharedStrings
// part) to keep it compact. Pure + deterministic (entry mtimes pinned); only escaped
// topic/note text is interpolated.

import { strToU8, zipSync } from "fflate";
import type { MapNode, MindMapDoc } from "../model/types";

const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_PKG = "http://schemas.openxmlformats.org/package/2006/relationships";
const NS_CT = "http://schemas.openxmlformats.org/package/2006/content-types";
const REL_OFFICEDOC = `${NS_R}/officeDocument`;
const REL_WORKSHEET = `${NS_R}/worksheet`;
const REL_STYLES = `${NS_R}/styles`;
const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

// XML element-content escape (text lands inside <t>…</t>).
function esc(text: string): string {
  return text.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

// 1 -> "A", 26 -> "Z", 27 -> "AA"
function colLetter(col: number): string {
  let s = "";
  let n = col;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

interface OutlineRow {
  topic: string;
  depth: number;
  note?: string;
}

function flatten(doc: MindMapDoc): { rows: OutlineRow[]; maxDepth: number } {
  const rows: OutlineRow[] = [];
  let maxDepth = 0;
  const walk = (node: MapNode, depth: number) => {
    if (depth > maxDepth) maxDepth = depth;
    rows.push({
      topic: node.topic,
      depth,
      note: node.note?.trim().replace(/\s+/g, " ") || undefined,
    });
    for (const child of node.children) walk(child, depth + 1);
  };
  walk(doc.root, 0);
  return { rows, maxDepth };
}

function cell(ref: string, text: string, bold = false): string {
  return `<c r="${ref}"${bold ? ' s="1"' : ""} t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
}

function sheetXml(doc: MindMapDoc): string {
  const { rows, maxDepth } = flatten(doc);
  const notesCol = maxDepth + 2; // level columns are 1..maxDepth+1; Notes sits after them
  const out: string[] = [];

  const header: string[] = [];
  for (let d = 0; d <= maxDepth; d++)
    header.push(cell(`${colLetter(d + 1)}1`, `Level ${d + 1}`, true));
  header.push(cell(`${colLetter(notesCol)}1`, "Notes", true));
  out.push(`<row r="1">${header.join("")}</row>`);

  rows.forEach((row, i) => {
    const r = i + 2; // row 1 is the header
    const cells = [cell(`${colLetter(row.depth + 1)}${r}`, row.topic)];
    if (row.note) cells.push(cell(`${colLetter(notesCol)}${r}`, row.note));
    out.push(`<row r="${r}">${cells.join("")}</row>`);
  });

  return `${XML_DECL}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_R}"><sheetData>${out.join("")}</sheetData></worksheet>`;
}

const CONTENT_TYPES = `${XML_DECL}<Types xmlns="${NS_CT}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

const ROOT_RELS = `${XML_DECL}<Relationships xmlns="${NS_PKG}"><Relationship Id="rId1" Type="${REL_OFFICEDOC}" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK = `${XML_DECL}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_R}"><sheets><sheet name="Map" sheetId="1" r:id="rId1"/></sheets></workbook>`;

const WORKBOOK_RELS = `${XML_DECL}<Relationships xmlns="${NS_PKG}"><Relationship Id="rId1" Type="${REL_WORKSHEET}" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL_STYLES}" Target="styles.xml"/></Relationships>`;

// Minimal styles: index 0 = default, index 1 = bold (for the header row). Excel expects
// the two canonical fills (none + gray125) and a default font/border/cellStyleXf present.
const STYLES = `${XML_DECL}<styleSheet xmlns="${NS_MAIN}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

// ZIP's DOS timestamp can't predate 1980; pin every entry so the same map always
// produces stable output instead of carrying wall-clock time.
const FIXED_MTIME = Date.parse("1980-01-01T00:00:00Z");
const u8 = (s: string): [Uint8Array, { mtime: number }] => [strToU8(s), { mtime: FIXED_MTIME }];

export function buildXlsx(doc: MindMapDoc): Uint8Array {
  return zipSync(
    {
      "[Content_Types].xml": u8(CONTENT_TYPES),
      "_rels/.rels": u8(ROOT_RELS),
      "xl/workbook.xml": u8(WORKBOOK),
      "xl/_rels/workbook.xml.rels": u8(WORKBOOK_RELS),
      "xl/worksheets/sheet1.xml": u8(sheetXml(doc)),
      "xl/styles.xml": u8(STYLES),
    },
    { level: 6 },
  );
}
