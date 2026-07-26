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
  "settings.appTheme.help":
    "App theme colours the chrome (toolbar, panels, dialogs). The canvas theme (which colours the topics) lives in the Map panel, alongside layout and the rest of the map's look — a dark canvas always darkens the chrome too.",
  "settings.reduceMotion.help":
    "Reduce motion makes canvas zoom/fit and the guided walk instant, and drops chrome transitions. System follows your device's reduced-motion setting.",
  "settings.highContrast.help":
    "High contrast strengthens chrome borders, dividers and text, and adds bolder focus rings. System follows your device's contrast / forced-colors setting.",
  "settings.localData.body":
    "Everything — your maps, version history and preferences — is stored only in this browser.",
  "settings.localData.usage": " About {used} used of {quota} available.",

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

  // Keyboard cheat sheet (src/shortcuts.ts). The KEY names themselves ("Ctrl/⌘ + Z", "Tab") stay
  // literal: they denote physical keys, and the canvas bindings they document are not locale-dependent.
  // Only the group titles and the action descriptions are translated.
  "shortcuts.group.editing": "Editing",
  "shortcuts.group.selectionMoving": "Selection & moving",
  "shortcuts.group.file": "File",
  "shortcuts.group.navigation": "Navigation",
  "shortcuts.group.view": "View",
  "shortcuts.action.addASiblingTopic": "Add a sibling topic",
  "shortcuts.action.addAChildTopic": "Add a child topic",
  "shortcuts.action.outdentPromoteOneLevel": "Outdent (promote one level)",
  "shortcuts.action.renameTheSelectedTopic": "Rename the selected topic",
  "shortcuts.action.startEditingTheSelectedTopic": "Start editing the selected topic",
  "shortcuts.action.openTheSelectedTopicSNote":
    "Open the selected topic's note (installed app only)",
  "shortcuts.action.deleteTheTopicItsBranchUndoable": "Delete the topic + its branch (undoable)",
  "shortcuts.action.copyTheSelectedBranch": "Copy the selected branch",
  "shortcuts.action.duplicateTheSelectedBranchAsA": "Duplicate the selected branch (as a sibling)",
  "shortcuts.action.pasteAnImageOrTextAs":
    "Paste an image, or text (as topics), onto the selection",
  "shortcuts.action.pasteACopiedBranchUnderThe": "Paste a copied branch under the selection",
  "shortcuts.action.boldItalicUnderlineWhileEditing": "Bold / italic / underline (while editing)",
  "shortcuts.action.undo": "Undo",
  "shortcuts.action.redo": "Redo",
  "shortcuts.action.redoAlternative": "Redo (alternative)",
  "shortcuts.action.setTheSelectedTopicSPriority":
    "Set the selected topic's priority (1 = highest, 9 = lowest)",
  "shortcuts.action.moveTheSelectionThroughTheTree": "Move the selection through the tree",
  "shortcuts.action.reorderTheTopicAmongItsSiblings": "Reorder the topic among its siblings",
  "shortcuts.action.outdentIndentTheSelectedTopic": "Outdent / indent the selected topic",
  "shortcuts.action.nudgeTheTopicSPositionFree": "Nudge the topic's position (free layout only)",
  "shortcuts.action.rubberBandSelectSeveralTopics": "Rubber-band select several topics",
  "shortcuts.action.startARelationshipArrowToA":
    "Start a relationship — arrow to a target, Enter to link (Esc cancels)",
  "shortcuts.action.saveToTheLinkedFile": "Save to the linked file",
  "shortcuts.action.saveToAFileAs": "Save to a file as…",
  "shortcuts.action.openAFile": "Open a file",
  "shortcuts.action.openTheCommandPaletteDoAnything": "Open the command palette (do anything)",
  "shortcuts.action.openSettingsPreferences": "Open Settings & preferences",
  "shortcuts.action.focusOnTheSelectedTopicEsc": "Focus on the selected topic (Esc to exit)",
  "shortcuts.action.openFindReplaceOrPress": "Open Find & Replace (or press /)",
  "shortcuts.action.openFindReplace": "Open Find & Replace",
  "shortcuts.action.goBackToThePreviousTopic": "Go back to the previous topic you visited",
  "shortcuts.action.goForwardAgain": "Go forward again",
  "shortcuts.action.cancelClearTheCurrentSelection": "Cancel / clear the current selection",
  "shortcuts.action.panTheCanvas": "Pan the canvas",
  "shortcuts.action.panTheCanvasEvenOverA": "Pan the canvas (even over a topic)",
  "shortcuts.action.zoomInAndOut": "Zoom in and out",
  "shortcuts.action.zoomInOut": "Zoom in / out",
  "shortcuts.action.resetZoomTo100": "Reset zoom to 100%",
  "shortcuts.action.fitTheWholeMapToView": "Fit the whole map to view",
  "shortcuts.action.fitTheSelectionToView": "Fit the selection to view",
  "shortcuts.action.renameIt": "Rename it",
  "shortcuts.action.addAFloatingTopic": "Add a floating topic",
  "shortcuts.action.drawARelationshipToAnotherTopic": "Draw a relationship to another topic",

  // ⌘K palette: layout names and export-format labels (src/components/editorCommands.ts). Keyed by
  // the command id rather than a slug of the English text, because the id is already stable and unique
  // — and because the export labels are POSITIONAL tuple members (`["json", ".json (lossless)", fn]`)
  // with no key naming them, which is exactly why a key-based sweep can't find them.
  //
  // The file extension stays inside the message rather than being composed around it: a translator may
  // want to reorder or re-qualify ("(lossless)" translates, "(Markdown)" is a product name and won't),
  // and one whole string per label gives them that control.
  "cmd.layout.side": "Both sides",
  "cmd.layout.right": "Right",
  "cmd.layout.left": "Left",
  "cmd.layout.radial": "Radial / hub",
  "cmd.layout.org-down": "Org chart down",
  "cmd.layout.org-up": "Org chart up",
  "cmd.layout.timeline": "Timeline",
  "cmd.layout.fishbone": "Fishbone",
  "cmd.layout.grid": "Grid / matrix",
  "cmd.layout.swimlane": "Swimlane",
  "cmd.layout.brace": "Brace map",
  "cmd.export.json": ".json (lossless)",
  "cmd.export.md": ".md (Markdown)",
  "cmd.export.opml": ".opml (outline)",
  "cmd.export.freemind": ".mm (FreeMind/Freeplane)",
  "cmd.export.mermaid": ".mmd (Mermaid)",
  "cmd.export.xmind": ".xmind (XMind)",
  "cmd.export.smmx": ".smmx (SimpleMind)",
  "cmd.export.mmap": ".mmap (MindManager)",
  "cmd.export.png": ".png (image)",
  "cmd.export.png2x": ".png @2× (sharp)",
  "cmd.export.png4x": ".png @4× (print)",
  "cmd.export.png-transparent": ".png (transparent)",
  "cmd.export.svg": ".svg (vector)",
  "cmd.export.html": ".html (standalone)",
  "cmd.export.ihtml": ".html (interactive)",
  "cmd.export.pdf-fit": ".pdf (fit to map)",
  "cmd.export.pdf-a4": ".pdf (A4 landscape)",
  "cmd.export.pdf-print": ".pdf (via print dialog)",
  "cmd.export.docx": ".docx (Word)",
  "cmd.export.xlsx": ".xlsx (Excel)",
  "cmd.export.deck": ".html (slide deck)",
  "cmd.export.pptx": ".pptx (PowerPoint)",

  // ⌘K command registry + its hints (src/components/editorCommands.ts). Keyed by command id, which is
  // already stable and unique. The key is passed as an explicit LITERAL at each call site rather than
  // derived from the id inside add(): a template-literal key can't be verified by tsc, and compile-time
  // key checking is the property this typed catalogue exists for.
  //
  // Composed labels carry a NAMED placeholder so word order belongs to the translator — `Layout: {name}`
  // can become `{name}-layout` where a language needs it, which string concatenation could never allow.
  "cmd.open-file": "Open file…",
  "cmd.save-file": "Save to file",
  "cmd.save-file-as": "Save to file as…",
  "cmd.present": "Present",
  "cmd.duplicate-map": "Duplicate map",
  "cmd.delete-map": "Delete map",
  "cmd.refresh-rollups": "Refresh all roll-ups",
  "cmd.search-all": "Search across every map",
  "cmd.nav-back": "Go back",
  "cmd.nav-forward": "Go forward",
  "cmd.paste-topics": "Paste text → topics",
  "cmd.copy-outline": "Copy outline to clipboard",
  "cmd.copy-table": "Copy as table (TSV)",
  "cmd.copy-image": "Copy map as image",
  "cmd.backup": "Back up whole library",
  "cmd.shortcuts": "Keyboard shortcuts",
  "cmd.settings": "Settings & preferences",
  "cmd.about": "About MindMap Studio",
  "cmd.undo": "Undo",
  "cmd.redo": "Redo",
  "cmd.fit": "Fit map to screen",
  "cmd.guided-walk": "Start guided walk",
  "cmd.collapse-all": "Collapse all branches",
  "cmd.expand-all": "Expand all branches",
  "cmd.copy-format": "Copy format",
  "cmd.auto-colour-branches": "Auto-colour branches",
  "cmd.drill-in": "Drill into the selected topic",
  "cmd.toggle-numbering": "Toggle outline numbering",
  "cmd.toggle-spellcheck": "Toggle spell-check",
  "cmd.toggle-line-jumps": "Toggle line jumps",
  "cmd.panel-outline": "Toggle Outline panel",
  "cmd.panel-index": "Toggle Markers & tags index",
  "cmd.panel-filter": "Toggle Power Filter",
  "cmd.panel-styles": "Toggle Conditional styles",
  "cmd.panel-relationships": "Toggle Relationships panel",
  "cmd.panel-history": "Toggle Version history",
  "cmd.panel-board": "Toggle Board (Kanban)",
  "cmd.panel-stats": "Toggle Map statistics",
  "cmd.panel-note-editor": "Toggle Note editor (dockable)",
  "cmd.panel-info": "Toggle Topic info / inspector",
  "cmd.panel-agenda": "Toggle Agenda (due tasks)",
  "cmd.panel-maps": "Toggle Maps (all maps)",
  "cmd.panel-inbox": "Toggle Inbox (quick capture)",
  "cmd.panel-deck": "Toggle Slide deck (custom)",
  "cmd.insert-sticky": "Insert sticky note",
  "cmd.node-delete": "Delete selected topic",
  "cmd.promote-branch": "New map from this topic",
  "cmd.getting-started": "Show getting-started tips again",
  "cmd.balance-map": "Balance map (even out both sides)",
  "cmd.isolate-branch": "Isolate branch (collapse others)",
  "cmd.paste-format": "Paste format",
  "cmd.focus-branch": "Focus the selected branch",
  "cmd.export-branch": "Export selected branch…",
  "cmd.distribute-h": "Distribute horizontally",
  "cmd.distribute-v": "Distribute vertically",
  "cmd.insert-group": "Group branch (boundary)",
  "cmd.insert-group-selection": "Group selection (boundary)",
  "cmd.insert-summary": "Summary bracket",
  "cmd.node-add-child": "Add child to selected topic",
  "cmd.start-relationship": "Start a relationship from selected topic",
  "cmd.align.left": "Align left",
  "cmd.align.hcenter": "Align centres (horizontal)",
  "cmd.align.right": "Align right",
  "cmd.align.top": "Align top",
  "cmd.align.vmiddle": "Align middles (vertical)",
  "cmd.align.bottom": "Align bottom",
  "cmd.sortBy.alpha": "A → Z",
  "cmd.sortBy.priority": "by priority",
  "cmd.sortBy.due": "by due date",
  "cmd.sortBy.progress": "by progress",
  "cmd.mapPart": "Insert map part: {name}",
  "cmd.expandLevel": "Show detail level {n}",
  "cmd.marker": "Marker: {marker} on selected topic",
  "cmd.priority": "Priority: {level} on selected topic",
  "cmd.sortChildren": "Sort children {by}",
  "cmd.layout": "Layout: {name}",
  "cmd.exportAs": "Export {format}",
  "cmd.switchMap": "Switch to map: {title}",
  "hint.stickyAdded": "Sticky note added — drag it anywhere.",
  "hint.mapPartInserted": "Inserted the {name} map part.",
  "hint.selectTopicFirst": "Select a topic first.",
  "cmd.goTo": "Go to: {topic}",
} as const satisfies Catalogue;

export type CoreKey = keyof typeof CORE_EN;

registerMessages("en", CORE_EN);
