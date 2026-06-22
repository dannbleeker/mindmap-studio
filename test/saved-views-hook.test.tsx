import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSavedViews } from "../src/savedViews";

// Hook-side of saved views (the pure array ops live in savedViews.test.ts). Drives the localStorage
// persistence, the blank-name guard, the per-map key, and the reload-on-map-change effect.

const VP = { x: 1, y: 2, zoom: 1 } as const;
const body = { viewport: VP, drillId: null, criteria: null };
const keyFor = (id: string) => `mindmap-views:${id}`;

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("useSavedViews (hook)", () => {
  it("seeds the list from localStorage for the active map", () => {
    localStorage.setItem(keyFor("m1"), JSON.stringify([{ id: "v0", name: "Seeded", ...body }]));
    const { result } = renderHook(() => useSavedViews("m1"));
    expect(result.current.list.map((v) => v.name)).toEqual(["Seeded"]);
  });

  it("add() persists a captured view (and ignores a blank name)", () => {
    const { result } = renderHook(() => useSavedViews("m1"));
    act(() => result.current.add("   ", body)); // blank → no-op
    expect(result.current.list).toHaveLength(0);
    act(() => result.current.add("  Overview  ", body)); // trimmed
    expect(result.current.list.map((v) => v.name)).toEqual(["Overview"]);
    // persisted under the per-map key
    const stored = JSON.parse(localStorage.getItem(keyFor("m1")) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: "Overview", viewport: VP });
    expect(typeof stored[0].id).toBe("string");
  });

  it("add() overwrites a same-named view; remove() drops by id", () => {
    const { result } = renderHook(() => useSavedViews("m1"));
    act(() => result.current.add("A", body));
    act(() => result.current.add("A", { ...body, drillId: "n9" })); // overwrite
    expect(result.current.list).toHaveLength(1);
    expect(result.current.list[0].drillId).toBe("n9");
    const id = result.current.list[0].id;
    act(() => result.current.remove(id));
    expect(result.current.list).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(keyFor("m1")) ?? "[]")).toHaveLength(0);
  });

  it("reloads the list when the active map id changes", () => {
    localStorage.setItem(keyFor("m2"), JSON.stringify([{ id: "x", name: "M2 view", ...body }]));
    const { result, rerender } = renderHook(({ id }) => useSavedViews(id), {
      initialProps: { id: "m1" },
    });
    expect(result.current.list).toHaveLength(0); // m1 has none
    rerender({ id: "m2" });
    expect(result.current.list.map((v) => v.name)).toEqual(["M2 view"]);
  });

  it("falls back to an empty list for corrupt or non-array storage", () => {
    localStorage.setItem(keyFor("bad"), "{not json");
    const a = renderHook(() => useSavedViews("bad"));
    expect(a.result.current.list).toEqual([]);
    localStorage.setItem(keyFor("obj"), JSON.stringify({ not: "an array" }));
    const b = renderHook(() => useSavedViews("obj"));
    expect(b.result.current.list).toEqual([]);
  });
});
