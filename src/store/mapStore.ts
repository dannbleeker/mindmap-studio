import { type DBSchema, type IDBPDatabase, deleteDB, openDB } from "idb";
import { normalizeDoc } from "../model/normalize";
import type { MapNode, MindMapDoc } from "../model/types";

// Local-first multi-map library. Each map is stored under its id; a small `meta`
// store remembers the last-opened map so startup restores where you left off; a
// `versions` store keeps a capped history of past snapshots per map (see below).

/** A persisted snapshot of a map at a point in time (the version-history store). */
interface VersionRecord {
  id: string; // `${mapId}:${ts}`
  mapId: string;
  ts: number;
  title: string;
  nodeCount: number;
  doc: MindMapDoc;
}

/** A recently-opened disk file (Open Recent). The actual handle lives in `handles` keyed by the same
 *  map id; this store just keeps the ordered, named recents list. */
export interface RecentFile {
  id: string; // map id (also the `handles` key)
  name: string; // the file name, for display
  ts: number; // last opened/saved (ms epoch) — drives the recency order
}

interface MindMapDB extends DBSchema {
  maps: { key: string; value: MindMapDoc };
  meta: { key: string; value: string };
  versions: { key: string; value: VersionRecord; indexes: { "by-map": string } };
  // Disk-file binding per map: a FileSystemFileHandle (structured-cloneable) so a map opened from /
  // saved to a `.mmst` reconnects to it across reloads. Permission is re-checked on use, not here.
  handles: { key: string; value: FileSystemFileHandle };
  // Recently-opened disk files (Open Recent), keyed by map id; the handle comes from `handles`.
  recentFiles: { key: string; value: RecentFile };
}

const DB_NAME = "mindmap-studio";
const DB_VERSION = 5;
/** Keep at most this many snapshots per map; older ones are pruned. */
export const MAX_VERSIONS = 30;

let dbPromise: Promise<IDBPDatabase<MindMapDB>> | null = null;

function db(): Promise<IDBPDatabase<MindMapDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MindMapDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("maps")) database.createObjectStore("maps");
        if (!database.objectStoreNames.contains("meta")) database.createObjectStore("meta");
        if (!database.objectStoreNames.contains("versions")) {
          const store = database.createObjectStore("versions", { keyPath: "id" });
          store.createIndex("by-map", "mapId");
        }
        if (!database.objectStoreNames.contains("handles")) database.createObjectStore("handles");
        if (!database.objectStoreNames.contains("recentFiles"))
          database.createObjectStore("recentFiles");
      },
    });
  }
  return dbPromise;
}

export interface MapSummary {
  id: string;
  title: string;
}

export async function saveMap(doc: MindMapDoc): Promise<void> {
  // Stamp last-edited so the start screen can group Recent (Today / Yesterday / Earlier). Stamped on
  // a copy so callers' in-memory docs aren't mutated.
  const stamped: MindMapDoc = { ...doc, meta: { ...doc.meta, updatedAt: Date.now() } };
  await (await db()).put("maps", stamped, doc.id);
}

export async function loadMap(id: string): Promise<MindMapDoc | null> {
  const m = (await (await db()).get("maps", id)) ?? null;
  // Salvage a corrupt/partial stored map to a projectable shape — otherwise a bad `children` array
  // throws in project() and white-screens the app (unrecoverable on the boot-restore path).
  return m ? normalizeDoc(m as MindMapDoc) : null;
}

export async function deleteMap(id: string): Promise<void> {
  await (await db()).delete("maps", id);
  await deleteVersionsForMap(id); // a deleted map's history goes with it
  await deleteMapHandle(id); // and its disk-file binding
  await deleteRecentFile(id); // and its Open-Recent entry
}

// --- trash (soft-delete) ---------------------------------------------------
// Deleting a map moves it to the Trash (a `meta.trashedAt` flag) rather than destroying it, so a
// delete is recoverable beyond the brief Undo toast (until the Trash is emptied). Trashed maps are
// hidden from the library (listMaps / useLibrary filter them out); their versions + disk handle are
// kept so Restore is lossless. Emptying the Trash is the only permanent delete.

/** Move a map to the Trash (recoverable). No-op if it isn't found. */
export async function softDeleteMap(id: string): Promise<void> {
  const doc = (await (await db()).get("maps", id)) ?? null;
  if (!doc) return;
  const trashed: MindMapDoc = { ...doc, meta: { ...doc.meta, trashedAt: Date.now() } };
  await (await db()).put("maps", trashed, id);
}

/** Restore a map from the Trash (clears its trashed flag); preserves its last-edited time. */
export async function restoreMapFromTrash(id: string): Promise<void> {
  const doc = (await (await db()).get("maps", id)) ?? null;
  if (!doc?.meta?.trashedAt) return;
  const meta = { ...doc.meta };
  meta.trashedAt = undefined;
  await (await db()).put("maps", { ...doc, meta }, id);
}

/** Maps currently in the Trash, most-recently-trashed first. */
export async function listTrashedMaps(): Promise<(MapSummary & { trashedAt: number })[]> {
  const docs = await (await db()).getAll("maps");
  return docs
    .filter((d): d is MindMapDoc & { meta: { trashedAt: number } } => !!d.meta?.trashedAt)
    .map((d) => ({ id: d.id, title: d.title, trashedAt: d.meta.trashedAt }))
    .sort((a, b) => b.trashedAt - a.trashedAt);
}

/** Permanently delete every map in the Trash (maps + versions + handles). */
export async function emptyTrash(): Promise<void> {
  for (const t of await listTrashedMaps()) await deleteMap(t.id);
}

// --- disk-file handles -----------------------------------------------------
// A map opened from / saved to a `.mmst` keeps a FileSystemFileHandle here, so a later session can
// reconnect and Save back to the same file. Handles are structured-cloneable, so IndexedDB stores
// them directly. Permission is NOT persisted by the browser for tab sessions (re-requested on use);
// an installed PWA can be granted persistent permission.

export async function saveMapHandle(id: string, handle: FileSystemFileHandle): Promise<void> {
  await (await db()).put("handles", handle, id);
}

export async function loadMapHandle(id: string): Promise<FileSystemFileHandle | null> {
  return (await (await db()).get("handles", id)) ?? null;
}

export async function deleteMapHandle(id: string): Promise<void> {
  await (await db()).delete("handles", id);
}

// --- recent disk files (Open Recent) ---------------------------------------

/** Record (or refresh) a disk file in the Open-Recent list. */
export async function noteRecentFile(id: string, name: string): Promise<void> {
  await (await db()).put("recentFiles", { id, name, ts: Date.now() }, id);
}

/** The most-recently-opened disk files, newest first (default 10). */
export async function listRecentFiles(limit = 10): Promise<RecentFile[]> {
  const all = await (await db()).getAll("recentFiles");
  return all.sort((a, b) => b.ts - a.ts).slice(0, limit);
}

/** Drop a file from the Open-Recent list (e.g. when its map is permanently deleted). */
async function deleteRecentFile(id: string): Promise<void> {
  await (await db()).delete("recentFiles", id);
}

export async function listMaps(): Promise<MapSummary[]> {
  const docs = await (await db()).getAll("maps");
  return docs
    .filter((doc) => !doc.meta?.trashedAt) // trashed maps are hidden from the library
    .map((doc) => ({ id: doc.id, title: doc.title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

// Every full map, for library-wide search. Read-all is fine for a personal library;
// callers load them once (e.g. when the search dialog opens) and filter in memory.
export async function getAllMaps(): Promise<MindMapDoc[]> {
  return (await db()).getAll("maps");
}

/** Maps (other than `targetId`) that reference it — via a roll-up binding (`node.rollup`) or an
 *  in-app map-link hyperlink (`#map=<id>`). Used to warn before deleting a map that others point at,
 *  so a delete doesn't silently break cross-map references. */
export async function findMapReferences(targetId: string): Promise<MapSummary[]> {
  const mapLink = `#map=${targetId}`;
  const refsTarget = (n: MapNode): boolean =>
    n.rollup === targetId || n.hyperlink === mapLink || (n.children ?? []).some(refsTarget);
  const docs = await getAllMaps();
  return docs
    .filter((d) => d.id !== targetId)
    .filter((d) => refsTarget(d.root) || (d.floatingTopics ?? []).some(refsTarget))
    .map((d) => ({ id: d.id, title: d.title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Wipe the entire local library (maps, versions, handles, meta) by deleting the IndexedDB database —
 *  the "clear all local data" action in Settings. Closes the cached connection first so the delete
 *  isn't blocked. The caller is expected to clear localStorage prefs + reload afterwards. */
export async function clearAllData(): Promise<void> {
  if (dbPromise) {
    try {
      (await dbPromise).close();
    } catch {
      // already closing / closed
    }
    dbPromise = null;
  }
  await deleteDB(DB_NAME);
}

export async function setLastOpened(id: string): Promise<void> {
  await (await db()).put("meta", id, "lastOpened");
}

export async function getLastOpened(): Promise<string | null> {
  return (await (await db()).get("meta", "lastOpened")) ?? null;
}

/** The open document tabs (map ids, in tab order) + the active one. Persisted so a reload restores
 *  the whole workspace, not just the single last-opened map. */
export interface TabSession {
  openTabIds: string[];
  activeTabId: string;
}

export async function setTabSession(session: TabSession): Promise<void> {
  await (await db()).put("meta", JSON.stringify(session), "tabSession");
}

/** Read the persisted tab session. Falls back to the legacy single `lastOpened` map for users
 *  upgrading from before tabs (so their last map still reopens as the sole tab). */
export async function getTabSession(): Promise<TabSession | null> {
  const raw = await (await db()).get("meta", "tabSession");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as TabSession;
      if (Array.isArray(parsed.openTabIds) && typeof parsed.activeTabId === "string") {
        return parsed;
      }
    } catch {
      // corrupt entry → fall through to the legacy migration
    }
  }
  const last = await getLastOpened();
  return last ? { openTabIds: [last], activeTabId: last } : null;
}

// --- quick-capture inbox ---------------------------------------------------
// A map-independent "Unfiled" bucket: jot a thought now (from any map, or none) and file it onto a
// map later. Stored as a JSON list under a single `meta` key — no new object store, so no schema
// bump. Small by nature (short text snippets), so read/write-whole is fine.

/** One unfiled capture: a short note to be turned into a topic later. */
export interface InboxItem {
  id: string;
  text: string;
  ts: number; // captured-at (ms epoch) — drives newest-first order
}

const INBOX_KEY = "inbox";

/** The quick-capture inbox, newest first. Tolerates a missing/corrupt entry (returns []). */
export async function getInbox(): Promise<InboxItem[]> {
  const raw = await (await db()).get("meta", INBOX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as InboxItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((i): i is InboxItem => !!i && typeof i.id === "string" && typeof i.text === "string")
      .sort((a, b) => b.ts - a.ts);
  } catch {
    return [];
  }
}

/** Persist the whole inbox (the hook writes the full list on every change). */
export async function saveInbox(items: InboxItem[]): Promise<void> {
  await (await db()).put("meta", JSON.stringify(items), INBOX_KEY);
}

// --- version history -------------------------------------------------------
// Per-map snapshots: the app saves one on a throttle while editing + on demand,
// capped at MAX_VERSIONS (oldest pruned). Restoring just loads a snapshot's doc.

/** Lightweight version metadata for the History list (no full doc). */
export interface VersionMeta {
  id: string;
  ts: number;
  title: string;
  nodeCount: number;
}

/** A version's metadata plus its full doc — the source for timeline playback. */
export interface VersionSnapshot extends VersionMeta {
  doc: MindMapDoc;
}

function docNodeCount(doc: MindMapDoc): number {
  // Defensive on `children`: snapshots may pre-date a normalize rule, and this runs at save time
  // before any load-boundary repair — a missing array must not throw and lose the snapshot.
  const walk = (n: MapNode): number => 1 + (n.children ?? []).reduce((sum, c) => sum + walk(c), 0);
  return walk(doc.root) + (doc.floatingTopics ?? []).reduce((sum, f) => sum + walk(f), 0);
}

/** Snapshot a doc at time `ts`, then prune the map's history to MAX_VERSIONS. */
export async function saveVersion(doc: MindMapDoc, ts: number): Promise<void> {
  const rec: VersionRecord = {
    id: `${doc.id}:${ts}`,
    mapId: doc.id,
    ts,
    title: doc.title,
    nodeCount: docNodeCount(doc),
    doc: structuredClone(doc),
  };
  await (await db()).put("versions", rec);
  await pruneVersions(doc.id, MAX_VERSIONS);
}

/** A map's snapshots, newest first (metadata only). */
export async function listVersions(mapId: string): Promise<VersionMeta[]> {
  const recs = await (await db()).getAllFromIndex("versions", "by-map", mapId);
  return recs
    .map((r) => ({ id: r.id, ts: r.ts, title: r.title, nodeCount: r.nodeCount }))
    .sort((a, b) => b.ts - a.ts);
}

/** A map's snapshots with their docs, oldest first — the source for timeline playback. */
export async function loadAllVersions(mapId: string): Promise<VersionSnapshot[]> {
  const recs = await (await db()).getAllFromIndex("versions", "by-map", mapId);
  return recs
    .map((r) => ({
      id: r.id,
      ts: r.ts,
      title: r.title,
      nodeCount: r.nodeCount,
      doc: normalizeDoc(r.doc),
    }))
    .sort((a, b) => a.ts - b.ts);
}

export async function loadVersion(id: string): Promise<MindMapDoc | null> {
  const doc = (await (await db()).get("versions", id))?.doc;
  // Mirror loadMap: salvage a corrupt/old snapshot so restore + playback can't white-screen project().
  return doc ? normalizeDoc(doc) : null;
}

/** The most recent snapshot's doc for a map (used to skip duplicate manual saves). */
export async function latestVersionDoc(mapId: string): Promise<MindMapDoc | null> {
  const recs = await (await db()).getAllFromIndex("versions", "by-map", mapId);
  if (recs.length === 0) return null;
  recs.sort((a, b) => b.ts - a.ts);
  return recs[0].doc;
}

export async function deleteVersionsForMap(mapId: string): Promise<void> {
  const database = await db();
  const keys = await database.getAllKeysFromIndex("versions", "by-map", mapId);
  const tx = database.transaction("versions", "readwrite");
  await Promise.all([...keys.map((k) => tx.store.delete(k)), tx.done]);
}

async function pruneVersions(mapId: string, keep: number): Promise<void> {
  const database = await db();
  const recs = await database.getAllFromIndex("versions", "by-map", mapId);
  if (recs.length <= keep) return;
  recs.sort((a, b) => b.ts - a.ts); // newest first
  const doomed = recs.slice(keep);
  const tx = database.transaction("versions", "readwrite");
  await Promise.all([...doomed.map((r) => tx.store.delete(r.id)), tx.done]);
}
