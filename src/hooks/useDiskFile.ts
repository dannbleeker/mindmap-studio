import { type RefObject, useCallback, useRef } from "react";
import {
  downloadMapFile,
  ensureWritePermission,
  openMapFile,
  pickSaveHandle,
  suggestedFileName,
  supportsFileSystemAccess,
  writeMapToHandle,
} from "../io/fileSystem";
import type { MindMapDoc } from "../model/types";
import { saveMapHandle } from "../store/mapStore";

// Disk-file binding (open / save / save-as / silent autosave-to-file) via the File System Access API.
// The IndexedDB library is always the safety net; this layer adds real `.mmst` files on disk. On a
// browser without the API (Firefox/Safari/mobile) Open falls back to the import <input> and Save to a
// plain download — feature-detected so the menu items always do *something*. Lifted out of App so the
// shell isn't carrying the file plumbing inline; App wires the deps and consumes the returned handlers.

interface Options {
  /** The live (uncommitted) doc — read by ref so handlers always see the latest without re-binding. */
  liveDocRef: RefObject<MindMapDoc>;
  /** Adopt a doc as the active map (the App-owned load path). */
  load: (doc: MindMapDoc, warnings?: string[]) => void;
  setView: (view: "editor") => void;
  setFileName: (name: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setError: (message: string | null) => void;
  showHint: (message: string) => void;
}

export function useDiskFile({
  liveDocRef,
  load,
  setView,
  setFileName,
  setDirty,
  setError,
  showHint,
}: Options) {
  // map id → FileSystemFileHandle, for maps opened from / saved to a file (mirrored in IndexedDB so it
  // survives a reload). Exposed so the boot-restore + edit-autosave paths can read/rebind it.
  const handleCache = useRef<Map<string, FileSystemFileHandle>>(new Map());
  const fileSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bind a map to a file handle: cache it, mirror to IndexedDB, and reflect it in the title bar.
  const bindFileHandle = useCallback(
    async (id: string, handle: FileSystemFileHandle) => {
      handleCache.current.set(id, handle);
      await saveMapHandle(id, handle).catch(() => {
        // handle persistence is best-effort (e.g. private mode) — the in-memory cache still works
      });
      if (id === liveDocRef.current.id) setFileName(handle.name);
    },
    [liveDocRef, setFileName],
  );

  // Adopt a doc read from a file as the active map, keeping its embedded id so re-saving overwrites the
  // same library entry (an id-less hand-built file gets a fresh one). Shared by Open + the launch queue.
  const adoptOpenedFile = useCallback(
    async (opened: MindMapDoc, handle: FileSystemFileHandle) => {
      if (!opened.id) opened.id = crypto.randomUUID();
      await bindFileHandle(opened.id, handle);
      load(opened);
      setFileName(handle.name);
      setDirty(false);
      setView("editor");
      showHint(`Opened ${handle.name}`);
    },
    [bindFileHandle, load, setFileName, setDirty, setView, showHint],
  );

  // Open a foreign file (a MindManager `.mmap`) as a one-way import: convert its bytes into a fresh
  // library map via the shared import dispatcher and DON'T bind a handle — there's no save-back to
  // `.mmap` (lossy by design). The map autosaves to IndexedDB like any other; the leading banner note
  // + toast tell the user to Save as… a `.mmst` to keep it as a file.
  const importForeignFile = useCallback(
    async (handle: FileSystemFileHandle) => {
      const bytes = new Uint8Array(await (await handle.getFile()).arrayBuffer());
      const { parseMmap } = await import("../import/mmap"); // lazy: keeps the importer out of the entry
      const { doc: next, warnings } = parseMmap(bytes);
      next.id = crypto.randomUUID(); // an import is a new library map, not a re-openable native file
      load(next, [
        "Imported from MindManager — saved to your library. You can't save back to .mmap; use “Save as…” to keep it as a .mmst file.",
        ...warnings,
      ]);
      setFileName(null); // library-only: not bound to a disk file
      setDirty(false);
      setView("editor");
      showHint(`Imported ${handle.name} — use “Save as…” to keep it as a .mmst file.`);
    },
    [load, setFileName, setDirty, setView, showHint],
  );

  const openFile = useCallback(async () => {
    if (!supportsFileSystemAccess()) {
      // No native picker — reuse the import <input>, which already accepts .mmst/.json/.mmap and more.
      document.getElementById("mmap-input")?.click();
      return;
    }
    try {
      const res = await openMapFile();
      if (!res) return;
      if (res.kind === "import") await importForeignFile(res.handle);
      else await adoptOpenedFile(res.doc, res.handle);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [adoptOpenedFile, importForeignFile, setError]);

  // "Save As" — pick a destination, write it, and remember the handle for plain Saves afterwards.
  const saveFileAs = useCallback(async () => {
    const d = liveDocRef.current;
    if (!supportsFileSystemAccess()) {
      downloadMapFile(d);
      showHint(`Downloaded ${suggestedFileName(d)}`);
      return;
    }
    try {
      const handle = await pickSaveHandle(d);
      if (!handle) return; // cancelled
      await writeMapToHandle(handle, d);
      await bindFileHandle(d.id, handle);
      setDirty(false);
      showHint(`Saved ${handle.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [liveDocRef, bindFileHandle, setDirty, setError, showHint]);

  // "Save" (Ctrl+S) — write back to the bound file with no dialog; first save (or no API) defers to
  // Save As / download. Prompts once for write permission if the browser dropped it this session.
  const saveFile = useCallback(async () => {
    const d = liveDocRef.current;
    if (!supportsFileSystemAccess()) {
      downloadMapFile(d);
      showHint(`Downloaded ${suggestedFileName(d)}`);
      return;
    }
    const handle = handleCache.current.get(d.id);
    if (!handle) {
      await saveFileAs();
      return;
    }
    try {
      if (!(await ensureWritePermission(handle, true))) {
        showHint("Couldn't save — permission to write the file was denied.");
        return;
      }
      await writeMapToHandle(handle, d);
      setDirty(false);
      showHint(`Saved ${handle.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [liveDocRef, saveFileAs, setDirty, setError, showHint]);

  // Background write-through after an edit — silent (never prompts): only writes when the browser still
  // holds write permission, so a denied/revoked grant simply leaves the IndexedDB copy as the record.
  const scheduleFileSave = useCallback(() => {
    if (fileSaveTimer.current) clearTimeout(fileSaveTimer.current);
    fileSaveTimer.current = setTimeout(async () => {
      const d = liveDocRef.current;
      const handle = handleCache.current.get(d.id);
      if (!handle) return;
      if (!(await ensureWritePermission(handle, false))) return; // don't prompt during autosave
      try {
        await writeMapToHandle(handle, d);
        if (d.id === liveDocRef.current.id) setDirty(false);
      } catch {
        // best-effort; the IndexedDB autosave still holds the edit
      }
    }, 1500);
  }, [liveDocRef, setDirty]);

  return {
    handleCache,
    bindFileHandle,
    adoptOpenedFile,
    importForeignFile,
    openFile,
    saveFile,
    saveFileAs,
    scheduleFileSave,
  };
}
