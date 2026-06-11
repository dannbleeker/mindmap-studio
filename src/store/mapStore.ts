import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { MindMapDoc } from "../model/types";

// Local-first persistence. The current map is autosaved to IndexedDB and
// reloaded on startup, so work survives a refresh with no server involved.

interface MindMapDB extends DBSchema {
  maps: { key: string; value: MindMapDoc };
}

const DB_NAME = "mindmap-studio";
const STORE = "maps";
const CURRENT_KEY = "current";

let dbPromise: Promise<IDBPDatabase<MindMapDB>> | null = null;

function db(): Promise<IDBPDatabase<MindMapDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MindMapDB>(DB_NAME, 1, {
      upgrade(database) {
        database.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

export async function saveCurrent(doc: MindMapDoc): Promise<void> {
  await (await db()).put(STORE, doc, CURRENT_KEY);
}

export async function loadCurrent(): Promise<MindMapDoc | null> {
  return (await (await db()).get(STORE, CURRENT_KEY)) ?? null;
}
