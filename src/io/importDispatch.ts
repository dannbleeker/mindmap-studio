import type { MindMapDoc } from "../model/types";
import { parseDoc } from "./json";

// Route an imported file to the right parser by extension, returning the parsed doc plus any lossy-
// import warnings. Every non-native format is code-split (dynamic import) so a parser's deps only load
// when that format is actually opened. `.mmap` is injected (the heaviest importer — fast-xml-parser +
// fflate) so the caller controls when that chunk loads. Pure: file in, { doc, warnings } out — no app
// state — so the whole extension matrix is unit-testable.

export async function parseImport(
  file: File,
  importMmap: () => Promise<typeof import("../import/mmap")>,
): Promise<{ doc: MindMapDoc; warnings: string[] }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".md") || name.endsWith(".markdown")) {
    // Markmap files are Markdown (optionally with a `---` frontmatter block); fromMarkmap strips
    // any frontmatter then delegates to the Markdown parser, so plain .md still imports fine.
    const { fromMarkmap } = await import("./markmap");
    return { doc: fromMarkmap(await file.text()), warnings: [] };
  }
  if (name.endsWith(".mmd") || name.endsWith(".mermaid")) {
    const { fromMermaid } = await import("./mermaid");
    return { doc: fromMermaid(await file.text()), warnings: [] };
  }
  if (name.endsWith(".json") || name.endsWith(".mmst")) {
    // `.mmst` is MindMap Studio's native file — the same lossless schema-v1 JSON.
    return { doc: parseDoc(await file.text()), warnings: [] };
  }
  if (name.endsWith(".opml")) {
    const { fromOpml } = await import("./opml");
    return { doc: fromOpml(await file.text()), warnings: [] };
  }
  if (name.endsWith(".mm")) {
    const { fromFreemind } = await import("./freemind");
    return { doc: fromFreemind(await file.text()), warnings: [] };
  }
  if (name.endsWith(".xmind")) {
    const { fromXmind } = await import("./xmind");
    return { doc: fromXmind(new Uint8Array(await file.arrayBuffer())), warnings: [] };
  }
  if (name.endsWith(".smmx")) {
    const { fromSmmx } = await import("./smmx");
    return { doc: fromSmmx(new Uint8Array(await file.arrayBuffer())), warnings: [] };
  }
  if (name.endsWith(".docx")) {
    const { fromDocx } = await import("./docx");
    return { doc: fromDocx(new Uint8Array(await file.arrayBuffer())), warnings: [] };
  }
  if (name.endsWith(".xlsx")) {
    const { fromXlsx } = await import("./xlsx");
    return { doc: fromXlsx(new Uint8Array(await file.arrayBuffer())), warnings: [] };
  }
  if (name.endsWith(".itmz")) {
    const { fromIthoughts } = await import("./ithoughts");
    return { doc: fromIthoughts(new Uint8Array(await file.arrayBuffer())), warnings: [] };
  }
  if (name.endsWith(".mind")) {
    const { fromMind } = await import("./mindmeister");
    return { doc: fromMind(new Uint8Array(await file.arrayBuffer())), warnings: [] };
  }
  if (name.endsWith(".mup")) {
    const { fromMindMup } = await import("./mindmup");
    return { doc: fromMindMup(await file.text()), warnings: [] };
  }
  if (name.endsWith(".textpack") || name.endsWith(".textbundle")) {
    const { fromTextBundle } = await import("./textbundle");
    return { doc: fromTextBundle(new Uint8Array(await file.arrayBuffer())), warnings: [] };
  }
  const { parseMmap } = await importMmap();
  const result = parseMmap(new Uint8Array(await file.arrayBuffer()));
  return { doc: result.doc, warnings: result.warnings };
}
