import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { MindMapDoc } from "../model/types";

// Local-first multi-map library. Each map is stored under its id; a small `meta`
// store remembers the last-opened map so startup restores where you left off.

interface MindMapDB extends DBSchema {
  maps: { key: string; value: MindMapDoc };
  meta: { key: string; value: string };
}

const DB_NAME = "mindmap-studio";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<MindMapDB>> | null = null;

function db(): Promise<IDBPDatabase<MindMapDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MindMapDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("maps")) database.createObjectStore("maps");
        if (!database.objectStoreNames.contains("meta")) database.createObjectStore("meta");
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
  await (await db()).put("maps", doc, doc.id);
}

export async function loadMap(id: string): Promise<MindMapDoc | null> {
  return (await (await db()).get("maps", id)) ?? null;
}

export async function deleteMap(id: string): Promise<void> {
  await (await db()).delete("maps", id);
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
