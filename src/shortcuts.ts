// Single source of truth for the editor's keyboard shortcuts + canvas gestures. The in-app cheat
// sheet (ShortcutsDialog) and the tooltips both read from here, so they can't drift from the actual
// bindings. Those bindings live in: src/mindmap/FlowMindMap.tsx (canvas keydown + pan/zoom props),
// src/App.tsx (⌘K / "/" / Escape), and src/mindmap/flow/TopicNode.tsx (B/I/U while editing).

export interface Shortcut {
  /** Display form of the keys/gesture, e.g. "Tab" or "Ctrl/⌘ + Z". */
  keys: string;
  action: string;
}

export interface ShortcutGroup {
  title: string;
  items: Shortcut[];
}

// Cross-platform display: the canvas handles Ctrl OR ⌘ for the same bindings, so show both.
export const SHORTCUTS: ShortcutGroup[] = [
  {
    title: "Editing",
    items: [
      { keys: "Enter", action: "Add a sibling topic" },
      { keys: "Tab", action: "Add a child topic" },
      { keys: "Ctrl/⌘ + Enter", action: "Add a child topic" },
      { keys: "Shift + Tab", action: "Outdent (promote one level)" },
      { keys: "F2", action: "Rename the selected topic" },
      { keys: "Type a letter", action: "Start editing the selected topic" },
      { keys: "Ctrl/⌘ + T", action: "Open the selected topic's note (installed app only)" },
      { keys: "Delete", action: "Delete the topic + its branch (undoable)" },
      { keys: "Ctrl/⌘ + C", action: "Copy the selected branch" },
      { keys: "Ctrl/⌘ + D", action: "Duplicate the selected branch (as a sibling)" },
      { keys: "Ctrl/⌘ + Shift + V", action: "Paste a copied branch under the selection" },
      { keys: "Ctrl/⌘ + B / I / U", action: "Bold / italic / underline (while editing)" },
      { keys: "Ctrl/⌘ + Z", action: "Undo" },
      { keys: "Ctrl/⌘ + Shift + Z", action: "Redo" },
      { keys: "Ctrl/⌘ + Y", action: "Redo (alternative)" },
    ],
  },
  {
    title: "Selection & moving",
    items: [
      { keys: "Arrow keys", action: "Move the selection through the tree" },
      { keys: "Ctrl/⌘ + Shift + ↑ / ↓", action: "Reorder the topic among its siblings" },
      { keys: "Alt + Shift + ← / →", action: "Outdent / indent the selected topic" },
      { keys: "Ctrl/⌘ + arrow keys", action: "Nudge the topic's position (free layout only)" },
      { keys: "Shift + drag", action: "Rubber-band select several topics" },
      {
        keys: "Ctrl/⌘ + Shift + L",
        action: "Start a relationship — arrow to a target, Enter to link (Esc cancels)",
      },
    ],
  },
  {
    title: "File",
    items: [
      { keys: "Ctrl/⌘ + S", action: "Save to the linked file" },
      { keys: "Ctrl/⌘ + Shift + S", action: "Save to a file as…" },
      { keys: "Ctrl/⌘ + O", action: "Open a file" },
    ],
  },
  {
    title: "Navigation",
    items: [
      { keys: "Ctrl/⌘ + K", action: "Open the command palette (do anything)" },
      { keys: "Ctrl/⌘ + .", action: "Focus on the selected topic (Esc to exit)" },
      { keys: "Ctrl/⌘ + F", action: "Open Find & Replace (or press /)" },
      { keys: "/", action: "Open Find & Replace" },
      { keys: "Alt + ←", action: "Go back to the previous topic you visited" },
      { keys: "Alt + →", action: "Go forward again" },
      { keys: "Esc", action: "Cancel / clear the current selection" },
    ],
  },
  {
    title: "View",
    items: [
      { keys: "Drag the background", action: "Pan the canvas" },
      { keys: "Scroll / ⌘ + scroll", action: "Zoom in and out" },
      { keys: "Shift + 1", action: "Fit the whole map to view" },
      { keys: "Shift + 2", action: "Fit the selection to view" },
      { keys: "Double-click a topic", action: "Rename it" },
      { keys: "Double-click the canvas", action: "Add a floating topic" },
      { keys: "Drag a topic's grip", action: "Draw a relationship to another topic" },
    ],
  },
];

// Display bindings keyed by command id (the ids in editorCommands.ts), so menus + the ⌘K palette can
// show a shortcut hint at the point of use. ONLY commands that actually have a global key binding are
// listed — never invent one. Each value MUST appear verbatim as a `keys` string in SHORTCUTS above;
// `test/shortcut-bindings.test.ts` enforces that, so this map can't drift from the documented cheat-sheet.
export const SHORTCUT_BINDINGS: Record<string, string> = {
  undo: "Ctrl/⌘ + Z",
  redo: "Ctrl/⌘ + Shift + Z",
  "open-file": "Ctrl/⌘ + O",
  "save-file": "Ctrl/⌘ + S",
  "save-file-as": "Ctrl/⌘ + Shift + S",
  "nav-back": "Alt + ←",
  "nav-forward": "Alt + →",
};
