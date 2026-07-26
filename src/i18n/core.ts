import { type Catalogue, registerMessages } from "./registry";

// English messages for the EAGER app chrome — the shell, dialogs and panels that load with the entry
// bundle. Strings belonging to a lazy chunk live in that chunk's own catalogue instead (see the note in
// ./registry.ts about bundle locality); this file must not become the home for all of them.
//
// This IS the source of truth for English: it's TypeScript so the keys form a compile-time union and a
// typo fails `tsc`. Other locales arrive as JSON fetched at runtime and overlay these via
// `registerMessages`, so translators never edit code.
//
// Key naming: `area.thing` / `area.thing.qualifier`, lower-camel within a segment, grouped by the
// surface a user sees. Keep the English text here identical to what the UI showed before extraction —
// this migration is behaviour-preserving, and the tests assert the rendered strings.

export const CORE_EN = {
  // Settings dialog
  "settings.title": "Settings",
  "settings.appearance": "Appearance",
  "settings.appTheme": "App theme",
  "settings.appTheme.system": "System",
  "settings.appTheme.light": "Light",
  "settings.appTheme.dark": "Dark",
  "settings.reduceMotion": "Reduce motion",
  "settings.highContrast": "High contrast",
  "settings.toggle.system": "System",
  "settings.toggle.on": "On",
  "settings.toggle.off": "Off",
  "settings.gettingStarted": "Getting started",
  "settings.gettingStarted.action": "Show the getting-started tips again",
  "settings.prefsFile": "Preferences file",
  "settings.prefsFile.export": "Export preferences…",
  "settings.prefsFile.import": "Import preferences…",
  "settings.localData": "Local data",
  "settings.localData.clearRecents": "Clear command history",
  "settings.localData.clearBranchClipboard": "Clear branch clipboard",
  "settings.localData.clearAll": "Clear all local data…",
  "settings.language": "Language",

  // Counts — plural categories rather than a `?  "" : "s"` ternary, so a locale with different
  // boundaries (or four categories) needs no call-site change.
  "count.preferences": { one: "{n} preference", other: "{n} preferences" },
  "count.topics": { one: "{n} topic", other: "{n} topics" },
  "count.nodes": { one: "{n} node", other: "{n} nodes" },
  "count.maps": { one: "{n} map", other: "{n} maps" },
  "count.folders": { one: "{n} folder", other: "{n} folders" },
  "count.commands": { one: "{n} command", other: "{n} commands" },
  "count.matches": { one: "{n} match", other: "{n} matches" },
  "count.attachments": { one: "{n} attachment", other: "{n} attachments" },
  "count.subTopics": { one: "{n} sub-topic", other: "{n} sub-topics" },
  "count.rollUps": { one: "{n} roll-up", other: "{n} roll-ups" },
  "count.otherMaps": { one: "{n} other map", other: "{n} other maps" },
  "count.notes": { one: "{n} note", other: "{n} notes" },
  "count.branchesCopied": {
    one: "Branch copied — paste with Ctrl/⌘+Shift+V.",
    other: "{n} branches copied — paste with Ctrl/⌘+Shift+V.",
  },

  // Relative time — the wording around Intl.RelativeTimeFormat's output.
  "time.justNow": "just now",

  // Preferences export / import
  "settings.prefsFile.body":
    "Preferences live in this browser, not in your maps — so saved filter presets, custom themes and named styles stay behind when you move machines. Export them to a file to carry them across. Importing only replaces the preferences the file contains, and never touches your maps.",
  "settings.prefsFile.nothingToExport": "No preferences to export yet.",
  "settings.prefsFile.exported": "Exported {count}.",
  "settings.prefsFile.unreadable": "Couldn't read that file.",
  "settings.prefsFile.unusable": "That file has no preferences this version can use.",
  "settings.prefsFile.confirmTitle": "Import preferences?",
  "settings.prefsFile.confirmBody":
    "This replaces {count} on this device (saved filters, themes, styles and panel layout as present in the file). Your maps are not touched. The app will reload.",
  "settings.prefsFile.confirmAction": "Import + reload",
} as const satisfies Catalogue;

export type CoreKey = keyof typeof CORE_EN;

registerMessages("en", CORE_EN);
