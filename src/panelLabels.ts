// One source of truth for every dockable panel's name (item 20). The left-dock TAB shows the terse
// base name; the Panels MENU shows a more descriptive form (the base plus a parenthetical/qualifier).
// Both the dock (App.tsx) and the menu (Toolbar.tsx) read from here, so the two vocabularies can't
// silently drift ("Index" vs "Markers & tags index", "Deck" vs "Slide deck (custom)"). A test locks
// that every dock key has an entry.

export interface PanelLabel {
  /** Terse label for the dock tab. */
  tab: string;
  /** Descriptive label for the Panels menu. */
  menu: string;
}

/** Panel key → its dock-tab + menu labels. Keys match the dock entry keys in App.tsx. */
export const PANEL_LABELS = {
  outline: { tab: "Outline", menu: "Outline" },
  index: { tab: "Markers & tags", menu: "Markers & tags index" },
  relationships: { tab: "Relationships", menu: "Relationships" },
  stats: { tab: "Stats", menu: "Map statistics" },
  agenda: { tab: "Agenda", menu: "Agenda (due tasks)" },
  maps: { tab: "Maps", menu: "Maps (all maps)" },
  inbox: { tab: "Inbox", menu: "Inbox (quick capture)" },
  deck: { tab: "Deck", menu: "Slide deck (custom)" },
  note: { tab: "Note", menu: "Note editor (dockable)" },
  filter: { tab: "Filter", menu: "Power Filter" },
  styles: { tab: "Styles", menu: "Conditional styles" },
  history: { tab: "History", menu: "Version history" },
  info: { tab: "Topic info", menu: "Topic info / inspector" },
} as const satisfies Record<string, PanelLabel>;
