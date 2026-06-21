// Native file open / save / autosave, on top of the lossless JSON serializer.
//
// MindMap Studio's library always lives in IndexedDB (the safety net — see store/mapStore).
// This module adds *disk* files: a user can Open a `.mmst` from anywhere, Save back to it
// with no dialog, and have edits autosaved through to that same file. It's a thin wrapper
// over the File System Access API (Chromium desktop) with a download/upload fallback for
// browsers that lack it, so the rest of the app can stay oblivious to which path is live.
//
// `.mmst` ("MindMap STudio") is our native extension; the bytes are exactly the same
// schema-v1 JSON that `serializeDoc` produces, so a `.mmst` is also a valid `.json` import.

import type { MindMapDoc } from "../model/types";
import { parseDoc, serializeDoc } from "./json";

/** Native file extension (a custom extension is what lets Windows associate the PWA with it). */
export const NATIVE_EXT = ".mmst";
/** MIME type recorded for the native file — the content is JSON. */
export const NATIVE_MIME = "application/json";

/** Picker filter: Save offers only `.mmst`; Open also accepts a bare `.json` (same bytes). */
const SAVE_TYPES: FilePickerAcceptType[] = [
  { description: "MindMap Studio map", accept: { [NATIVE_MIME]: [NATIVE_EXT] } },
];
const OPEN_TYPES: FilePickerAcceptType[] = [
  { description: "MindMap Studio map", accept: { [NATIVE_MIME]: [NATIVE_EXT, ".json"] } },
];

/** True when the browser exposes the File System Access pickers (Chromium desktop, HTTPS/localhost). */
export function supportsFileSystemAccess(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showOpenFilePicker === "function" &&
    typeof window.showSaveFilePicker === "function"
  );
}

/** A filesystem-safe filename for a doc: its title, stripped of illegal characters, + `.mmst`. */
export function suggestedFileName(doc: MindMapDoc): string {
  const cleaned = (doc.title || "mindmap")
    .replace(/[<>:"/\\|?*]+/g, "_") // characters illegal in Windows/macOS/Linux filenames
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "") // a leading dot would make it a hidden / extension-only name
    .slice(0, 80)
    .trim();
  return `${cleaned || "mindmap"}${NATIVE_EXT}`;
}

/** Parse a `.mmst`/`.json` File into a doc (throws on anything that isn't a MindMap Studio map). */
export async function readMapFile(file: File): Promise<MindMapDoc> {
  return parseDoc(await file.text());
}

/** Read the doc out of a live file handle (used by Open and by the file-association launch path). */
export async function readMapFromHandle(handle: FileSystemFileHandle): Promise<MindMapDoc> {
  return readMapFile(await handle.getFile());
}

/**
 * Ensure we hold read/write permission on a handle. Returns true if granted.
 * `interactive: false` only checks (no prompt) — used by silent autosave so a background
 * write never pops a permission dialog; the explicit Save path passes `interactive: true`.
 */
export async function ensureWritePermission(
  handle: FileSystemFileHandle,
  interactive: boolean,
): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: "readwrite" };
  if ((await handle.queryPermission?.(opts)) === "granted") return true;
  if (!interactive) return false;
  return (await handle.requestPermission?.(opts)) === "granted";
}

/** Open the system file picker and read the chosen map. Returns null if the user cancels. */
export async function openMapFile(): Promise<{
  doc: MindMapDoc;
  handle: FileSystemFileHandle;
} | null> {
  if (!window.showOpenFilePicker) return null;
  let handle: FileSystemFileHandle | undefined;
  try {
    [handle] = await window.showOpenFilePicker({
      types: OPEN_TYPES,
      multiple: false,
      id: "mindmap",
    });
  } catch (err) {
    if (isAbort(err)) return null; // user dismissed the picker
    throw err;
  }
  if (!handle) return null;
  return { doc: await readMapFromHandle(handle), handle };
}

/** "Save As" — pick a destination and return its handle (caller then writes + remembers it). */
export async function pickSaveHandle(doc: MindMapDoc): Promise<FileSystemFileHandle | null> {
  if (!window.showSaveFilePicker) return null;
  try {
    return await window.showSaveFilePicker({
      suggestedName: suggestedFileName(doc),
      types: SAVE_TYPES,
      id: "mindmap",
    });
  } catch (err) {
    if (isAbort(err)) return null;
    throw err;
  }
}

/** Write a doc's serialized bytes to an existing handle (overwrites it). */
export async function writeMapToHandle(
  handle: FileSystemFileHandle,
  doc: MindMapDoc,
): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(serializeDoc(doc));
  } finally {
    await writable.close();
  }
}

/** Fallback download (browsers without the save picker): emit the doc as a `.mmst` download. */
export function downloadMapFile(doc: MindMapDoc): void {
  const blob = new Blob([serializeDoc(doc)], { type: NATIVE_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedFileName(doc);
  a.click();
  URL.revokeObjectURL(url);
}

/** A user-cancelled picker rejects with an AbortError — treated as "no selection", not an error. */
function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}
