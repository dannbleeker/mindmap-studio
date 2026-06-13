// PowerPoint (.pptx) export: the Walk-Through as a real slide deck — an overview
// slide, then one slide per top-level branch with its subtree as bullets.
//
// A .pptx is an Open Packaging Conventions ZIP of PresentationML/DrawingML parts.
// PowerPoint requires a complete, cross-referenced package — a presentation, a
// slide master, at least one slide layout, a theme, and one part per slide, each
// wired through its own .rels — so this emits that full minimal set. Slides use
// plain positioned text boxes (not placeholders), so they're self-describing and
// don't depend on the master/layout for content.
//
// Pure + deterministic (entry mtimes pinned); only escaped topic text is
// interpolated. Reuses the same slide model the in-app presentation renders.

import { strToU8, zipSync } from "fflate";
import type { MapNode, MindMapDoc } from "../model/types";
import { presentationSlides } from "../present/slides";

// XML element-content escape (text lands inside <a:t>…</a:t>).
function esc(text: string): string {
  return text.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG = "http://schemas.openxmlformats.org/package/2006/relationships";

const REL_OFFICEDOC = `${R}/officeDocument`;
const REL_MASTER = `${R}/slideMaster`;
const REL_LAYOUT = `${R}/slideLayout`;
const REL_SLIDE = `${R}/slide`;
const REL_THEME = `${R}/theme`;

const CT_PRESENTATION =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml";
const CT_MASTER = "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml";
const CT_LAYOUT = "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml";
const CT_SLIDE = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml";
const CT_THEME = "application/vnd.openxmlformats-officedocument.theme+xml";

// Geometry in EMU (914400 per inch). 16:9 slide.
const SLIDE_W = 12192000;
const SLIDE_H = 6858000;
const MARGIN = 685800;
const CONTENT_W = SLIDE_W - 2 * MARGIN;
const TITLE_Y = 381000;
const TITLE_H = 1143000;
const BODY_Y = 1600200;
const BODY_H = SLIDE_H - BODY_Y - 381000;
const MAX_LVL = 8; // PresentationML caps outline levels at 0..8

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

interface BodyLine {
  text: string;
  level: number;
}

function collectBody(slide: { isOverview: boolean; node: MapNode }, doc: MindMapDoc): BodyLine[] {
  const out: BodyLine[] = [];
  if (slide.isOverview) {
    for (const child of doc.root.children) out.push({ text: child.topic, level: 0 });
    return out;
  }
  const walk = (nodes: MapNode[], level: number) => {
    for (const node of nodes) {
      out.push({ text: node.topic, level: Math.min(level, MAX_LVL) });
      walk(node.children, level + 1);
    }
  };
  walk(slide.node.children, 0);
  return out;
}

function titlePara(title: string): string {
  return `<a:p><a:r><a:rPr lang="en-US" sz="4000" b="1"><a:solidFill><a:srgbClr val="1F1B4D"/></a:solidFill></a:rPr><a:t>${esc(title)}</a:t></a:r></a:p>`;
}

function bodyPara(line: BodyLine): string {
  const sz = Math.max(1400, 2000 - line.level * 200);
  const marL = 285750 * (line.level + 1);
  return `<a:p><a:pPr lvl="${line.level}" marL="${marL}" indent="-285750"><a:buFont typeface="Arial"/><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="en-US" sz="${sz}"><a:solidFill><a:srgbClr val="333333"/></a:solidFill></a:rPr><a:t>${esc(line.text)}</a:t></a:r></a:p>`;
}

function textBox(
  id: number,
  name: string,
  x: number,
  y: number,
  cx: number,
  cy: number,
  paras: string,
  autofit = false,
): string {
  const bodyPr = autofit ? "<a:bodyPr><a:normAutofit/></a:bodyPr>" : "<a:bodyPr/>";
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody>${bodyPr}<a:lstStyle/>${paras}</p:txBody></p:sp>`;
}

function slideXml(title: string, body: BodyLine[]): string {
  const titleSp = textBox(2, "Title", MARGIN, TITLE_Y, CONTENT_W, TITLE_H, titlePara(title));
  const bodySp = body.length
    ? textBox(3, "Content", MARGIN, BODY_Y, CONTENT_W, BODY_H, body.map(bodyPara).join(""), true)
    : "";
  return `${XML_DECL}<p:sld xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${titleSp}${bodySp}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

const THEME = `${XML_DECL}<a:theme xmlns:a="${A}" name="Office Theme"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

const EMPTY_SPTREE = `<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>`;

const MASTER = `${XML_DECL}<p:sldMaster xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>${EMPTY_SPTREE}</p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`;

const LAYOUT = `${XML_DECL}<p:sldLayout xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}" type="blank" preserve="1"><p:cSld name="Blank">${EMPTY_SPTREE}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

const ROOT_RELS = `${XML_DECL}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL_OFFICEDOC}" Target="ppt/presentation.xml"/></Relationships>`;

const MASTER_RELS = `${XML_DECL}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL_LAYOUT}" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="${REL_THEME}" Target="../theme/theme1.xml"/></Relationships>`;

const LAYOUT_RELS = `${XML_DECL}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL_MASTER}" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;

const SLIDE_RELS = `${XML_DECL}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL_LAYOUT}" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;

function contentTypesXml(slideCount: number): string {
  const slides = Array.from(
    { length: slideCount },
    (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="${CT_SLIDE}"/>`,
  ).join("");
  return `${XML_DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="${CT_PRESENTATION}"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${CT_MASTER}"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${CT_LAYOUT}"/><Override PartName="/ppt/theme/theme1.xml" ContentType="${CT_THEME}"/>${slides}</Types>`;
}

function presentationXml(slideCount: number): string {
  const sldIds = Array.from(
    { length: slideCount },
    (_, i) => `<p:sldId id="${256 + i}" r:id="rId${2 + i}"/>`,
  ).join("");
  return `${XML_DECL}<p:presentation xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${sldIds}</p:sldIdLst><p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;
}

function presentationRelsXml(slideCount: number): string {
  const slides = Array.from(
    { length: slideCount },
    (_, i) =>
      `<Relationship Id="rId${2 + i}" Type="${REL_SLIDE}" Target="slides/slide${i + 1}.xml"/>`,
  ).join("");
  return `${XML_DECL}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL_MASTER}" Target="slideMasters/slideMaster1.xml"/>${slides}</Relationships>`;
}

// ZIP's DOS timestamp can't predate 1980; pin every entry so the same map always
// produces stable output instead of carrying wall-clock time.
const FIXED_MTIME = Date.parse("1980-01-01T00:00:00Z");
const u8 = (s: string) => [strToU8(s), { mtime: FIXED_MTIME }] as const;

export function buildPptx(doc: MindMapDoc): Uint8Array {
  const slides = presentationSlides(doc);
  const files: Record<string, readonly [Uint8Array, { mtime: number }]> = {
    "[Content_Types].xml": u8(contentTypesXml(slides.length)),
    "_rels/.rels": u8(ROOT_RELS),
    "ppt/presentation.xml": u8(presentationXml(slides.length)),
    "ppt/_rels/presentation.xml.rels": u8(presentationRelsXml(slides.length)),
    "ppt/theme/theme1.xml": u8(THEME),
    "ppt/slideMasters/slideMaster1.xml": u8(MASTER),
    "ppt/slideMasters/_rels/slideMaster1.xml.rels": u8(MASTER_RELS),
    "ppt/slideLayouts/slideLayout1.xml": u8(LAYOUT),
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels": u8(LAYOUT_RELS),
  };
  slides.forEach((slide, i) => {
    files[`ppt/slides/slide${i + 1}.xml`] = u8(slideXml(slide.heading, collectBody(slide, doc)));
    files[`ppt/slides/_rels/slide${i + 1}.xml.rels`] = u8(SLIDE_RELS);
  });
  return zipSync(files as Parameters<typeof zipSync>[0], { level: 6 });
}
