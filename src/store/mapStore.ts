import { type DBSchema, type IDBPDatabase, openDB } from "idb";
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

interface MindMapDB extends DBSchema {
  maps: { key: string; value: MindMapDoc };
  meta: { key: string; value: string };
  versions: { key: string; value: VersionRecord; indexes: { "by-map": string } };
}

const DB_NAME = "mindmap-studio";
const DB_VERSION = 3;
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
}

export async function listMaps(): Promise<MapSummary[]> {
  const docs = await (await db()).getAll("maps");
  return docs
    .map((doc) => ({ id: doc.id, title: doc.title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

// Every full map, for library-wide search. Read-all is fine for a personal library;
// callers load them once (e.g. when the search dialog opens) and filter in memory.
export async function getAllMaps(): Promise<MindMapDoc[]> {
  return (await db()).getAll("maps");
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
  const walk = (n: MapNode): number => 1 + n.children.reduce((sum, c) => sum + walk(c), 0);
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
    .map((r) => ({ id: r.id, ts: r.ts, title: r.title, nodeCount: r.nodeCount, doc: r.doc }))
    .sort((a, b) => a.ts - b.ts);
}

export async function loadVersion(id: string): Promise<MindMapDoc | null> {
  return (await (await db()).get("versions", id))?.doc ?? null;
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
