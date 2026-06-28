// @vitest-environment jsdom
//
// useFind owns the Find behaviour: match topics/notes, focus each on the canvas, and cycle through
// hits forward (Enter / Next) and backward (Shift+Enter / Prev). The pure matcher (findDocMatches)
// is tested in search.test; THIS file covers the hook's cursor + match-count state machine — the
// part the overlay test only exercises via mocks.
import { act, renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { describe, expect, it, vi } from "vitest";
import type { MindMapHandle } from "../src/mindmap";
import type { MindMapDoc } from "../src/model/types";
import { useFind } from "../src/useFind";

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "T",
  root: {
    id: "r",
    topic: "root",
    children: [
      { id: "a", topic: "apple", children: [] },
      { id: "b", topic: "apricot", children: [] },
      { id: "c", topic: "banana", children: [] },
    ],
  },
};

function setup() {
  const focusNode = vi.fn();
  const mapRef = { current: { focusNode } } as unknown as RefObject<MindMapHandle | null>;
  const { result } = renderHook(() => useFind(mapRef, () => doc));
  return { result, focusNode };
}

describe("useFind — cycling", () => {
  it("steps forward through matches and wraps, focusing each on the canvas", () => {
    const { result, focusNode } = setup();
    act(() => result.current.setQuery("ap")); // matches "apple", "apricot"
    act(() => result.current.findNext());
    expect(result.current.matchInfo).toBe("1/2");
    act(() => result.current.findNext());
    expect(result.current.matchInfo).toBe("2/2");
    act(() => result.current.findNext()); // wraps to the first
    expect(result.current.matchInfo).toBe("1/2");
    expect(focusNode).toHaveBeenCalledTimes(3);
    expect(focusNode).toHaveBeenLastCalledWith("a");
  });

  it("steps backward (Prev) and wraps to the last match", () => {
    const { result, focusNode } = setup();
    act(() => result.current.setQuery("ap"));
    act(() => result.current.findPrev()); // fresh query + back → last match
    expect(result.current.matchInfo).toBe("2/2");
    expect(focusNode).toHaveBeenLastCalledWith("b");
    act(() => result.current.findPrev()); // wraps back to the first
    expect(result.current.matchInfo).toBe("1/2");
  });

  it("reports 'no matches' / empty for a non-matching / blank query", () => {
    const { result } = setup();
    act(() => result.current.setQuery("zzz"));
    act(() => result.current.findNext());
    expect(result.current.matchInfo).toBe("no matches");
    act(() => result.current.setQuery(""));
    act(() => result.current.findNext());
    expect(result.current.matchInfo).toBe("");
  });

  it("runSearch (form submit) advances to the next match", () => {
    const { result } = setup();
    act(() => result.current.setQuery("ap"));
    act(() => result.current.runSearch({ preventDefault: () => {} } as React.FormEvent));
    expect(result.current.matchInfo).toBe("1/2");
  });
});
