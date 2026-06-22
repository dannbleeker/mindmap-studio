import { act, renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGuidedWalk } from "../src/hooks/useGuidedWalk";
import type { MindMapHandle } from "../src/mindmap";
import type { MindMapDoc } from "../src/model/types";

// Guided walk hook — outline-order stepping with a spotlight, ←/→ + Esc keyboard handling.

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "R",
  root: {
    id: "r",
    topic: "R",
    children: [
      { id: "a", topic: "A", children: [{ id: "a1", topic: "A1", children: [] }] },
      { id: "b", topic: "B", children: [] },
    ],
  },
};

function setup() {
  const setFocus = vi.fn();
  const setDrillId = vi.fn();
  const focusNode = vi.fn();
  const liveDocRef = { current: doc } as RefObject<MindMapDoc>;
  const mapRef = {
    current: { focusNode } as unknown as MindMapHandle,
  } as RefObject<MindMapHandle | null>;
  const hook = renderHook(() =>
    useGuidedWalk({ liveDoc: doc, liveDocRef, mapRef, setFocus, setDrillId }),
  );
  return { hook, setFocus, setDrillId, focusNode };
}

const key = (k: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
  });

beforeEach(() => {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof globalThis.requestAnimationFrame;
});
afterEach(() => vi.restoreAllMocks());

describe("useGuidedWalk", () => {
  it("starts at the first topic and spotlights it (focus + canvas centre)", () => {
    const { hook, setFocus, focusNode } = setup();
    expect(hook.result.current.index).toBeNull();
    expect(hook.result.current.total).toBe(4); // r, a, a1, b (depth-first outline)
    act(() => hook.result.current.start());
    expect(hook.result.current.index).toBe(0);
    expect(hook.result.current.node?.id).toBe("r");
    expect(setFocus).toHaveBeenCalledWith({ id: "r", topic: "R" });
    expect(focusNode).toHaveBeenCalledWith("r");
  });

  it("steps forward/back (clamped) and exposes the current node", () => {
    const { hook } = setup();
    act(() => hook.result.current.start());
    act(() => hook.result.current.step(1));
    expect(hook.result.current.node?.id).toBe("a");
    act(() => hook.result.current.step(99)); // clamps to the last topic
    expect(hook.result.current.index).toBe(3);
    expect(hook.result.current.node?.id).toBe("b");
    act(() => hook.result.current.step(-99)); // clamps to the first
    expect(hook.result.current.index).toBe(0);
  });

  it("←/→ keys step while walking; ignored when not walking", () => {
    const { hook } = setup();
    key("ArrowRight"); // not walking → no-op
    expect(hook.result.current.index).toBeNull();
    act(() => hook.result.current.start());
    key("ArrowRight");
    expect(hook.result.current.index).toBe(1);
    key("ArrowLeft");
    expect(hook.result.current.index).toBe(0);
  });

  it("Esc exits the walk and clears the spotlight + drill", () => {
    const { hook, setFocus, setDrillId } = setup();
    act(() => hook.result.current.start());
    key("Escape");
    expect(hook.result.current.index).toBeNull();
    expect(setFocus).toHaveBeenLastCalledWith(null);
    expect(setDrillId).toHaveBeenCalledWith(null);
  });

  it("exit() turns the walk off and clears focus", () => {
    const { hook, setFocus } = setup();
    act(() => hook.result.current.start());
    act(() => hook.result.current.exit());
    expect(hook.result.current.index).toBeNull();
    expect(setFocus).toHaveBeenLastCalledWith(null);
  });
});
