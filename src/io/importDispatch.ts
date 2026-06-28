import type { MindMapDoc } from "../model/types";
import { parseDoc } from "./json";

// Route an imported file to the right parser by extension, returning the parsed doc plus any lossy-
// import warnings. Every non-native format is code-split (dynamic import) so a parser's deps only load
// when that format is actually opened. `.mmap` is injected (the heaviest importer — fast-xml-parser +
// fflate) so the caller controls when that chunk loads. Pure: file in, { doc, warnings } out — no app
// state — so the whole extension matrix is unit-testable.

// Per-format "what didn't come across" notes. Every non-native importer converts a foreign model into
// our schema and necessarily drops something (styling, relationships, images, layout); surfacing a
// single honest line per format sets correct expectations so a user doesn't trust a faithful round-trip
// and delete their source. `.json`/`.mmst` are our own lossless schema (no note); `.mmap` returns its
// own richer, content-specific warnings (so it's not in this table).
const LOSSY_NOTE: Record<string, string> = {
  markmap: "Imported from Markdown — visual styling and layout aren’t part of the format.",
  mermaid: "Imported from Mermaid — only the diagram structure is converted.",
  opml: "Imported from OPML — an outline format; styling, markers and images aren’t included.",
  freemind: "Imported from FreeMind/Freeplane — some styling and icons may not map exactly.",
  xmind:
    "Imported from XMind — styling, relationships and some markers may not be fully preserved.",
  smmx: "Imported from SimpleMind — styling and some elements may not be fully preserved.",
  docx: "Imported from Word — headings and lists become topics; document formatting isn’t preserved.",
  xlsx: "Imported from Excel — rows become topics; cell formatting isn’t preserved.",
  ithoughts: "Imported from iThoughts — styling and some elements may not be fully preserved.",
  mindmeister: "Imported from MindMeister — styling and some elements may not be fully preserved.",
  mindmup: "Imported from MindMup — styling and some elements may not be fully preserved.",
  textbundle:
    "Imported from TextBundle — a Markdown outline; visual styling isn’t part of the format.",
};

export async function parseImport(
  file: File,
  importMmap: () => Promise<typeof import("../import/mmap")>,
): Promise<{ doc: MindMapDoc; warnings: string[] }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".md") || name.endsWith(".markdown")) {
    // Markmap files are Markdown (optionally with a `---` frontmatter block); fromMarkmap strips
    // any frontmatter then delegates to the Markdown parser, so plain .md still imports fine.
    const { fromMarkmap } = await import("./markmap");
    return { doc: fromMarkmap(await file.text()), warnings: [LOSSY_NOTE.markmap] };
  }
  if (name.endsWith(".mmd") || name.endsWith(".mermaid")) {
    const { fromMermaid } = await import("./mermaid");
    return { doc: fromMermaid(await file.text()), warnings: [LOSSY_NOTE.mermaid] };
  }
  if (name.endsWith(".json") || name.endsWith(".mmst")) {
    // `.mmst` is MindMap Studio's native file — the same lossless schema-v1 JSON (no lossy note).
    return { doc: parseDoc(await file.text()), warnings: [] };
  }
  if (name.endsWith(".opml")) {
    const { fromOpml } = await import("./opml");
    return { doc: fromOpml(await file.text()), warnings: [LOSSY_NOTE.opml] };
  }
  if (name.endsWith(".mm")) {
    const { fromFreemind } = await import("./freemind");
    return { doc: fromFreemind(await file.text()), warnings: [LOSSY_NOTE.freemind] };
  }
  if (name.endsWith(".xmind")) {
    const { fromXmind } = await import("./xmind");
    return {
      doc: fromXmind(new Uint8Array(await file.arrayBuffer())),
      warnings: [LOSSY_NOTE.xmind],
    };
  }
  if (name.endsWith(".smmx")) {
    const { fromSmmx } = await import("./smmx");
    return { doc: fromSmmx(new Uint8Array(await file.arrayBuffer())), warnings: [LOSSY_NOTE.smmx] };
  }
  if (name.endsWith(".docx")) {
    const { fromDocx } = await import("./docx");
    return { doc: fromDocx(new Uint8Array(await file.arrayBuffer())), warnings: [LOSSY_NOTE.docx] };
  }
  if (name.endsWith(".xlsx")) {
    const { fromXlsx } = await import("./xlsx");
    return { doc: fromXlsx(new Uint8Array(await file.arrayBuffer())), warnings: [LOSSY_NOTE.xlsx] };
  }
  if (name.endsWith(".itmz")) {
    const { fromIthoughts } = await import("./ithoughts");
    return {
      doc: fromIthoughts(new Uint8Array(await file.arrayBuffer())),
      warnings: [LOSSY_NOTE.ithoughts],
    };
  }
  if (name.endsWith(".mind")) {
    const { fromMind } = await import("./mindmeister");
    return {
      doc: fromMind(new Uint8Array(await file.arrayBuffer())),
      warnings: [LOSSY_NOTE.mindmeister],
    };
  }
  if (name.endsWith(".mup")) {
    const { fromMindMup } = await import("./mindmup");
    return { doc: fromMindMup(await file.text()), warnings: [LOSSY_NOTE.mindmup] };
  }
  if (name.endsWith(".textpack") || name.endsWith(".textbundle")) {
    const { fromTextBundle } = await import("./textbundle");
    return {
      doc: fromTextBundle(new Uint8Array(await file.arrayBuffer())),
      warnings: [LOSSY_NOTE.textbundle],
    };
  }
  const { parseMmap } = await importMmap();
  const result = parseMmap(new Uint8Array(await file.arrayBuffer()));
  return { doc: result.doc, warnings: result.warnings };
}
