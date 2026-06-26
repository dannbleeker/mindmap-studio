import { describe, expect, it } from "vitest";
import {
  type KeyEventLike,
  type KeyIntent,
  type KeyState,
  keyIntent,
} from "../src/mindmap/flow/keyIntent";

// Pure key→intent mapping lifted out of the canvas keydown handler — table-driven over every branch.

const ev = (over: Partial<KeyEventLike>): KeyEventLike => ({
  key: "x",
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  target: null,
  ...over,
});
const st = (over: Partial<KeyState> = {}): KeyState => ({
  editing: false,
  selectedId: "n1",
  linking: false,
  ...over,
});

describe("keyIntent", () => {
  it("Escape cancels linking first, else clears the drag indicator — even while editing", () => {
    expect(keyIntent(ev({ key: "Escape" }), st({ linking: true }))).toEqual({
      kind: "clearLinking",
    });
    expect(keyIntent(ev({ key: "Escape" }), st({ linking: false }))).toEqual({
      kind: "clearDropTarget",
    });
    // Escape is handled BEFORE the editing guard (must still clear a stray indicator mid-edit).
    expect(keyIntent(ev({ key: "Escape" }), st({ editing: true }))).toEqual({
      kind: "clearDropTarget",
    });
  });

  it("ignores keys while inline-editing or when a form field / link is focused", () => {
    expect(keyIntent(ev({ key: "Enter" }), st({ editing: true }))).toBeNull();
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"]) {
      expect(keyIntent(ev({ key: "Enter", target: { tagName } }), st())).toBeNull();
    }
    expect(keyIntent(ev({ key: "Enter", target: { isContentEditable: true } }), st())).toBeNull();
    // a non-field element does NOT block
    expect(keyIntent(ev({ key: "Enter", target: { tagName: "DIV" } }), st())).toEqual({
      kind: "addSibling",
      id: "n1",
    });
  });

  it("maps undo/redo regardless of selection", () => {
    const noSel = st({ selectedId: null });
    expect(keyIntent(ev({ key: "z", ctrlKey: true }), noSel)).toEqual({ kind: "undo" });
    expect(keyIntent(ev({ key: "Z", metaKey: true }), noSel)).toEqual({ kind: "undo" });
    expect(keyIntent(ev({ key: "z", ctrlKey: true, shiftKey: true }), noSel)).toEqual({
      kind: "redo",
    });
    expect(keyIntent(ev({ key: "y", ctrlKey: true }), noSel)).toEqual({ kind: "redo" });
  });

  it("returns null for node shortcuts when nothing is selected", () => {
    const noSel = st({ selectedId: null });
    for (const key of ["Enter", "Tab", "Delete", "F2", "a"]) {
      expect(keyIntent(ev({ key }), noSel), key).toBeNull();
    }
  });

  it("maps the node-building shortcuts when a node is selected", () => {
    const cases: [Partial<KeyEventLike>, KeyIntent][] = [
      [{ key: "Enter" }, { kind: "addSibling", id: "n1" }],
      [
        { key: "Enter", ctrlKey: true },
        { kind: "addChild", id: "n1" },
      ],
      [
        { key: "Enter", metaKey: true },
        { kind: "addChild", id: "n1" },
      ],
      [{ key: "Tab" }, { kind: "addChild", id: "n1" }],
      [
        { key: "Tab", shiftKey: true },
        { kind: "outdent", id: "n1" },
      ],
      [{ key: "Delete" }, { kind: "delete", id: "n1" }],
      [{ key: "F2" }, { kind: "rename", id: "n1" }],
      [
        { key: "t", ctrlKey: true },
        { kind: "openNote", id: "n1" },
      ],
      [
        { key: "T", metaKey: true },
        { kind: "openNote", id: "n1" },
      ],
      [{ key: "a" }, { kind: "typeEdit", id: "n1", seed: "a" }],
    ];
    for (const [e, want] of cases) expect(keyIntent(ev(e), st())).toEqual(want);
  });

  it("maps reorder + promote/demote shortcuts (Ctrl/⌘+Shift+↑/↓, Alt+Shift+←/→)", () => {
    const cases: [Partial<KeyEventLike>, KeyIntent][] = [
      [
        { key: "ArrowUp", ctrlKey: true, shiftKey: true },
        { kind: "moveUp", id: "n1" },
      ],
      [
        { key: "ArrowDown", metaKey: true, shiftKey: true },
        { kind: "moveDown", id: "n1" },
      ],
      [
        { key: "ArrowLeft", altKey: true, shiftKey: true },
        { kind: "outdent", id: "n1" },
      ],
      [
        { key: "ArrowRight", altKey: true, shiftKey: true },
        { kind: "indent", id: "n1" },
      ],
    ];
    for (const [e, want] of cases) expect(keyIntent(ev(e), st())).toEqual(want);
  });

  it("type-to-edit only fires for an unmodified single printable char", () => {
    expect(keyIntent(ev({ key: "a", ctrlKey: true }), st())).toBeNull();
    expect(keyIntent(ev({ key: "a", metaKey: true }), st())).toBeNull();
    expect(keyIntent(ev({ key: "a", altKey: true }), st())).toBeNull();
    expect(keyIntent(ev({ key: "Home" }), st())).toBeNull(); // unhandled multi-char key name
  });

  it("maps bare arrows to logical selection movement (no modifiers)", () => {
    const cases: [Partial<KeyEventLike>, KeyIntent][] = [
      [{ key: "ArrowUp" }, { kind: "selectDir", id: "n1", dir: "up" }],
      [{ key: "ArrowDown" }, { kind: "selectDir", id: "n1", dir: "down" }],
      [{ key: "ArrowLeft" }, { kind: "selectDir", id: "n1", dir: "left" }],
      [{ key: "ArrowRight" }, { kind: "selectDir", id: "n1", dir: "right" }],
    ];
    for (const [e, want] of cases) expect(keyIntent(ev(e), st())).toEqual(want);
    // A modifier defers to the restructure shortcuts (not selectDir), and none fire without selection.
    expect(keyIntent(ev({ key: "ArrowUp", ctrlKey: true, shiftKey: true }), st())).toEqual({
      kind: "moveUp",
      id: "n1",
    });
    expect(keyIntent(ev({ key: "ArrowUp" }), st({ selectedId: null }))).toBeNull();
  });
});
