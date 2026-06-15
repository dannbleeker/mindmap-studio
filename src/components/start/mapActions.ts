import type { MindMapDoc } from "../../model/types";
import { deleteMap, loadMap, saveMap } from "../../store/mapStore";
import type { MapEntry } from "./MapCard";
import type { StartContext } from "./types";

// The MapCard kebab actions, wired to the store. Shared by Home / All maps / Recent.

function download(doc: MindMapDoc): void {
  const name =
    doc.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "map";
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function handleMapAction(
  action: string,
  entry: MapEntry,
  ctx: StartContext,
): Promise<void> {
  const doc = await loadMap(entry.id);
  if (!doc) return;
  switch (action) {
    case "open":
      ctx.onOpen(doc);
      return;
    case "rename": {
      const name = window.prompt("Rename map:", doc.title);
      if (name == null || !name.trim()) return;
      doc.title = name.trim();
      doc.root = { ...doc.root, topic: name.trim() };
      await saveMap(doc);
      ctx.onLibraryChange();
      return;
    }
    case "duplicate": {
      const copy: MindMapDoc = { ...structuredClone(doc), id: crypto.randomUUID() };
      copy.title = `${doc.title} (copy)`;
      copy.root = { ...copy.root, topic: copy.title };
      await saveMap(copy);
      ctx.onLibraryChange();
      return;
    }
    case "export":
      download(doc);
      return;
    case "delete":
      if (!window.confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
      await deleteMap(entry.id);
      ctx.onLibraryChange();
      return;
  }
}
