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
  "toolbar.alignLeft": "Align left",
  "toolbar.alignCentresHorizontal": "Align centres (horizontal)",
  "toolbar.alignRight": "Align right",
  "toolbar.alignTop": "Align top",
  "toolbar.alignMiddlesVertical": "Align middles (vertical)",
  "toolbar.alignBottom": "Align bottom",
  "toolbar.display": "Display",
  "toolbar.savedViews": "Saved views",
  "toolbar.stickyNoteAddedDragIt": "Sticky note added — drag it anywhere.",
  "toolbar.mapPartInsertUnderSelected": "Map part (insert under selected)",
  "toolbar.templateInsertStructureUnderSelected": "Template (insert structure under selected)",
  "toolbar.backgroundShapeFreeCanvas": "Background shape (free-canvas)",
  "toolbar.rollUpMirrorAnotherMap": "Roll-up (mirror another map)",
  "toolbar.bindRollUpSource": "Bind roll-up source",
  "toolbar.bindSourceMap": "Bind source map…",
  "toolbar.openTheMapPanelTo":
    "Open the Map panel to change theme, layout, design presets, background, connectors, fonts and backdrop",
  "toolbar.view": "View",
  "toolbar.layout": "Layout",
  "toolbar.bothSides": "Both sides",
  "toolbar.right": "Right",
  "toolbar.left": "Left",
  "toolbar.radialHub": "Radial / hub",
  "toolbar.orgChart": "Org chart ↓",
  "toolbar.orgChart2": "Org chart ↑",
  "toolbar.timeline": "Timeline",
  "toolbar.fishbone": "Fishbone",
  "toolbar.gridMatrix": "Grid / matrix",
  "toolbar.swimlane": "Swimlane",
  "toolbar.braceMap": "Brace map",
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
  "paste.title": "Paste text → topics",
  "paste.inputLabel": "Paste outline text",
  "paste.tags": "Tags",
  "paste.addUnder": 'Add under "{topic}"',
  "palette.placeholder": "Search commands…",
} as const satisfies Catalogue;

export type CoreKey = keyof typeof CORE_EN;

registerMessages("en", CORE_EN);
