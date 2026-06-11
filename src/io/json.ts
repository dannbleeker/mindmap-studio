// Native, lossless JSON I/O for the canonical model. Unlike Markdown/PNG/SVG
// (lossy or derived), this round-trips the full doc — notes, links, boundaries,
// icons, tags — so a map can be saved and restored exactly. Pure + deterministic.

import type { MindMapDoc } from "../model/types";

export function serializeDoc(doc: MindMapDoc): string {
  return JSON.stringify(doc, null, 2);
}

export function parseDoc(text: string): MindMapDoc {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Not valid JSON");
  }
  if (
    !data ||
    typeof data !== "object" ||
    (data as { schemaVersion?: unknown }).schemaVersion !== 1 ||
    typeof (data as { root?: unknown }).root !== "object" ||
    (data as { root?: unknown }).root === null
  ) {
    throw new Error("Not a MindMap Studio .json file");
  }
  return data as MindMapDoc;
}
