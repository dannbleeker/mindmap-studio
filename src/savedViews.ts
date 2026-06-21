import { useCallback, useEffect, useState } from "react";
import type { FilterCriteria } from "./filter";

// Saved views — bookmark a perspective on a map (viewport + drill target + active Power Filter) and
// jump back to it. Persisted per map in localStorage. The array ops are pure (unit-tested); the hook
// wraps them with storage + the per-map key.

export interface SavedView {
  id: string;
  name: string;
  viewport: { x: number; y: number; zoom: number };
  /** The drilled-in topic id, or null for the whole map. */
  drillId: string | null;
  /** The active Power-Filter criteria, or null when no filter was on. */
  criteria: FilterCriteria | null;
}

/** Add a view, replacing any existing one with the same name (case-sensitive). Pure. */
export function addView(list: readonly SavedView[], view: SavedView): SavedView[] {
  return [...list.filter((v) => v.name !== view.name), view];
}

/** Remove the view with `id`. Pure. */
export function removeView(list: readonly SavedView[], id: string): SavedView[] {
  return list.filter((v) => v.id !== id);
}

const key = (mapId: string) => `mindmap-views:${mapId}`;

function read(mapId: string): SavedView[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key(mapId)) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export interface UseSavedViews {
  list: SavedView[];
  /** Add a captured view under `name` (no-op for a blank name). */
  add: (name: string, view: Omit<SavedView, "id" | "name">) => void;
  remove: (id: string) => void;
}

/** Per-map saved views, persisted to localStorage. Reloads when the active map changes. */
export function useSavedViews(mapId: string): UseSavedViews {
  const [list, setList] = useState<SavedView[]>(() => read(mapId));
  useEffect(() => {
    setList(read(mapId));
  }, [mapId]);

  const persist = useCallback(
    (next: SavedView[]) => {
      setList(next);
      try {
        localStorage.setItem(key(mapId), JSON.stringify(next));
      } catch {
        // best-effort
      }
    },
    [mapId],
  );

  const add = useCallback(
    (name: string, view: Omit<SavedView, "id" | "name">) => {
      const n = name.trim();
      if (!n) return;
      persist(addView(list, { id: crypto.randomUUID(), name: n, ...view }));
    },
    [list, persist],
  );
  const remove = useCallback((id: string) => persist(removeView(list, id)), [list, persist]);

  return { list, add, remove };
}
