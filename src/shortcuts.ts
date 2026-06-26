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
      { keys: "Ctrl/⌘ + B / I / U", action: "Bold / italic / underline (while editing)" },
      { keys: "Ctrl/⌘ + Z", action: "Undo" },
      { keys: "Ctrl/⌘ + Shift + Z", action: "Redo" },
    ],
  },
  {
    title: "Navigation",
    items: [
      { keys: "Ctrl/⌘ + K", action: "Open the command palette (do anything)" },
      { keys: "Ctrl/⌘ + .", action: "Focus on the selected topic (Esc to exit)" },
      { keys: "/", action: "Jump to the Find box" },
      { keys: "Esc", action: "Cancel / clear the current selection" },
    ],
  },
  {
    title: "View",
    items: [
      { keys: "Drag the background", action: "Pan the canvas" },
      { keys: "Scroll / ⌘ + scroll", action: "Zoom in and out" },
      { keys: "Double-click a topic", action: "Rename it" },
      { keys: "Double-click the canvas", action: "Add a floating topic" },
    ],
  },
];
