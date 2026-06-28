import type { MapNode } from "../model/types";

// A cross-map branch clipboard, backed by localStorage so a copied branch survives switching maps
// (and a reload). That persistence is what makes "copy here, paste in another map" work — and lets
// you assemble a roll-up by pasting branches from several library maps into one. Holds a single
// subtree; each copy overwrites the previous one.

const KEY = "mindmap-branch-clipboard";

/** Store a copied subtree (overwriting any previous copy). Best-effort — ignores quota/serialise errors. */
export function setBranch(node: MapNode): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(node));
  } catch {
    // storage full or unavailable (e.g. private mode) — copy is best-effort
  }
}

/** Empty the branch clipboard (the Settings "clear branch clipboard" action). */
export function clearBranch(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}

/** Read the copied subtree, or null if the clipboard is empty / unreadable / malformed. */
export function getBranch(): MapNode | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Minimal shape guard: a node has a string id + topic and a children array.
    if (
      parsed &&
      typeof parsed.id === "string" &&
      typeof parsed.topic === "string" &&
      Array.isArray(parsed.children)
    ) {
      return parsed as MapNode;
    }
    return null;
  } catch {
    return null;
  }
}
