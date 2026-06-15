import { beforeEach, describe, expect, it } from "vitest";
import type { MapNode } from "../src/model/types";
import { getBranch, setBranch } from "../src/store/branchClipboard";

// The node test env has no localStorage; install a minimal in-memory Storage so the clipboard's real
// read/write path (and its JSON shape-guard) is exercised, not just the unavailable-storage fallback.
function makeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

beforeEach(() => {
  globalThis.localStorage = makeStorage();
});

const node: MapNode = {
  id: "a",
  topic: "A",
  children: [{ id: "b", topic: "B", children: [] }],
};

describe("branchClipboard", () => {
  it("round-trips a copied branch across get/set", () => {
    expect(getBranch()).toBeNull();
    setBranch(node);
    const got = getBranch();
    expect(got?.topic).toBe("A");
    expect(got?.children[0]?.topic).toBe("B");
  });

  it("returns null for malformed or non-node content", () => {
    localStorage.setItem("mindmap-branch-clipboard", "{ not json");
    expect(getBranch()).toBeNull();
    localStorage.setItem("mindmap-branch-clipboard", JSON.stringify({ nope: 1 }));
    expect(getBranch()).toBeNull();
  });

  it("set is best-effort (no throw) when storage is unavailable", () => {
    Reflect.deleteProperty(globalThis, "localStorage");
    expect(() => setBranch(node)).not.toThrow();
    expect(getBranch()).toBeNull();
  });
});
