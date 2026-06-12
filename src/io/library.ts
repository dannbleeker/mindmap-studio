import type { MindMapDoc } from "../model/types";

// Whole-library backup: every map bundled into one JSON file, and the inverse.
// Pure + deterministic (unit-tested). Used for "Backup" (export all) and restore.

const KIND = "mindmap-library";

export function serializeLibrary(docs: MindMapDoc[]): string {
  return JSON.stringify({ schemaVersion: 1, kind: KIND, maps: docs }, null, 2);
}

function isValidDoc(m: unknown): m is MindMapDoc {
  return (
    !!m &&
    typeof m === "object" &&
    (m as { schemaVersion?: unknown }).schemaVersion === 1 &&
    typeof (m as { root?: unknown }).root === "object" &&
    (m as { root?: unknown }).root !== null
  );
}

export function parseLibrary(text: string): MindMapDoc[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Not valid JSON");
  }
  if (
    !data ||
    typeof data !== "object" ||
    (data as { kind?: unknown }).kind !== KIND ||
    !Array.isArray((data as { maps?: unknown }).maps)
  ) {
    throw new Error("Not a MindMap Studio library backup");
  }
  const maps = (data as { maps: unknown[] }).maps;
  return maps.map((m) => {
    if (!isValidDoc(m)) throw new Error("Library backup contains an invalid map");
    return m;
  });
}

/** Like parseLibrary but returns null instead of throwing when it's not a backup. */
export function tryParseLibrary(text: string): MindMapDoc[] | null {
  try {
    return parseLibrary(text);
  } catch {
    return null;
  }
}
