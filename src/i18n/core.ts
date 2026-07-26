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
  // Shared across features — a string with more than one home belongs here once, under `common.`, so a
  // translator sees it once and the wording can't drift between the toolbar, the canvas and ⌘K.
  // `untitled` is the fallback shown wherever a map or topic has no title; it had 20 hardcoded copies.
  "common.untitled": "(untitled)",
  // Named by the CONCEPT, not by a surface: the toolbar's menu and the cheat sheet's group heading are
  // both "View", and neither owns the word. They were two keys until a duplicate-text check found them.
  "common.view": "View",
  // Shared by the canvas context menu and the inspector panel. EAGER on purpose: Panels renders
  // without the lazy canvas chunk, so an eager call site pointing at a canvas-registered key would
  // throw until that chunk happened to load. A duplicate-text test caught all four.
  "common.markers": "Markers",
  "common.tags": "Tags",
  "common.cancel": "Cancel",
  // Shared by the canvas context menu and the Start screen's map cards. EAGER on purpose: two
  // different LAZY chunks need it, and neither can rely on the other having loaded.
  "common.rename": "Rename",
  "common.grid": "Grid",
  "common.save": "Save",
  "common.close": "Close",
  "common.clear": "Clear",
  "common.add": "Add",
  "common.reset": "Reset",
  "common.restore": "Restore",
  "common.exit": "Exit",
  "common.priority": "Priority",
  "common.branchColour": "Branch colour",
  "common.addTag": "Add a tag",

  // Settings dialog
  "settings.title": "Settings",
  "settings.appearance": "Appearance",
  "settings.appTheme": "App theme",
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
  "cmd.mergeMap": "Insert map as branch: {title}",
  "cmd.node-priority-clear": "Priority: clear on selected topic",
  // One command, two labels: the row names what the link will point AT, which depends on whether a
  // topic is selected. Two keys rather than an interpolated noun — a language that inflects the verb
  // for its object can't be served by swapping one word.
  "cmd.copy-deep-link.topic": "Copy link to this topic",
  "cmd.copy-deep-link.map": "Copy link to this map",
  "hint.stickyAdded": "Sticky note added — drag it anywhere.",
  "hint.mapPartInserted": "Inserted the {name} map part.",
  "hint.selectTopicFirst": "Select a topic first.",
  "cmd.goTo": "Go to: {topic}",

  // Editor toolbar + its menus (src/components/Toolbar.tsx). No command ids to key off here, so keys
  // are slugged from the English text — same text means one shared message, so a label repeated across
  // two menus appears once.
  "toolbar.rectangle": "Rectangle",
  "toolbar.ellipse": "Ellipse",
  "toolbar.blockArrow": "Block arrow",
  "toolbar.chevron": "Chevron",
  "toolbar.swimlaneContainer": "Swimlane (container)",
  "toolbar.matrixContainer": "Matrix (container)",
  "toolbar.maps": "Maps /",
  "toolbar.openAMap": "Open a map…",
  "toolbar.openMap": "Open map",
  "toolbar.openAMapFromYour": "Open a map from your library",
  "toolbar.allMaps": "All maps",
  "toolbar.newMapFromATemplate": "New map from a template or example",
  "toolbar.newMapBlankTemplateOr": "New map (blank template or worked example)",
  "toolbar.recent": "Recent",
  "toolbar.openRecent": "Open recent",
  "toolbar.map": "Map",
  "toolbar.importBackup": "Import / backup",
  "toolbar.structure": "Structure",
  "toolbar.analysis": "Analysis",
  "toolbar.workflow": "Workflow",
  "toolbar.detailLevel": "Detail level",
  "toolbar.format": "Format",
  "toolbar.arrangeFreeLayout": "Arrange (free layout)",
  "toolbar.display": "Display",
  "toolbar.savedViews": "Saved views",
  "toolbar.mapPartInsertUnderSelected": "Map part (insert under selected)",
  "toolbar.templateInsertStructureUnderSelected": "Template (insert structure under selected)",
  "toolbar.backgroundShapeFreeCanvas": "Background shape (free-canvas)",
  "toolbar.rollUpMirrorAnotherMap": "Roll-up (mirror another map)",
  "toolbar.bindRollUpSource": "Bind roll-up source",
  "toolbar.bindSourceMap": "Bind source map…",
  "toolbar.openTheMapPanelTo":
    "Open the Map panel to change theme, layout, design presets, background, connectors, fonts and backdrop",
  "toolbar.layout": "Layout",
  "toolbar.orgChart": "Org chart ↓",
  "toolbar.orgChart2": "Org chart ↑",
  "toolbar.quickAdd": "Quick add… ⏎",
  "toolbar.quickAddTopic": "Quick add topic",
  "toolbar.typeATopicAndPress":
    "Type a topic and press Enter to add it under the selection (or the central topic).",

  // The rest of the toolbar, finished after the guard learned to see `label=` props, template literals
  // and wrapped ternary arms. Where a label matches a ⌘K command word for word it reuses that `cmd.*`
  // key instead of appearing here — the toolbar and the command registry are 1:1 by design, so the
  // string is written once and a translator sees it once.
  "toolbar.startScreen": "Start screen — new maps, templates, library",
  "toolbar.undo": "Undo (Ctrl/⌘+Z)",
  "toolbar.redo": "Redo (Ctrl/⌘+Shift+Z)",
  "toolbar.templates": "Templates",
  "toolbar.examples": "Examples",
  "toolbar.searchAllMaps": "Search across every map in your library",
  "toolbar.findReplace": "Find & replace (Ctrl/⌘+F)",
  "toolbar.saveAs": "Save as…",
  "toolbar.boardKanban": "Board (Kanban)",
  "toolbar.guidedWalk": "Guided walk (step through topics)",
  "toolbar.outlineNumbering": "Outline numbering",
  "toolbar.lineJumps": "Line jumps",
  "toolbar.legend": "Legend",
  "toolbar.spellCheck": "Spell-check",
  "toolbar.saveCurrentView": "Save current view…",
  "toolbar.deleteView": "Delete view {name}",
  "toolbar.stickyNote": "Sticky note",
  "toolbar.stickyNoteNamed": "Sticky note: {colour}",
  "toolbar.addStickyNote": "Add a {colour} sticky note (and make it the default)",
  "toolbar.mapParts": "Map parts",
  "toolbar.shapes": "Shapes",
  "toolbar.showLevel": "Show level {n}",
  "toolbar.freeLayout": "Free layout (whiteboard)",
  "toolbar.themeAndDesign": "Theme, design presets & backdrop…",
  // Optgroup headings in the layout picker. Keyed by role rather than by the English word, because
  // "Tree" and "Diagram" are also topic text a user might type — a slug of the text would read as
  // though those two were the same string.
  "toolbar.layoutGroupRadial": "Radial",
  "toolbar.layoutGroupTree": "Tree",
  "toolbar.layoutGroupDiagram": "Diagram",

  // The "Saved locally" status badge: the visible label and its longer tooltip, in both states.
  "toolbar.saveOk.label": "Saved locally",
  "toolbar.saveOk.title": "Your maps are stored locally in this browser.",
  "toolbar.saveError.label": "Couldn't save",
  "toolbar.saveError.title":
    "Couldn't save to this browser — it may be out of storage or in private mode.",

  // Why a menu item is greyed out. Each names the specific precondition, so they don't collapse into
  // one generic "not available" that a translator would have to make vague.
  "toolbar.balanceEnabled": "Clear any pinned sides and redistribute the main branches evenly",
  "toolbar.balanceDisabled": "Only the two-sided (Both sides) layout has sides to balance",
  "toolbar.isolateDisabled": "Select a topic in a branch to isolate it",
  "toolbar.groupBranchDisabled": "Select a topic first to group its branch",
  "toolbar.groupSelectionDisabled": "Select 2+ topics to group them in one boundary",
  "toolbar.summaryDisabled": "Select a topic first to summarise its branch",
  "toolbar.insertUnderDisabled": "Select a topic first to insert under it",
  "toolbar.layoutPaused": "Auto-layout is paused (Free layout is on)",

  // Numbering toggles. The label states the style that is CURRENTLY on, so both wordings ship.
  "toolbar.numberingStyle.outline": "Numbering style: outline (I, A, 1)",
  "toolbar.numberingStyle.decimal": "Numbering style: decimal (1, 1.1)",
  "toolbar.numbering.outline": "Numbering: outline (I, A, 1)",
  "toolbar.numbering.decimal": "Numbering: decimal (1, 1.1)",

  // Transient toasts raised from the toolbar (`showHint`). Paired success/precondition wordings.
  "hint.branchIsolated": "Isolated this branch.",
  "hint.selectTopicInBranch": "Select a topic in a branch first.",
  "hint.branchGrouped": "Branch grouped — double-click the label to rename.",
  "hint.selectNodeToGroup": "Select a node first, then group its branch.",
  "hint.selectionGrouped": "Selection grouped — double-click the label to rename.",
  "hint.selectTwoTopics": "Select 2+ topics first.",
  "hint.summaryAdded": "Summary added — double-click its label to rename.",
  "hint.selectNodeToSummarise": "Select a node first, then summarise its branch.",
  "hint.selectNodeToBindRollup": "Select a node first, then bind a roll-up source.",
  "hint.rollupUnbound": "Roll-up unbound.",
  "hint.rollupBound": "Bound — refresh to pull the latest.",
  "hint.structureInserted": "Inserted the {name} structure.",
  "hint.stickyColourAdded": "{colour} sticky note added.",
  "hint.shapeAdded": "Added a {shape} — drag to move, drag a corner to resize.",

  // Export menu. The FORMAT labels are not here — they reuse `cmd.export.*`, because this menu and the
  // ⌘K "Export …" rows offer the same list and must not drift. Only the group headings and the two
  // entries with no ⌘K equivalent are toolbar-local.
  "toolbar.exportGroup.data": "Data & outline",
  "toolbar.exportGroup.image": "Image",
  "toolbar.exportGroup.document": "Document",
  "toolbar.exportGroup.presentation": "Presentation",
  "toolbar.copyImageToClipboard": "Copy image to clipboard",
  "toolbar.exportPdfLetter": ".pdf (Letter portrait)",

  // --- App.tsx --------------------------------------------------------------------------------------
  // Mostly `showHint` toasts. The "select something first" family is deliberately one message PER
  // action rather than a generic "nothing selected": each names what the user was reaching for, which
  // is the difference between a hint and a scold — and a translator needs the verb to inflect.

  "hint.outlineCopied": "Outline copied to clipboard",
  "hint.tableCopied": "Map copied as a table (TSV)",
  "hint.topicLinkCopied": "Link to this topic copied",
  "hint.mapLinkCopied": "Link to this map copied",
  "hint.clipboardDenied": "Couldn't access the clipboard",
  "hint.upToDate": "You're on the latest version.",
  "hint.updateDownloading":
    "New version found — the refresh prompt will appear once it finishes downloading.",
  "hint.updateUnavailable": "Update checks aren't available here (no service worker running).",
  "hint.openInAnotherTab":
    "This map is open in another tab — edits here may overwrite the other tab's autosaves.",

  "hint.imageAdded": "Image added to the selected node.",
  "hint.imageFailed": "Could not add image",
  "hint.backgroundSet": "Background image set for this map.",
  "hint.backgroundFailed": "Could not set background image",
  "hint.fileFailed": "Could not add that file.",
  "hint.attachFailed": "Could not attach that file.",
  "hint.fillImageFailed": "Could not set the fill image",

  "hint.noRollups": "No roll-ups yet — pick a source map in the ⤵ Roll-up menu first.",
  "hint.selectTopicToPromote": "Select a topic first to promote it to a new map.",
  "hint.pickBranchToPromote": "Pick a branch (not the central topic) to promote.",
  "hint.promoteFailed": "Couldn't create the new map.",
  "hint.selectTopicToMerge": "Select a topic first to merge a map under it.",
  "hint.pickDifferentMap": "Pick a different map to merge in.",
  "hint.mapLoadFailed": "Couldn't load that map.",
  "hint.mergeFailed": "Couldn't merge that map.",
  "hint.noMatchesToExtract": "No matches to extract — adjust the filter first.",

  "hint.selectNodeForImage": "Select a node first, then add an image.",
  "hint.selectTopicForStyle": "Select a topic first, then apply a named style.",
  "hint.selectNodeForMarker": "Select a node first, then click a marker.",
  "hint.selectNodeForSticker": "Select a node first, then pick a sticker.",
  "hint.selectNodeForStyle": "Select a node first, then style it.",
  "hint.selectNodeForBranchColour": "Select a node first, then set its branch colour.",
  "hint.selectTopicForFillImage": "Select a topic first, then set its fill image.",
  "hint.selectNodeForProgress": "Select a node first, then set its progress.",
  "hint.selectNodeForDue": "Select a node first, then set a due date.",
  "hint.selectNodeForStart": "Select a node first, then set a start date.",
  "hint.selectNodeForPriority": "Select a node first, then set its priority.",
  "hint.selectNodeForAttachment": "Select a node first, then attach a file.",
  "hint.selectNodeForLink": "Select a node first, then add a link.",
  "hint.selectNodeShort": "Select a node first",

  "hint.commandHistoryCleared": "Command history cleared.",
  "hint.branchClipboardCleared": "Branch clipboard cleared.",
  "hint.showAll": "Show all",
  "hint.designApplied": "Applied the {name} design.",
  "hint.viewSaved": 'Saved view "{name}".',
  "hint.viewReplaced": 'Replaced view "{name}".',
  "hint.viewDeleted": 'Deleted view "{name}".',
  "hint.filteringBy": "Filtering by {kind} “{key}”.",

  // Counts. Every one of these was a hand-written `=== 1 ? "" : "s"` before; `Intl.PluralRules` picks
  // the arm, so a locale with four categories needs no call-site change.
  "hint.restoredMaps": {
    one: "Restored {n} map from backup.",
    other: "Restored {n} maps from backup.",
  },
  "hint.importedMaps": {
    one: "Imported {n} of {total} maps",
    other: "Imported {n} of {total} maps",
  },
  "hint.importFailedSuffix": { one: " ({n} failed).", other: " ({n} failed)." },
  "hint.importFailed": "Import failed — {error}",
  "hint.noReadableMaps": "no readable maps",
  "hint.rollupsRefreshed": {
    one: "Refreshed {n} roll-up{missing}.",
    other: "Refreshed {n} roll-ups{missing}.",
  },
  "hint.rollupsMissing": {
    one: " ({n} source map missing)",
    other: " ({n} source maps missing)",
  },
  "hint.extracted": {
    one: "Extracted {n} matching topic to a new map.",
    other: "Extracted {n} matching topics to a new map.",
  },
  "dialog.deleteMapRefs": {
    one: "{n} other map links to this one ({names}). Those links will break.",
    other: "{n} other maps link to this one ({names}). Those links will break.",
  },

  // App chrome
  "app.skipToCanvas": "Skip to canvas",
  "app.dismissImportError": "Dismiss import error",
  "app.dismissImportNotes": "Dismiss import notes",
  "app.resizePanel": "Resize panel — drag, arrow keys to resize, Escape to close",

  // Search-across-every-map overlay. The OPERATOR list in the tooltip stays literal — `tag:`,
  // `due:overdue` and friends are syntax the user types, not prose.
  "search.title": "Search all maps",
  "search.close": "Close search",
  "search.placeholder": "Find across every map… (try tag:foo  priority:1  has:note  -exclude)",
  "search.queryLabel": "Search query",
  "search.operatorsHelp": "Search every map by text, or use operators:",

  // About dialog. The product name is a message so a locale that requires transliteration can supply
  // one; most will leave it exactly as it is.
  "about.appName": "MindMap Studio",
  "about.close": "Close about dialog",
  "about.tagline":
    "Local-first mind mapping — a MindManager replacement. Your maps stay in your browser.",
  "about.licenseHeading": "License (dual)",
  "about.licenseCode": "Software — Apache License 2.0",
  "about.licenseBook": "Book and docs — CC BY-NC 4.0",
  "about.userGuide": "User guide",
  "about.thirdParty": "Third-party notices",
  "about.dashboard": "Live dashboard",
  "about.checkUpdates": "Check for updates",

  // Paste-outline dialog + the command palette's search box
  "paste.inputLabel": "Paste outline text",
  "paste.addUnder": 'Add under "{topic}"',
  "palette.placeholder": "Search commands…",

  // --- Panels.tsx -----------------------------------------------------------------------------------
  // The side panels: outline, markers & tags index, relationships, agenda, maps, inbox, deck editor,
  // power filter, version history, conditional styles, topic inspector, note editor and the sticker /
  // marker pickers. Keys are slugged from the English, the same convention as the toolbar block above,
  // and deduplicated BY TEXT so one sentence can never acquire two keys — the mistake that left 21
  // duplicate messages behind the first time round. Where the text already had a key it is REUSED and
  // does not appear here (`common.untitled` alone covers 18 sites).
  "panel.dueDatePlaceholder": "e.g. next fri, +7d",
  "panel.pickFromCalendar": "Pick from calendar",
  "panel.box": "Box",
  "panel.rounded": "Rounded",
  "panel.pill": "Pill",
  "panel.noFill": "No fill",
  "panel.branchColourTint": "Branch-colour tint",
  "panel.gradientFill": "Gradient fill",
  "panel.noBorder": "No border",
  "panel.bold": "Bold",
  "panel.raisedDropShadow": "Raised (drop shadow)",
  "panel.flatNoShadow": "Flat (no shadow)",
  "panel.topicFontFamily": "Topic font family",
  "panel.topicWrapWidth": "Topic wrap width",
  "panel.dragToSet":
    "Drag to set the topic wrap width (snaps to Narrow / Medium / Wide; far end = None)",
  "panel.resetStyle": "Reset style",
  "panel.filterOutlinePlaceholder": "Filter outline…",
  "panel.filterOutline": "Filter outline",
  "panel.outlineTree": "Outline tree",
  "panel.renameTopic": "Rename topic",
  "panel.promoteOutdent": "Promote (outdent)",
  "panel.promoteTopic": "Promote topic",
  "panel.demoteIndent": "Demote (indent)",
  "panel.demoteTopic": "Demote topic",
  "panel.filterMapsPlaceholder": "Filter maps…",
  "panel.filterMaps": "Filter maps",
  "panel.inboxPlaceholder": "Jot a thought…",
  "panel.captureToInbox": "Capture to inbox",
  "panel.discard": "Discard",
  "panel.moveUp": "Move up",
  "panel.moveDown": "Move down",
  "panel.removeSlide": "Remove slide",
  "panel.speakerNotePlaceholder": "Speaker note…",
  "panel.addASlide": "Add a slide",
  "panel.filterByTextPlaceholder": "Filter by text…",
  "panel.filterByText": "Filter by text",
  "panel.filterByDue": "Filter by due date",
  "panel.filterByPriority": "Filter by priority",
  "panel.filterByCompletion": "Filter by completion",
  "panel.filterByRelationship": "Filter by relationship direction",
  "panel.filterByRelationshipType": "Filter by relationship type",
  "panel.nameFilterPlaceholder": "Name this filter…",
  "panel.saveFilterName": "Save filter name",
  "panel.historyPlayback": "History playback",
  "panel.previousVersion": "Previous version",
  "panel.nextVersion": "Next version",
  "panel.versionTimeline": "Version timeline",
  "panel.restoreThisVersion": "Restore this version",
  "panel.exitPlaybackEsc": "Exit playback (Esc)",
  "panel.guidedWalk": "Guided walk",
  "panel.previousTopic": "Previous topic",
  "panel.nextTopic": "Next topic",
  "panel.exitWalkEsc": "Exit walk (Esc)",
  "panel.tagName": "tag name",
  "panel.topicContains": "topic contains…",
  "panel.removeRule": "Remove rule",
  "panel.invertThisCondition": "Invert this condition",
  "panel.ruleCondition": "Rule condition",
  "panel.andCondition": "AND condition",
  "panel.removeThisAnd": "Remove this AND condition",
  "panel.ruleActionMarker": "Rule action marker",
  "panel.removeNamedStyle": "Remove named style",
  "panel.nameThisStylePlaceholder": "Name this style…",
  "panel.nameThisStyle": "Name this style",
  "panel.progress": "Progress",
  "panel.clearTaskStatus": "Clear task status (remove the pie)",
  "panel.topicInfo": "Topic info",
  "panel.minimizeCollapseTo": "Minimize — collapse to the right edge",
  "panel.minimizeTopicInfo": "Minimize topic info",
  "panel.removeTheFill": "Remove the fill image",
  "panel.openThisNote": "Open this note in the dockable editor for more room",
  "panel.addATagPlaceholder": "Add a tag, press Enter",
  "panel.addATagTo": "Add a tag to all, press Enter",
  "panel.addATagToAll": "Add a tag to all selected",
  "panel.dates": "Dates",
  "panel.clearPriority": "Clear priority",
  "panel.attachments": "Attachments",
  "panel.removeAttachment": "Remove attachment",
  "panel.links": "Links",
  "panel.linkHttpsMailto": "Link (https://, mailto:, tel:…)",
  "panel.webLink": "Web link",
  "panel.linkToAnother": "Link to another map",
  "panel.jumpToAnother": "Jump to another topic",
  "panel.focusATopic": "Focus a topic in the linked map",
  "panel.removeThisLink": "Remove this link",
  "panel.addAnotherLinkPlaceholder": "Add another link + Enter",
  "panel.addAnotherLink": "Add another link",
  "panel.linkedFrom": "Linked from",
  "panel.linksTo": "Links to",
  "panel.linkedFromOther": "Linked from other maps",
  "panel.closeNoteEditor": "Close note editor",
  "panel.noteFormatting": "Note formatting",
  "panel.heading1": "Heading 1",
  "panel.heading2": "Heading 2",
  "panel.heading3": "Heading 3",
  "panel.highlightSelection": "Highlight selection",
  "panel.codeBlock": "Code block",
  "panel.checklist": "Checklist",
  "panel.insertLinkWraps": "Insert link (wraps the selected text)",
  "panel.insertImageBy": "Insert image (by URL)",
  "panel.insertTable": "Insert table",
  "panel.nodeNote": "Node note",
  "panel.findASticker": "Find a sticker…",
  "panel.searchStickers": "Search stickers",
  "panel.findAMarker": "Find a marker…",
  "panel.searchMarkers": "Search markers",
  "panel.couldnTRead": "Couldn't read that date — try “today”, “+7d”, or “next fri”.",
  "panel.textColour": "Text colour",
  "panel.fillColour": "Fill colour",
  "panel.branchConnectorColour": "Branch (connector) colour",
  "panel.topicLink": "Topic link",
  "panel.maxDepth": "Max depth",
  "panel.floatingTopics": "Floating topics",
  "panel.readingTime": "Reading time",
  "panel.distinctTags": "Distinct tags",
  "panel.distinctMarkers": "Distinct markers",
  "panel.thisWeek": "This week",
  "panel.fileOntoThe": "File onto the current map",
  "panel.openAMap": "Open a map to file onto",
  "panel.showingAll": "Showing all",
  "panel.saveAtLeast": "Save at least two versions to play the timeline",
  "panel.playTheMap": "Play the map's history as a timeline",
  "panel.cinematicZoomOn": "Cinematic zoom on — frames each branch (click for flat 100%)",
  "panel.cinematicZoomOff": "Cinematic zoom off — centres each topic (click to zoom each branch)",
  "panel.ruleValue": "Rule value",
  "panel.andConditionValue": "AND condition value",
  "panel.font": "Font…",
  "panel.sans": "Sans",
  "panel.serif": "Serif",
  "panel.mono": "Mono",
  // The JSX source wrote this as an HTML entity; the catalogue must hold the CHARACTER, because
  // `t()` returns a JS string and React renders it verbatim rather than decoding entities.
  "panel.markersTags": "Markers & tags",
  "panel.tasks": "Tasks",
  "panel.content": "Content",
  "panel.addASlide2": "Add a slide…",
  "panel.dueDate": "Due date",
  "panel.any": "Any",
  "panel.hasADate": "Has a date",
  "panel.overdue": "Overdue",
  "panel.due7Days": "Due ≤ 7 days",
  "panel.completion": "Completion",
  "panel.done": "Done",
  "panel.inProgress": "In progress",
  "panel.notDone": "Not done",
  "panel.hasRelationship": "Has relationship",
  "panel.anyOff": "Any / off",
  "panel.outgoing": "Outgoing →",
  "panel.incoming": "Incoming ←",
  "panel.either": "Either ↔",
  "panel.anyType": "Any type",
  "panel.savedFilters": "Saved filters",
  "panel.pickAMarker": "Pick a marker…",
  "panel.pickAPriority": "Pick a priority…",
  "panel.conditionalFormatting": "Conditional formatting",
  "panel.when": "When",
  "panel.and": "AND",
  "panel.marker": "Marker",
  "panel.noMarker": "No marker",
  "panel.namedStyles": "Named styles",
  "panel.stickers": "Stickers",
  "panel.noMarkers": "No markers",
  "panel.noMarkersOr": "No markers or tags in this map yet.",
  "panel.noRelationshipsOr": "No relationships or topic links in this map yet.",
  "panel.noOverdueOr": "No overdue or upcoming tasks.",
  "panel.noMapsMatch": "No maps match.",
  "panel.restoreDefaultDeck": "Restore default deck",
  "panel.extractMatchesTo": "Extract matches to a new map",
  "panel.saveAFilter": "Save a filter to reuse it across maps.",
  "panel.noSavedVersions":
    "No saved versions yet. Snapshots are captured automatically as you edit.",
  "panel.restoreThis": "Restore this",
  "panel.selectANode": "Select a node to see and edit its details.",
  "panel.clearFillImage": "Clear fill image",
  "panel.noTagsOn": "No tags on the selection",
  "panel.additionalLinks": "Additional links",
  "panel.selectATopic": "Select a topic to edit its note here.",
  "panel.selectANodeTo": "Select a node to add or edit its note.",
  "panel.noStickersMatch": "No stickers match.",
  // Panels — the interpolated labels. Named placeholders rather than concatenation, so a translator
  // controls word order; several are title/aria-label pairs for one control and stay two messages
  // because the visible tooltip and the screen-reader name say different amounts.
  "panel.applyPreset": "Apply preset {name}",
  "panel.renameTagNamed": "Rename tag {tag}",
  "panel.filterToMarker": 'Filter the map to topics with marker "{key}"',
  "panel.filterToTag": 'Filter the map to topics with tag "{key}"',
  "panel.filterByKindKey": "Filter by {kind} {key}",
  "panel.tagColourTitle": 'Colour for "{tag}" — tints every topic with this tag',
  "panel.tagColourLabel": "Colour for tag {tag}",
  "panel.clearTagColourTitle": 'Clear colour for "{tag}"',
  "panel.clearTagColourLabel": "Clear colour for tag {tag}",
  "panel.deleteTagTitle": 'Delete tag "{tag}" from every topic',
  "panel.deleteTagLabel": "Delete tag {tag}",
  "panel.removeTagNamed": 'Remove tag "{tag}"',
  "panel.moveSlideUp": "Move {name} up",
  "panel.moveSlideDown": "Move {name} down",
  "panel.speakerNoteFor": "Speaker note for {name}",
  "panel.setTaskPercent": "Set task to {n}% complete",
  "panel.removeAdditionalLink": "Remove additional link {link}",
  "panel.goToTopic": 'Go to "{topic}"',
  "panel.goToTopicInMap": 'Go to "{topic}" in {map}',
  "panel.addStickerTitle": "Add the {sticker} sticker to this node",
  "panel.addStickerLabel": "Add {sticker} sticker",
  "panel.toggleMarker": "Toggle {marker} on the selected topic(s) — or drag it onto any topic",
  // Two blocks of help text that prettier had wrapped across source lines. They are ONE message each —
  // rewriting only the tail would have left half the sentence hardcoded.
  "panel.autoSaveNote":
    "Auto-saves are throttled (~3 min); the last {n} are kept. Use “Save version now” to pin an important state.",
  "panel.conditionalStylesHelp":
    "Auto-style topics by tag, marker, completion, due date, priority, text, or attachment — and optionally auto-apply a marker or branch colour. Manual styling still wins.",

  "panel.tagOnAllSelected": '"{tag}" is on all selected topics — click to remove from all',
  "panel.tagOnSomeSelected": '"{tag}" is on some selected topics — click to add to all',
  // The menu TRIGGERS — the buttons that open each toolbar menu. A custom `triggerTitle` prop rather
  // than a DOM `title`, which is why the guard could not see them until it learned this codebase's own
  // prop names.
  "toolbar.trigger.export": "Export",
  "toolbar.trigger.more": "More",
  "toolbar.trigger.panels": "Panels",
  "toolbar.trigger.viewActions": "View actions",
  "toolbar.trigger.insert": "Insert",
  "toolbar.trigger.canvas": "Canvas",
  "toolbar.trigger.viewOptions": "View options & layout",
  "toolbar.trigger.optionsAria": "Options",
  // Confirm/prompt dialogs raised from App. Title, body and button copy are OBJECT PROPERTIES, which
  // the argument rule exempts so that shortcuts.ts can keep physical key names literal — that exemption
  // was hiding this whole class.
  "dialog.clearAllData.title": "Delete all local data?",
  "dialog.clearAllData.body":
    "Every map, its version history, and your preferences in this browser will be removed. This cannot be undone.",
  "dialog.clearAllData.confirm": "Delete everything",
  "dialog.deleteMap.title": "Delete this map?",
  "dialog.deleteMap.confirm": "Delete anyway",
  "dialog.nameView.title": "Name this view",
  "dialog.nameView.placeholder": "View name",
  "about.source": "Source",
  // --- Panels.tsx, second pass ---------------------------------------------------------------------
  // Everything here was invisible to the scanner until it learned three more shapes: this codebase's
  // own camelCase props, user-facing OBJECT properties, and JSX text whose opening tag ended on the
  // previous line. Panels.tsx scanned 0 while holding 55 of them.

  "panel.topicInfoSections": "Topic info sections",
  "panel.startDate": "Start date",

  // Flowchart shape palette — the tooltip names the shape AND its conventional meaning, which is the
  // part a translator must keep: the glyph is universal, the semantics are taught differently.
  "panel.shape.diamond": "Diamond (decision)",
  "panel.shape.oval": "Oval (start / end)",
  "panel.shape.parallelogram": "Parallelogram (input / output)",
  "panel.shape.hexagon": "Hexagon (preparation)",
  "panel.shape.cylinder": "Cylinder (data store)",
  "panel.shape.trapezoid": "Trapezoid (manual operation)",
  "panel.shape.octagon": "Octagon (stop / limit)",
  "panel.shape.document": "Document (report / output)",
  "panel.shape.callout": "Callout (speech / annotation)",
  "panel.shape.star": "Star (highlight)",
  "panel.shape.cloud": "Cloud (idea / external system)",

  // Topic inspector tabs — each is a label plus the tooltip explaining what the tab holds.
  "panel.tab.details": "Details",
  "panel.tab.detailsHint": "Markers, tags, progress, dates, priority, attachments & links",
  "panel.tab.notes": "Notes",
  "panel.tab.notesHint": "The selected topic's rich-text note",
  "panel.tab.style": "Style",
  "panel.tab.styleHint": "Shape, colour, font & stickers",

  // Note-editor insert dialogs
  "panel.insertImage": "Insert image",
  "panel.imageUrl": "Image URL",
  "panel.insertLink": "Insert link",
  "panel.linkUrl": "Link URL",

  // Rich-text toolbar. The KEY names in the tooltips (Ctrl+B) stay inside the message: a locale may
  // write the modifier differently, and splitting them would make the tooltip unassemblable.
  "panel.rt.bold": "Bold (Ctrl+B)",
  "panel.rt.italic": "Italic (Ctrl+I)",
  "panel.rt.strikethrough": "Strikethrough",
  "panel.rt.bulletList": "Bulleted list",
  "panel.rt.numberedList": "Numbered list",
  "panel.rt.h1": "H1",
  "panel.rt.h2": "H2",
  "panel.rt.h3": "H3",
  "panel.rt.table": "▦ Table",

  // Panel body copy and controls
  "panel.inboxEmpty": "Nothing unfiled. Jot ideas here, file them onto a map later.",
  "panel.toMap": "→ map",
  "panel.addRow": "+ Add",
  "panel.saveVersionNow": "＋ Save version now",
  "panel.playTimeline": "▶ Play timeline",
  "panel.not": "NOT",
  "panel.addAndCondition": "+ AND condition",
  "panel.addRule": "+ Add rule",
  "panel.mixed": "Mixed",
  "panel.suggested": "Suggested:",
  "panel.markersLabel": "Markers:",
} as const satisfies Catalogue;

export type CoreKey = keyof typeof CORE_EN;

registerMessages("en", CORE_EN);
