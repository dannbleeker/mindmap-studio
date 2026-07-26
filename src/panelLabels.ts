import { t } from "./i18n";
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
  outline: { tab: t("panel.outline"), menu: t("panel.outline") },
  index: { tab: t("panel.markersTags"), menu: t("app.markersTagsIndex") },
  relationships: { tab: t("app.relationships"), menu: t("app.relationships") },
  stats: { tab: t("app.stats"), menu: t("app.mapStatistics") },
  agenda: { tab: t("app.agenda"), menu: t("app.agendaDueTasks") },
  maps: { tab: t("app.maps"), menu: t("app.mapsAllMaps") },
  inbox: { tab: t("app.inbox"), menu: t("app.inboxQuickCapture") },
  deck: { tab: t("app.deck"), menu: t("app.slideDeckCustom") },
  note: { tab: t("app.note"), menu: t("app.noteEditorDockable") },
  filter: { tab: t("app.filter"), menu: t("app.powerFilter") },
  styles: { tab: t("app.styles"), menu: t("app.conditionalStyles") },
  history: { tab: t("app.history"), menu: t("app.versionHistory") },
  info: { tab: t("panel.topicInfo"), menu: t("app.topicInfoInspector") },
} as const satisfies Record<string, PanelLabel>;
