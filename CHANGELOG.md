# Changelog

Notable changes to MindMap Studio. Loosely follows Keep a Changelog; pre-1.0 and
phase-based. Open work lives in `NEXT_STEPS.md`, not here.

## [Unreleased]

### Added

- **Spell-check toggle.** A toolbar toggle (and ⌘K) turns on the browser's native spell-check in the
  topic + note editors — **off by default** (no red squiggles in screenshots/exports), persisted when
  on. Threaded through the editing context (topics) and the note editors.

- **Isolate branch (collapse others).** **View ▸ Isolate branch** (and ⌘K) collapses every other top
  branch and reveals the path to the selected topic — a fast "focus on this line" that stays editable
  in place (unlike drill-in, which re-roots the view). New pure `isolateBranch` op.

- **Smart alignment guides (free layout).** Dragging a topic in whiteboard/free-canvas mode now shows
  amber guide lines when its edges or centre line up with nearby topics, and the topic snaps into
  alignment on release — design-tool-style. Pure `computeSnap` (edges + centres, nearest within a
  threshold); guides drawn in flow space via React Flow's ViewportPortal.

- **Saved views.** Bookmark a perspective on a map — its **pan/zoom + drill-in target + active Power
  Filter** — and jump back to it from **View ▸ Saved views**. Persisted per map. New canvas
  `getViewport` / `setViewport` handle methods, a pure `addView` / `removeView` + a `useSavedViews`
  store.

- **Dockable note editor.** A **View ▸ Note editor (dockable)** panel (and ⌘K) puts the selected
  topic's note in a full-height rail editor — more room than the inspector's compact box — reusing the
  same rich note editor + draft pipeline. Handy for knowledge maps with long notes.

- **Auto-marker suggestions.** The inspector's Markers section now offers a **Suggested** row of marker
  chips inferred from the topic's text (e.g. "urgent" → ❗, "why…?" → ❓, "blocker/risk" → 🚩,
  "idea" → 💡) — click to apply, opt-in (only shows when something matches and isn't already on the
  topic). Pure `suggestMarkers` / `suggestNewMarkers`.

- **Group a selection in a boundary.** Beyond "group branch" (a subtree), **Insert ▸ Group selection
  (boundary)** (and ⌘K) now wraps any **2+ selected topics** in one filled boundary box — MindManager
  boundaries around an arbitrary set. New pure `groupNodes`, sharing an extracted `addBoundaryForNodes`
  core with `groupBranch`.

- **Quick task toggle (topic checkbox).** Hovering a topic now shows a checkbox on its left edge —
  click to cycle **not-a-task → to-do → done** (a checked box stays visible) — MindManager's task tick,
  without opening the inspector. Pure `cycleTaskProgress`; the existing progress pie still handles
  fine-grained steps. 

- **Map parts (insert a mini-structure).** A new **Insert ▸ Map part** group (and ⌘K) drops a
  ready-made labelled subtree under the selected topic — **SWOT**, **Pros & cons**, **5W1H**, or a
  **Meeting agenda** — MindManager's map parts. Pure `MAP_PARTS` builders grafted via the existing
  add-subtree path.

- **Copy map as a table (TSV).** A **Copy as table (TSV)** action (Export menu + ⌘K) puts the whole
  map on the clipboard as one row per topic — Topic · Depth · Note · Tags — for pasting straight into
  Excel / Google Sheets. The inverse of the paste-spreadsheet path, so the two round-trip. New pure
  `mapToRows` / `mapToTsv`.

- **Guided walk (presentation tour).** A new **Canvas ▸ Guided walk** (and ⌘K) steps through every
  topic in outline order with a spotlight (the focus dim) + auto-centre + the topic's note shown as
  speaker notes — a lightweight presentation between drill-in and full-screen Present. **←/→** step,
  **Esc** exits; a bottom bar shows position, title, and the note.

- **Drag-to-relate.** Hovering a topic now reveals a small grip on its right edge — drag it onto
  another topic to draw a relationship (cross-link) in one gesture, MindManager-style. The existing
  "Link to…" click flow still works; this just adds the faster drag path (React Flow loose-mode
  connections → the shared `addLink` op, so the link is identical).

- **Paste a spreadsheet selection as topics.** The **Paste text → topics** dialog now recognises a
  table copied from Excel / Google Sheets (or any TSV/CSV block): each **row becomes a topic**, extra
  columns become its **note** (labelled by the header row when present), and a **Tags** column becomes
  the topic's tags. Indented outlines and Markdown still route to the outline parser. New pure
  `parseTable` / `tableToForest` / `parsePaste`.

- **Map legend.** A new toolbar toggle adds an auto-generated **Legend** box (top-left) listing every
  marker, tag, and conditional-format rule in use with its meaning — MindManager's legend. It's drawn
  on the canvas *and* in the SVG/PNG/PDF export from one shared `buildLegend`, so screen == export. New
  `meta.legend` flag + `setLegend` op/handle.

- **Design gallery.** A new **Canvas ▸ Design** menu applies a coordinated one-click "look" — canvas
  theme + branch connector style together (Classic / Blueprint / Midnight / Sunrise / Diagram) —
  MindManager's Design tab. Pure `DESIGNS` data over the existing theme + connector controls (no new
  styling mechanism).

- **Power Filter: hide mode + extract to a new map.** The Power Filter can now **hide** non-matching
  topics (a clean spotlight) instead of only fading them, and **Extract matches to a new map** prunes
  the current matches (plus their ancestors, so the structure holds) into a fresh library map — leaving
  the original untouched. New pure `filterToDoc`; hide mode threads through to the canvas
  (`hideUnmatched`) and `buildFlowState`.

- **Image fill for topics.** A topic can be filled with a picture that covers the whole card (the
  Style tab's **Fill image…**), distinct from the side `image` — MindManager's "fill with image". The
  canvas paints it as a cover background with a readable text scrim; the SVG/PNG/PDF export draws a
  rounded-clipped cover `<image>` + scrim so canvas == export. New `NodeStyle.fillImage` (data URL,
  lossless in `.json`).

- **Marker groups (single-select sets).** Markers are now grouped like MindManager's Map Markers —
  **Priority** (1–9), **Status** (the colour dots), **Mood**, and **Vote** (👍/👎). A topic carries at
  most one marker per group, so picking another in the same group replaces it; markers outside a group
  still multi-toggle. Pure `markerGroupOf` / `toggleMarkerInList`, applied in `toggleIcon` (so bulk
  toggles inherit it).

- **Outline numbering schemes.** When numbering is shown you can switch between **decimal**
  (1, 1.1, 1.1.1) and the **legal outline** (I, I.A, I.A.1, I.A.1.a … cycling I/A/1/a/i by level) from
  the numbering control in the toolbar — MindManager's numbering options. The scheme is a per-map
  property (`meta.numberStyle`, lossless) shared by the canvas, the outline panel, and the inspector.

- **Word count & reading time.** The **Map statistics** panel now totals every topic title + note
  into a word count and an estimated reading time (~200 wpm); the inspector's facts line shows a
  per-topic "~N min read" for longer topics. Pure `countWords` + extended `mapStats`.

- **Map statistics panel.** A new **View ▸ Map statistics** panel (⌘K too) summarises the whole map
  at a glance — topic / leaf / depth counts, task health (tasks, completed %, **overdue**), and content
  tallies (notes, attachments, distinct tags & markers, relationships, boundaries). Numbers come from a
  pure `mapStats()` so they're unit-tested independently.

- **SmartRules-lite — more conditional-format triggers.** Conditional styles can now match **overdue**
  tasks, **priority ≤ N** (1=High), **topic text contains…**, and **has attachment** — alongside the
  existing tag / marker / completed triggers. Extends the pure `matchesRule` / `describeRule` core
  (so canvas == export) and the Styles panel's rule builder.

- **Tag autocomplete + map-wide tag manager.** The inspector's *Add a tag* box now suggests tags
  already used in the map (a `<datalist>`), so naming stays consistent. The **Markers & tags** panel
  becomes a manager for tags: **✎** renames a tag everywhere (rename to an existing name **merges**
  the two) and **✕** deletes it from every topic. New pure `renameTag` / `deleteTag` ops + `renameTag`
  / `deleteTag` on the canvas handle (normal undoable, autosaved edits).

- **Editable outline panel.** The outline rail is no longer read-only navigation: **double-click** a
  row to rename it inline, use the **◂ ▸** controls to promote / demote a topic (the same indent /
  outdent ops as Alt+Shift+←/→), and **drag a row** to restructure the map — drop it before, after, or
  onto another topic (the broad middle nests it as a child). New `moveInTree` op + pure
  `outlineDropWhere`; backed by id-addressed `renameNode` / `indentNode` / `moveOutlineNode` on the
  canvas handle so every change is a normal undoable, autosaved edit.

- **Branch-colour topic fills (tint & gradient).** The topic format bar gains two fill treatments
  derived from a topic's branch colour (or its explicit fill colour): a soft **tint** wash and a
  vertical **gradient** — MindManager's filled-topic look without picking exact colours. Pure
  `resolveTopicFill` resolver shared by the canvas node and the SVG exporter (a gradient emits a
  per-node `<linearGradient>` so canvas == export); the fill reverts the level-based default styling
  to a normal card so the chosen fill always shows.

- **Searchable marker library.** The inspector's marker bar gains a search box that finds markers by
  name, keyword or glyph (e.g. "done" → ✅, "warning" → ⚠️, "budget" → 💰) over a richer catalog
  (`MARKER_CATALOG`) — clear the box to fall back to the curated default palette. New markers are
  free to toggle and drag onto any topic like the existing ones.

- **Find highlights every match on the canvas.** Typing in the **Find** box now rings every matching
  topic (live, as you type), so you can see all hits at once; **Enter** still steps through them with
  the n/total counter. Clearing the box removes the highlights.

- **Keyboard restructuring.** Reorder a topic among its siblings with **Ctrl/⌘+Shift+↑/↓**, and
  promote/demote it with **Alt+Shift+←/→** — MindManager-style move-up/down + outdent/indent without
  the mouse. New `moveSibling` op (reusing the existing `indent`/`outdent`).
- **Paste an image onto a topic.** With a topic selected, **Ctrl/⌘+V** an image from the clipboard to
  set it as that topic's image (ignored while typing in a field/note, so text paste still works).

- **Align & distribute (free-canvas).** In whiteboard/freeform mode, select 2+ topics and align them
  to a shared edge or centre (left / centre / right / top / middle / bottom), or distribute 3+ evenly
  (horizontal / vertical) — view menu + ⌘K. Pure `alignNodes` / `distributeNodes` ops using measured
  node sizes.
- **Status bar.** A slim bar at the bottom of the canvas shows the visible topic count, the current
  selection size, and the live zoom % (complements the existing minimap + zoom controls).

- **Drill in (focus on topic).** Re-root the canvas at the selected topic so its subtree fills the
  view — MindManager's "focus on topic" (view menu / ⌘K "Drill into the selected topic"). A bar shows
  what you're drilled into with **Exit (Esc)**, and the breadcrumb becomes the drill navigator (click
  an ancestor to re-root there, the map root to exit). It's **fully editable** while drilled and
  **non-destructive**: it's a pure view transform (`viewDoc`) — every edit, undo, and autosave still
  operates on the whole map, so exiting restores the full map with all cross-links/boundaries intact.

- **Canvas breadcrumb bar.** When a topic is selected, a thin location bar above the canvas shows its
  path (Root › Branch › …); click any crumb to centre that ancestor — MindManager's breadcrumb,
  handy for navigating big maps. (The path was previously only in the inspector header.)

- **Drag markers onto topics.** The marker chips in the inspector are now draggable — drag one onto any
  topic on the canvas to toggle it there (the topic highlights as a drop target), MindManager's Map
  Markers gesture. Clicking a chip still toggles it on the current selection.

- **Inline rich-text mini-toolbar.** While editing a topic, a small floating **B / I / U + colour**
  bar appears above it (MindManager's inline format bar) — discoverable buttons for the formatting that
  was previously keyboard-only (Ctrl+B/I/U still work). Writes to the existing sanitised `topicRich`.
- **Hover-peek for notes & attachments.** Hovering a topic's 📝 indicator shows the note's text in a
  small card (read it without opening the inspector); the 📎 chip's tooltip now lists the attached file
  names. (Links already show their URL on hover.)

- **Format Painter + Auto-colour branches.** **Copy format** grabs the selected topic's style and
  **Paste format** applies it across the (multi-)selection in one undo step (view menu + ⌘K) — reuse a
  look without the save-a-named-style detour. **Auto-colour branches** repaints each top branch with a
  distinct colour from the theme palette (a one-click restyle). New `assignBranchColors` op +
  `copySelectedStyle`/`shuffleBranchColors` on the canvas handle.

- **Detail levels (expand the map to a depth).** A new **Detail level** group in the view menu (and
  ⌘K) — **Show level 1…5** — collapses everything below the chosen depth, so you can step a large map
  from a top-branch overview to full detail in one click (MindManager's detail-level control).
  Complements the existing Collapse-all / Expand-all. New `setExpandedToLevel` op + `walkTree` helper.

- **Richer MindManager `.mmap` import.** Opening a `.mmap` now recovers a lot more than the bare
  structure — all into existing model fields, so it shows on the canvas and survives a Save-as `.mmst`:
  - **Per-topic task info** — start/due dates, priority (`Prio1..5`→1..5), and progress
    (`TaskPercentage`→0..1). Previously detected-and-dropped with a warning; now imported (the
    inspector, Power Filter, and Kanban board already support these fields). Resources come across too.
  - **Full notes** — the complete `NotesXhtmlData` XHTML body (flattened to text), instead of only the
    truncated `PreviewPlainText`.
  - **User tags** — `TextLabels` import as node tags.
  - **Per-topic colour, font & shape** — explicit fill/line colour, font (family/size/bold/underline/
    colour), and geometric `SubTopicShape` (oval/hexagon/octagon) map to node style (ARGB alpha-first →
    `#rrggbb`; fully-transparent fills are left to the theme).
  - **Rich-text runs** — `Text>FontRange` bold/italic/underline/strike + per-run colour become inline
    rich text (`topicRich`), with the plain topic kept as the fallback.
  - **Embedded images & attachments** — `OneImage` / `AttachmentGroup` binaries (`mmarch://bin/…`) are
    inlined as data URLs (attachments recover their real name from `@FileName`; vector EMF/WMF images
    without a raster fallback are skipped with a warning).
  - **Relationship & boundary styling** — relationship colour/width/dash/arrowheads and boundary
    colour/shape/dash; plus **callouts** (`CalloutFloatingTopicShape`) and the **map background colour**.

  Still intentionally lossy (theme-only/inherited styling, summary brackets, EMF/WMF vector images, and
  the Gantt/resource-scheduling layer) — see `NEXT_STEPS.md`.

- **New worked example: "GTD Areas of Focus."** A filled-in map of David Allen's GTD **Horizon 2**
  (the 20,000-ft view) — standing roles/responsibilities (Professional / Personal / Community) rather
  than projects or next actions, with status markers and a note explaining how the horizon is used.
  Joins the existing "GTD natural planning" example in the **+ New… ▸ Examples** menu.

- **Work with maps as files on disk (`.mmst`).** Beyond the always-on IndexedDB library, a map can now
  be opened from and saved to a real file, like a desktop app: **Open file…** (Ctrl/⌘+O), **Save**
  (Ctrl/⌘+S — writes back to the bound file with no dialog), and **Save as…** (Ctrl/⌘+Shift+S), all in
  the **More ▸ File** menu and the ⌘K palette. Once a map is linked to a file, edits **autosave through
  to it** (debounced, and silently — a background write never pops a permission prompt), the window
  title shows the filename with a ● while the file is behind, and an unsaved-changes guard warns before
  you leave. The bound file handle is remembered (IndexedDB) so the link survives reloads. `.mmst` is
  MindMap Studio's native extension and holds the same lossless schema-v1 JSON as `.json` (so a `.mmst`
  imports anywhere a `.json` does, and vice-versa).
  - **Windows file association.** The PWA manifest now declares a `file_handlers` entry for `.mmst`
    plus `launch_handler: focus-existing`. On Chromium desktop (Chrome/Edge), an **installed** copy can
    be set as the default app for `.mmst`, so double-clicking one in Explorer opens it in the running
    app (handled via `window.launchQueue`).
  - **Graceful fallback.** Browsers without the File System Access API (Firefox/Safari, mobile) fall
    back to a plain download for Save and the existing import picker for Open; IndexedDB autosave is
    unchanged, so nothing is ever lost. New module `src/io/fileSystem.ts` (feature-detected) keeps the
    rest of the app oblivious to which path is live.
  - **Open MindManager `.mmap` files by double-click (import-only).** The manifest also registers
    `.mmap`/`.mmp` as file handlers, and `.mmap` is offered in the **Open file…** picker. Opening one
    runs the existing one-way `.mmap` importer (lossy by design — task/PM data, rich text, images, etc.
    are dropped, and the drops are listed in the import banner) and lands it as an ordinary **library**
    map. There is **no** save-back to `.mmap`; a banner + toast prompt you to **Save as… `.mmst`** to
    keep it as a file. (Chromium desktop only; Windows won't make the PWA the default for `.mmap` over
    an installed MindManager unless you opt in.)

### Removed

- **Retired the sheets / workbook feature.** Maps could be grouped into a workbook via a shared
  `meta.sheetGroup` and switched through an in-canvas sheet strip (**▦ + Sheet**, **⤓ Workbook**
  export). That's gone — each former sheet was already its own standalone map on disk, so they now
  appear as ordinary maps in the library with no data lost (only the grouping). This clears the way
  for the upcoming flat **one-tab-per-document** model.

### Fixed

- **A corrupt saved map no longer white-screens the app.** A map whose stored structure had drifted (a
  missing or non-array `children`, a non-object node) threw in the projector and blanked the whole
  editor — unrecoverable on the boot-restore path. Docs are now normalised to a projectable shape at
  every load/import boundary (IndexedDB read, `.json` open, library restore), so a damaged map renders
  salvaged (possibly empty) instead of crashing. A well-formed map passes through unchanged.

- **A render crash now shows a recovery panel, not a blank screen.** A top-level error boundary wraps the
  app: any uncaught UI error is caught and replaced with a friendly panel ("your maps are saved safely on
  this device") offering **Reload** and **Start fresh** (which clears the open-tab session + `?map=`
  deep-link to escape a map that crashes on every load), instead of tearing down the tree to a white
  screen. Inline-styled so it can't itself depend on whatever failed.

- **Reparenting works across the floating/tree boundary.** Dragging a *detached* (floating) topic onto
  the tree — or a tree topic onto a floating one — silently snapped back: `reparent` only searched the
  central tree, so it no-op'd whenever a floating topic was the drag source or target, even though the
  drop UI accepted it. It now moves the subtree correctly in both directions (and nests floating-under-
  floating), pruning an emptied floating list. Tree→tree behaviour is byte-identical.

- **Accessibility: ⌘K screen-reader support, readable secondary text, visible keyboard focus.** The ⌘K
  command palette now exposes the ARIA combobox/listbox pattern, so the highlighted command is announced
  as you arrow through it. The muted/faint secondary-text colours were darkened to meet WCAG AA contrast
  (they failed at ~2–3:1 on the light surfaces). And the primitive control button gained a
  `:focus-visible` ring, so keyboard focus is visible across the toolbar, dialogs and inspector.

- **Branch attach side follows the layout orientation.** A branch could enter a topic from *below* in
  a horizontally-oriented map: the fan axis was inferred from the children's spread, so a parent whose
  children carry tall subtrees was mis-read as vertical. The axis is now pinned to the layout's
  orientation (horizontal layouts attach left/right, org-charts top/bottom; radial/timeline still
  infer) — so a child connects on its parent-facing side. Shared by the canvas + SVG export.

- **Duplicate React key warning from the shortcuts cheat-sheet.** The always-mounted `ShortcutsDialog`
  keyed each row by its `action`, but one action ("Add a child topic") has two bindings (`Tab` and
  `Ctrl/⌘ + Enter`) — so every editor session flooded the console with "two children with the same
  key". Rows now key on keys + action.

### Security

- **Hardened the SVG export against colour-injection.** Every user-settable colour (boundary, summary,
  callout, backdrop, relationship and per-branch) now passes through the HTML-escaper before landing in
  a quoted SVG attribute — so a hand-edited or imported colour like `"/><script>…` can't break out of
  the attribute and inject markup into an exported file. Defense-in-depth on top of the export sanitiser;
  a no-op for real colours, so canvas == export is unchanged.

### Performance

- **Faster editing on large maps + a lighter entry bundle.** The canvas re-projection (`sync`, run on
  every edit) was O(N²) — a per-node linear scan for measured sizes (invoked many times per layout pass),
  repeated node-box computations, and an un-memoised size estimator; all three are now indexed/memoised,
  with identical geometry (canvas == export untouched). Separately, the Start screen and Presentation
  deck are now lazy-loaded, trimming the initial bundle ~11 kB gz.

### Added

- **Export to MindManager (`.mmap`).** The mirror of the `.mmap` importer — **Export → MindManager
  (`.mmap`)** (also in ⌘K) writes MindManager's own format carrying the topic tree, notes, hyperlinks,
  stock icons, relationships, boundaries, floating topics, and the **two-sided left/right arrangement**,
  so a map you built here can go back to a MindManager user. A map round-trips back into MindMap Studio
  losslessly for those fields (mapping verified by a `parseMmap(toMmap(doc))` round-trip + a real-file
  re-emit test). Project data (task scheduling/resources) is dropped, as on import. Deterministic and
  offline; dangerous hyperlinks are stripped on the way out.

- **Balance map + manual side control (two-sided layout).** Right-click a main branch in the **Both
  sides** layout and pick **Map side → Left / Right / Auto** to pin it to a half (or let it auto-balance);
  the other branches balance around any pins. **View ▾ → Balance map** (also ⌘K) clears every pin and
  redistributes the main branches evenly — MindManager's "Balance map", except the auto-balance now uses
  an optimal Longest-Processing-Time split (a size-5 branch among four size-1 branches lands 5/4, not 7/2).
  The pinned side is lossless in `.json`; canvas == export (one shared layout pass).

- **.mmap import keeps the two-sided arrangement.** A MindManager import now reads each main branch's
  left/right side from the sign of its topic offset (`CX`), so a two-sided MindManager map lands with its
  branches on the same sides they had there. A side is only read for a main branch — deeper topics' offsets
  are layout nudges, not sides — and any branch MindManager left unpinned falls back to auto-balance.

- **Obstacle-aware branch routing (safety net).** A tapered branch now bows around an unrelated topic
  box its straight path would otherwise pass behind — computed once per branch from the node boxes and
  mirrored in the SVG export (canvas == export). Conservative by construction: a branch is either fully
  cleared *or* left straight, never displaced while still crossing a box; only the organic ribbon honours
  it, and a clear branch is byte-identical to before. With the orientation-axis fix above, today's
  layouts rarely graze, so this is a dormant guard for denser maps rather than a constant transform.

- **Open documents as tabs.** Maps you open now appear as a **flat tab strip** under the toolbar —
  one tab per document, the active one underlined — replacing the old map dropdown's lone view.
  Opening a map (from the library, a cross-map link, or **+**) adds a tab; the **×** (or middle-click)
  closes it. The open set + active tab are **persisted**, so a reload reopens the whole workspace.

- **Lossless tab switching.** Switching back to a recently-used tab now keeps its **pan / zoom and
  undo-redo history** — the canvas session (viewport + history stacks) is stashed on switch-away and
  restored on return for the last few tabs (older ones reopen fit-to-view, fresh history). One-shot,
  so a version restore still starts clean.

- **Reorder tabs + shareable map links.** Drag a document tab to reorder it. The active map is now
  reflected in the URL as **`?map=<id>`** (so a map is bookmarkable / shareable), and opening a
  `?map=` link loads that map straight into the editor — even on a first visit.

- **Boundary shapes + styling.** A boundary can now be a **rounded rectangle, sharp rectangle,
  ellipse, scalloped cloud, or polygon** (its outline is real SVG geometry, not a CSS box), with a
  **soft gradient fill**, an optional **dashed / dotted** outline, and its title drawn as a **tab fused
  to the top edge** rather than a floating pill. Pick the shape + line style in the overlay inspector;
  both round-trip in `.json` and render identically on canvas and in every export.

- **Reshape relationship curves.** A relationship's arc now bows **perpendicular to its line** (rather
  than a fixed horizontal axis), so it leaves and enters both topics cleanly instead of looking pinned,
  and the relationship inspector gains a **Curve** control — **Auto / Straight / Bow ± ** — to route a
  link around clutter. The bow round-trips in `.json` and renders the same on canvas and in exports.
  (Per-link colour / width / dash now also round-trip, which they previously dropped.)

- **Connector options — style picker, per-branch colour, dashed branches.** A **Connectors** picker in
  the toolbar sets the whole map's branch style: **organic** (the tapered default), **curved**, **elbow**
  (right-angle), or **straight**. The node right-click menu adds a **branch colour** (recolours that
  branch *and its subtree* — overriding the auto palette) and a **branch line** style (solid / dashed /
  dotted). All render on the canvas and in every export, and round-trip losslessly in `.json`.

- **Flat vector marker icons (replacing emoji).** Topic markers (check, flag, star, priority dots,
  target, idea, …) now render as a crisp **flat icon set** at a fixed size in a tidy row above the
  title — **identical on every machine and in every export** — instead of OS colour emoji that vary by
  platform and rasterizer. Existing maps are unchanged (same marker keys) and the picker shows the new
  icons; an unrecognised imported glyph still falls back to its character.

- **Tighter, MindManager-style layout geometry.** Sibling spacing is now proportional to each topic's
  height (a tall image topic reserves room; one-line siblings pack tight) instead of every row being
  as tall as the biggest node in the map; each branch's columns hang just past its **own** parent, so
  a long label only pushes its own descendants out rather than a whole global column across unrelated
  branches; and the **fishbone** (Ishikawa) layout draws true diagonal bones with sub-causes stepping
  outward along the bone instead of stacking straight down.

- **Floating topics get real branch colours, and relationship arrows scale with line weight.** A
  floating (detached) topic and its branches now cycle the palette like a normal coloured mini-map
  instead of a washed-out grey, and a relationship's arrowhead grows with its line thickness so a thick
  link reads in proportion — on canvas and in every export.

- **Topics now read as a hierarchy, MindManager-style.** The map's depth is legible from shape alone:
  the **central topic** is larger, bold, and centred; **main (level-1) topics are filled** with their
  branch colour (white/auto-contrast text) instead of a thin outline; mid topics keep the bordered
  white card; and **deep (level-3+) leaves drop the box** for the text on a short branch-colour
  underline. **Type shrinks with depth** (root → main → sub → leaf) and **wrapped labels centre**
  within their box, so the structure is legible at a glance. A manual style (a set fill or border)
  always wins and reverts a topic to a normal card. Identical on canvas and in every image / PDF /
  HTML export.

- **Org-chart layouts draw right-angle elbow connectors.** In the Org-chart (down / up) layouts a
  parent now connects to its children with clean uniform right-angle "bus" elbows — the formal
  hierarchy look — instead of the organic tapered trunk (which stays for the mind-map / radial
  layouts). Per-branch layout overrides are honoured, and floating subtrees stay organic.

- **Inline task-info line on topics.** A topic with task scheduling now shows a compact muted line
  (**▶ start · duration · @resources**) beneath the title, surfacing the start date, duration, and
  assigned resources the canvas previously dropped — on canvas and in exports.

- **Organic branch connectors (MindManager-style).** A parent's child branches now spring from a
  **single point** on the side its children sit — one chunky trunk that fans out, tapering to a fine
  tip at each child, **entering each child at its near end** and tucking under both boxes so the line
  **always connects** (no more crossings or gaps). The origin side adapts to the layout (3 o'clock for
  right-growing, 9 for left, 6/12 for org charts, nearest-side for radial), and the centre topic fans
  from a left **and** a right origin. The whole thing is one shared geometry, so the canvas and every
  image / PDF / HTML export stay byte-identical.

- **Examples gallery on the Start screen.** The Start screen now has an **Examples** section (in the
  sidebar, in its ⌘K palette as "Browse examples", and as a featured row on the home view) listing all
  the worked example maps — the **same set as the editor's New-map gallery** — so you can browse and
  open them before you're even in a map. Templates were already there; examples now match.

- **Add topics without the keyboard — hover ＋ and a starter coachmark.** Every topic now shows a
  small **＋** on hover or selection: one adds a **child**, one adds a **sibling**, each dropping
  straight into editing. A fresh map shows a one-time hint under the root (**Tab** = child ·
  **Enter** = sibling · double-click to rename), and topics lift on hover with a "Double-click to
  edit" cue so they read as editable.

- **Direct-manipulation canvas.** **Drag the background to pan**, **scroll / ⌘-scroll to zoom**, and
  **double-click an empty spot** to drop a new floating topic — the +/−/fit controls stay. Off-screen
  branches are now reachable without the buttons (hold **Shift** and drag to rubber-band a selection).

- **Drag-to-reparent shows where it lands.** While you drag a topic onto another, the target lights up
  with a **"↳ Make child of X"** label, so the new structure is obvious before you let go; dropping on
  empty space snaps it back.

- **Richer right-click menu.** The node context menu now also offers **Add note**, an inline **marker**
  row and a **priority** picker (High / Med / Low / clear) alongside add / rename / link / delete —
  every common single-topic action one click away, fully keyboard-drivable. *(Also fixes a duplicate
  React key when a branch carrying a callout was copy-pasted.)*

- **⌘K can do anything.** The command palette now also **jumps to any topic** (fuzzy over the topic
  text **and** its note), runs **selection-scoped actions** (add child, set marker / priority, delete)
  when a topic is selected, and keeps a small **Recent** list.

- **Undo / Redo in the toolbar.** Row 1 has **Undo** and **Redo** buttons that enable / disable with
  the history depth and show a brief toast — no keyboard required.

- **Delete is instant and undoable — no blocking "Are you sure?".** Deleting a topic (and its branch)
  or a whole map happens immediately and shows a **"… deleted — Undo"** toast wired to undo.

- **Note + markers lead the inspector.** The Topic-info **Details** tab now opens with a one-click
  **note** field and the **marker** row at the top (the separate Notes tab is folded in); **Style**
  stays the secondary tab. With nothing selected the inspector shows the **map** panel + "Select a
  topic to edit it" — never blank or stale.

- **Clearer toolbar + a keyboard cheat-sheet.** The view controls (Fit / Collapse all / Expand all /
  Focus) fold into one labelled **View ▾** menu, and the **?** button (and ⌘K → "Keyboard shortcuts")
  opens a **shortcuts cheat-sheet** grouped by Editing / Navigation / View — sourced from one central
  map so tooltips and the sheet can't drift; common right-click rows show their key hint.

- **First-run tips.** A brand-new user sees a one-time **"3 things to try"** card (rename a topic ·
  **Tab** for a child · **⌘K** for anything); it disappears after the first edit and never nags again.

- **Type to edit a topic.** With a topic selected, just **start typing** — the topic opens for editing
  with your first keystroke replacing the old text (caret at the end, so you keep typing straight on).
  Matches MindManager. **F2** and **double-click** still edit in place starting from the existing text
  (all selected), and modifier shortcuts (Ctrl/⌘/Alt) are untouched.

- **Ctrl+Enter adds a child topic.** With a topic selected, **Ctrl/⌘+Enter** now adds a **child**
  (plain Enter still adds a sibling, Tab also adds a child). *(Fixes the keyboard help, which wrongly
  listed Ctrl+Enter as "add a parent".)* *(The brief confirm-before-deleting-a-branch prompt added
  this cycle is superseded by the instant + Undo-toast delete below.)*

- **Command palette in the editor (⌘K / Ctrl-K).** Press **⌘K** anywhere in the editor to fuzzy-search
  and run any toolbar action — present, export to any format, toggle a panel, switch layout, fit,
  group a branch, and more — without hunting through menus. Selection-only actions (Focus / Group /
  Summary) appear only when a topic is selected. (The Start screen's ⌘K is unchanged; both now share
  one palette.)

- **Keyboard-accessible menus + bottom sheets on phones.** Every toolbar dropdown and the canvas
  right-click menu is now a proper WAI-ARIA menu: open with the mouse or **↓**, move with
  **↑ ↓ Home End**, run with **Enter**, close with **Esc** (focus returns to where you were). Menus
  flip / slide to stay on-screen near an edge, and on phone widths they open as a full-width **bottom
  sheet**. The two toolbar rows are also grouped into clearer clusters. (No actions changed — same
  buttons, same results.)

- **Per-overlay colours.** Recolour any individual **boundary**, **summary** bracket, or **callout**
  bubble from its inspector (a swatch row + **Default** to reset), and the map's diagram **backdrop**
  from the Map panel. The picked colour re-tints the whole object coherently — stroke, fill tint, and
  label chip — on the canvas **and** in every image / PDF / HTML export (one shared resolver, so the
  canvas and export stay byte-identical). Colours are saved losslessly in the `.json`; an uncoloured
  overlay keeps the default accent.

- **Click a boundary, summary or callout to edit it.** Overlay objects are now selectable: click a
  **boundary** (its rim or label), a **summary** bracket's label, or a **callout** bubble and the
  inspector becomes an editor for it — rename / retext it and **delete** it — with a highlight on the
  selected overlay. The existing inline gestures still work (double-click a callout / summary to edit
  in place). Boundaries can now be labelled too. Selecting an overlay, a node, or a relationship are
  mutually exclusive.

- **Bulk markers + tags (tri-state).** Select several topics and the inspector now shows their
  **markers** and **tags** with a third state: **lit** = on every selected topic, a **dashed “+”
  chip** = on only some. Clicking adds a marker/tag to the whole selection — or, if every selected
  topic already has it, removes it from all — in a single undo step. (Single-topic editing is
  unchanged.)

- **Per-node timestamps.** Every topic now tracks when it was **created** and **last edited**; both
  show in the inspector's quick-facts line (e.g. *created 2h ago · modified just now*) and are saved
  losslessly in the `.json`. Editing a topic's content (text, note, style, task, tags, markers,
  links, …) updates *modified*; pure restructuring (moving/collapsing) doesn't. They're never drawn
  on the canvas or in image / PDF exports.

- **Diagram-backdrop controls in the inspector.** When the map has an onion / funnel / Venn
  backdrop, the Map panel shows a **Backdrop** section — add or remove a **ring / stage** (onion &
  funnel), set its **colour**, and **Remove** the backdrop — so you can adjust it without opening the
  toolbar's Canvas menu.

- **Map properties in the inspector.** With nothing selected, the right panel is now an editable
  **Map** panel (not just read-only stats): rename the map inline, and set its **theme**, **layout**,
  **background colour / image**, and **line-jumps** right there — the same settings as the toolbar's
  Canvas menu, in one place — above the existing topics / branches / task-progress overview. The
  controls re-theme with the chrome so they stay legible in Dark / Ocean / Sunset.

- **Relationship inspector — style your connectors.** Click a relationship (cross-link) arrow and the
  right panel becomes a dedicated editor: rename its **label**, set its **direction / arrowheads**
  (at the target, the source, both ends, or none), pick a **colour**, **width** (thin / medium /
  thick) and **line style** (dashed / solid / dotted), or **delete** it. The selected relationship
  shows a highlight halo on the canvas, and node vs. relationship selection are mutually exclusive.
  Styling is **lossless in `.json`** and carried into every image / PDF / HTML export (the canvas and
  the export resolve it through one shared helper, so they always match); existing relationships keep
  their original single-arrow dashed look until you change them.

- **"Linked from" backlinks in the inspector.** The Details tab now lists every topic that points
  *at* the selected one — via a **topic-jump link** (`↪`) or an incoming **relationship** edge (`↬`,
  with its label) — and each is a one-click jump that selects and centres that source topic. It
  appears only when something actually links in, complementing the existing outgoing **Links**
  section (so you can navigate a map's connections in both directions).

- **Bulk edit shows "Mixed" instead of one topic's value.** When several selected topics disagree on
  a task field — **progress, dates, or priority** — the inspector now leaves that control blank and
  tags it *Mixed*, rather than silently showing (and, on the next edit, overwriting everything with)
  the anchor topic's value. Fields the selection already agrees on still show their shared value, and
  setting a control applies it to the whole selection in one undo step as before. The "Mixed" state
  clears the moment you set the field. Single-topic editing is unchanged.

- **Resizable inspector + a header breadcrumb & quick-facts.** Drag the inspector's left edge to
  resize it (or nudge with the arrow keys when focused); the width is clamped and **persists** across
  reloads. The header now shows the selected topic's **breadcrumb** (Root › Branch …) and a small
  facts line — outline number, depth, child count, and the note's word/char count. The no-selection
  map panel honours the same persisted width.

- **Click a topic's 📝 to jump to its note** — the on-canvas note indicator is now a button: clicking
  it selects the topic and opens the inspector straight to its **Notes** tab (re-opening the inspector
  if it was closed or minimized). The 📝 still appears only when a topic actually has a note.

- **Multi-select + bulk editing** — select several topics at once (**Shift/Ctrl/⌘-click** to extend,
  or **drag a box** on the empty canvas) and change them together from the inspector: **shape, fill,
  border, font/bold, progress, dates and priority** apply across the whole selection in a single undo
  step. The inspector shows an *"N topics selected"* banner and hides the per-item editors (notes,
  markers, tags, stickers, attachments, links) — those stay single-topic. A plain click (or any
  structural edit) collapses back to one. Because the canvas now rubber-band-selects on left-drag,
  **panning moves to the middle/right mouse button** (scroll still zooms). Built on an anchor + a
  selection set, so existing single-topic keyboard / popover / linking behaviour is unchanged.

- **Minimize / restore the topic inspector** — the right-hand inspector can now collapse to a thin
  strip on the canvas edge (the header's **›** button) and re-expand from that strip's ℹ button,
  reclaiming canvas width without losing the panel. Minimizing is **sticky**: selecting other nodes
  won't pop it back open (re-expanding always shows the currently-selected node). The state persists
  across reloads, and the toolbar's **Topic info** toggle still fully shows/hides it. The no-selection
  map overview can be minimized the same way.

- **WYSIWYG note editor** — the Topic-info **Notes** tab is now a what-you-see-is-what-you-get rich
  editor instead of a raw-markdown textarea with an Edit/Preview toggle: a formatting toolbar
  (**bold**, *italic*, ~~strikethrough~~, bulleted list, numbered list) and inline formatting as you
  type, filling the inspector's full height. Under the hood the note is still stored as the same
  **markdown string** — the editor serialises its HTML to/from markdown on every edit (a
  `contentEditable` div + a small, unit-tested HTML↔markdown round-trip), so every export (JSON /
  docx / FreeMind / interactive-HTML), cross-map search, the presenter view and the 📝 outline
  indicator keep working unchanged. `renderNote` gained strikethrough + numbered-list support (it
  already did bold / italic / code / headings / bullets / links). **0 new dependencies.**

- **Tabbed topic inspector** — the right-hand **Topic info** panel now groups a topic's editors into
  three tabs — **Details** (tags, progress, dates, priority, attachments & links), **Style** (shape /
  fill / border / font bar, markers, stickers) and **Notes** (the Markdown editor) — instead of one
  long scroll. Built on a new reusable `Tabs` primitive (a `role="tablist"` segmented control, the
  start-screen tab pattern shared into `design/primitives`). Pure regroup: every field and handler is
  unchanged, the panel's props/API are untouched, and the canvas/exports are unaffected.

- **Inline node popover (redesign phase 2, complete)** — selecting a topic now shows a small
  quick-action toolbar floating just above it (via React Flow's `NodeToolbar`, so it tracks the node
  through pan/zoom): **Add child**, **Add sibling**, **Rename**, **Collapse/expand**, **Delete** —
  sibling/delete hidden on the root, collapse only when the node has children. It calls the exact same
  internal handlers as the keyboard shortcuts and the right-click menu (no new model surface), and
  hides while a node is being inline-edited. This completes the editor redesign (chrome + canvas).

- **Canvas palette → brand (redesign phase 2, start)** — the default **Light** and **Dark** canvas
  themes are retuned to the warm-cream + **emerald** brand language: emerald **root** node and the
  warm support branch palette (amber / blue / emerald / magenta / olive / violet) shared with the
  chrome, replacing the old indigo-root + MindManager-red palette. Because `exportSvg` is handed the
  same palette + cssVars as the live canvas, every PNG / SVG / PDF / Office export stays
  byte-faithful (**canvas == export** — verified: the exported SVG carries the emerald root and warm
  branch colours, no stale palette). Ocean / Sunset themes are unchanged. **Node cards** are also
  detailed to match the mock — the root is a rounded **card** (radius 14, not a pill) with a soft
  emerald elevation, branch/leaf cards get a lighter 1.5px branch border + warm shadow and a tighter
  radius (11) — with the radii and border mirrored in `exportSvg.ts` so the screen and exports stay
  identical (verified: root rx 14 = canvas 14px, branch rx 11 = canvas 11px, border 1.5 = 1.5).
  A **branded selection ring** (the node's branch colour, emerald for the root, + a soft glow)
  replaces React Flow's faint default — canvas-only, so no export impact. The priority / progress /
  due badges and tapered branch ribbons already matched the mock. (The inline contextual popover —
  which needs new add-child/delete canvas handles — is a deferred, separately-scoped increment.)

- **Editor chrome redesign (phase 1 of 2)** — the editor adopts the warm-cream + emerald visual
  language already shipped on the Start screen. A new **56px icon rail** (brand → Start, find, insert
  image, paste, about) sits beside a **two-row top bar**: row 1 is file/identity (Start, map switcher,
  **+ New**, **All maps**, find/replace, **Export**, **More**), row 2 is view/edit/canvas grouped into
  labelled dropdown menus (**Panels**, **Insert**, **Canvas**) plus the structure cluster, layout
  picker, quick-add and the brainstorm timer. The chrome is **theme-reactive** — surfaces and ink
  track the active canvas theme (Light / Dark / Ocean / Sunset) via `editorThemeVars()` → `--ed-*`
  custom properties, mirroring the Start screen's `--st-*` system, with a fixed emerald accent. Every
  control the previous toolbar had was **re-homed, not removed** (all 16 export formats, all 10
  layouts, all 7 side panels, backdrops, roll-ups, group/summary/sticky-note, free layout, line-jumps,
  numbering, focus, sheets, backup, copy-outline, import). The **Topic inspector** moves to a
  **right-side panel** that **auto-opens when a node is selected** and shows a **map overview**
  (topics / branches / task progress) when nothing is — and the side panels (Outline / Filter /
  Styles / History / Index / Info) are retuned to the same warm-cream + emerald palette. The canvas
  renderer is unchanged (its restyle is phase 2). No web fonts are loaded (offline-first); the mono
  stack prefers JetBrains Mono if installed.
- **Line-jumps on crossing connectors** — a per-map **⌒ Line jumps** toolbar toggle (off by default,
  stored as `meta.lineJumps`, lossless in `.json`). When on, wherever two **relationship** arrows
  cross, exactly **one** of them draws a small semicircular **hop** over the other — so a busy concept
  map reads as lines *passing over*, not joining (the MindManager convention). The hopper is chosen
  deterministically (one bump per crossing, never two), crossings are detected on each relationship's
  straight endpoint **chord**, and a line crossed several times gets a hop at each crossing in order.
  The hop geometry comes from one shared pure helper (`flow/lineJumps.ts`) used by **both** the live
  canvas relationship edge and the SVG exporter, so the same crossings produce the same hops on screen
  and in every PNG / SVG / PDF / HTML export (canvas == export).
- **Presenter view (map + slides)** — the **▶ Present** overlay gains a **Presenter view** toggle (a
  button in the control bar, or press **P**) that opens a presenter sidebar beside the live slide
  without changing what the audience sees. The sidebar shows three things: the current branch's
  **speaker notes** (its `note`, rendered as Markdown through the same safe note renderer — escaped,
  no XSS — with a muted "No notes for this slide." when empty), a **Next up** peek at the next slide's
  heading (or "End of map" on the last slide), and an **Agenda** — a compact list of every slide (the
  overview plus each branch) with a **3 / 8**-style position indicator, the current slide highlighted,
  and **click-to-jump** to any slide. Single-screen by design (no second-monitor popup); the toggle is
  presenter-only chrome and defaults off each session.
- **Sticker / illustration library** — the **ℹ Info** panel gains a built-in **Stickers** grid: 20
  curated, single-accent inline-SVG glyphs (star, heart, check / cross badge, flag, idea, warning,
  info, speech bubble, thumbs up / down, target, rocket, lock, key, clock, pin, fire, question,
  arrow) you can drop on the selected node without supplying your own file. Picking one sets that
  node's **image** to the sticker's data URL, so it reuses the existing node-image pipeline — it
  paints on the canvas and carries into every SVG / PNG / PDF / HTML export (canvas == export) and is
  lossless in `.json`.
- **Interactive HTML export** — a new **.html (interactive)** option saves the whole map as a single
  self-contained file you can email or open locally: a **collapsible, searchable outline** with an
  inlined vanilla-JS runtime (no app, no backend, no CDN — fully offline). Click a topic (or its ▾
  toggle) to fold a branch, **Expand all / Collapse all**, type in the **filter** box to highlight and
  narrow to matching topics, and **Ctrl/⌘ + scroll** to zoom / drag to pan. Notes render inline; topic
  text and the embedded tree JSON are escaped, so a map can't inject script. Unlike the existing
  **.html (standalone)** (an embedded SVG picture), this one is *navigable*.
- **Larger node-shape vocabulary** — the **Shape** picker adds six more vector shapes: **trapezoid**
  (manual operation), **octagon** (stop / limit), **document** (a page with a wavy bottom edge),
  **callout** (a rounded speech bubble), **star** (highlight), and **cloud** (idea / external system).
  Like the existing diamond / oval / hexagon / cylinder, each is drawn from the one shared path builder,
  so it looks identical on the canvas, in the picker icon, and in the SVG / PNG / PDF / Office exports
  (canvas == export); concave shapes (star, cloud, document, callout) inset their text so labels stay
  inside the outline.
- **Per-map canvas background image** — the **Canvas** control gains a **🖼** picker: choose an image
  and it fills the canvas behind every topic (on top of the background colour), downscaled and stored
  inline so the map stays offline + portable. It's saved with the map and carries into the
  SVG / PNG / PDF / HTML exports (canvas == export); the **✕** removes it.
- **Version-history timeline playback** — the **🕔 History** panel gains a **▶ Play timeline**
  button: step, scrub, or auto-play through a map's saved snapshots and watch it evolve on the
  canvas (read-only), then **Restore this** at any frame, or **Exit** (Esc) back to the live map.
- **Per-topic font family** — the **🎨 Styles** bar gains a **Font** picker (Sans / Serif / Mono);
  it applies to the selected topic and carries into the SVG / PNG / PDF / Office exports.
- **TextBundle / TextPack import** — open a `.textpack` (Bear, Ulysses, iA Writer) and its Markdown
  (`text.md`) becomes a map via the Markdown importer.
- **Automated multi-map roll-ups** — bind a node to another library map with **⤵ Roll-up**, then
  **🔄 Roll-ups** pulls that map's branches in as the node's children (a re-id'd mirror, refreshed on
  demand). One map can aggregate several others — the automated cousin of cross-map branch paste.
- **Mobile-friendly layout** — on phone-width screens the editor toolbar becomes a single compact,
  swipeable strip (instead of a wall of wrapped rows), so the canvas fills the screen; the side
  panels (Outline, Info, Filter, …) open as **bottom sheets** over a full-width canvas instead of
  squeezing it; and the start screen's side rail folds into a top nav with full-width content. The
  PWA is now genuinely usable on a phone.
- **Cross-map branch copy/paste** — right-click a branch → **Copy branch**, then right-click any node
  in *any* map → **Paste branch here** (it grafts a re-id'd copy as a child, or drops it in as a
  floating topic when there's no tree parent). The clipboard lives in the browser, so it survives
  switching maps — move a branch from one map into another, or assemble a roll-up by pasting branches
  from several maps into one.
- **Sticky-note topics** — **🗒 Note** drops a free-floating amber note onto the canvas; it's a
  floating topic underneath, so it edits, drags (in free-canvas mode), exports, and round-trips like
  any other topic.
- **Start screen** — a dedicated home that opens when no map is showing (and any time via **⌂ Start**
  in the toolbar). A left rail navigates **Start / All maps / Recent / Templates / Layouts / Import /
  Learn / About**; the hero captures a new map three ways (type a topic, paste an outline, or a blank
  canvas), **Recent** groups your maps by last-edited (Today / Yesterday / Earlier), and **Templates**
  lists every starter with a thumbnail and **computed** node count + branch pills. **⌘K** opens a
  command palette over maps and actions. Theme-aware (Light / Dark / Ocean / Sunset) and fully local
  — the editor canvas is untouched.
- **Multiple sheets per file** — group several maps as **sheets** of one workbook. **▦ + Sheet**
  turns the current map into a workbook and adds a sheet; a **sheet tab strip** appears above the
  canvas to switch between them, and **⤓ Workbook** exports all the sheets to a single `.json`
  (re-importing keeps them grouped). Each sheet is a full map — its own layout, history, and export.
- **Per-branch layout** — right-click a branch → **Branch layout** to lay out just that subtree with
  a different layout (e.g. an org-chart branch inside a radial map). The override subtree is sized as
  one blob in the main pass so it doesn't collide with its siblings, and nested overrides compose.
  Stored on the node, lossless in `.json`; the export matches the screen.
- **Diagram backdrops — Funnel + Venn** — the **◎ Diagram** builder now also draws a **funnel**
  (stacked stages narrowing to a conversion; **−/+** changes the stage count) and **Venn** frames
  (**2** or **3** overlapping circles). Like the onion, they're pure geometry shared by the canvas
  and the image export, and topics drop into the regions. **Funnel** and **Venn (3 circles)** examples
  ship in **+ New…**. This completes the dedicated diagram builders (onion / funnel / Venn).
- **Diagram backdrops — Onion** — a new **◎ Diagram** builder draws a geometric **backdrop** behind
  your topics and switches to free-canvas mode so you drop topics into its regions. First up: the
  **onion** (concentric rings) for stakeholder maps and layered models — use **−/+** to change the
  ring count and **✕ Backdrop** to remove it. The frame is pure geometry shared by the canvas and the
  image export (canvas == export); region labels are just topics you place on each ring. An **Onion
  diagram** example ships in **+ New…**.
- **Brace map layout** — a new **Brace map** layout (under *Diagram*) lays the map as a left-to-right
  tree where each parent joins its children with a **`{` fork brace** — the Thinking-Maps part-whole
  diagram — instead of the tapered branches. The forks are drawn from one geometry shared by the
  canvas and the image export (canvas == export).
- **Free-canvas (whiteboard) mode** — a **🧲 Free layout** toggle turns any map into a free canvas:
  drag topics **anywhere** and they stay put (the auto-layout pauses). Combined with node shapes and
  directional arrows, this gives place-anywhere **flowcharts**, **concept maps**, and **whiteboards**.
  Enabling **seeds each node's position from where it already sits** (a seamless switch); disabling
  returns to the auto-layout and **keeps the positions**, so you can flip back and forth. Positions
  live on the node (`pos`), lossless in `.json`. A new **Whiteboard (free layout)** example ships in
  **+ New… → Examples**.
- **Diagram starter templates** — two new entries in **+ New… → Examples** showcase the new
  structures: a **Flowchart** (node shapes mark step types — oval start/end, diamond decision,
  parallelogram I/O — with directional links labelling the branches) and a **Concept map** (ideas
  linked across branches by labelled, directional arrows, built around the water cycle). Open one to
  explore the shapes + arrows, or use it as a starting point.
- **Grid / matrix layout** — a new layout (under **Diagram** in the layout picker) that **tiles the
  root's first-level branches into a grid** — four branches become a **2×2**, the shape of a SWOT,
  Eisenhower, or any matrix frame. Each branch keeps its own subtree laid out beneath it, with the
  root as a title centred above. Like the other layouts it's a pure view (the model is untouched) and
  persists per session.
- **Directional relationships** — relationship arrows now carry a **filled arrowhead at the target**,
  so a link reads as flow (the flowchart / concept-map connector). The arrowhead is built from one
  shared path helper used by the canvas edge **and** the image export, so the direction shows on
  screen and in exports alike. No model change — every existing and imported relationship gains it.
- **Node shapes (flowchart vocabulary)** — the **Shape** row in the style bar now offers, beyond
  box / rounded / pill, five true geometric shapes: **diamond** (decision), **oval** (start/end),
  **parallelogram** (input/output), **hexagon** (preparation), and **cylinder** (data store). They're
  painted from one shared SVG path builder used by the canvas, the image export, **and** the picker
  icons — so the screen, the export, and the button always match (the canvas == export invariant).
  Text gets per-shape padding so it stays inside the narrowing outline. Stored on `style.shape`,
  lossless in `.json`. The foundation for flowcharts and concept maps.
- **Summary topics** — select a branch and **⊐ Summary** (or right-click → *Summarize branch*) draws
  a labelled **bracket** beside it (the classic MindManager summary). The bracket auto-sizes to the
  branch and sits on the correct side (left-branch → `[` on the left, right-branch → `]` on the
  right); **double-click its label** to rename (or empty it to remove). Summaries persist with the
  map and are drawn into image exports. The last of the renderer-era structural gaps.
- **More import formats — MindMup (`.mup`) and Markmap.** MindMup's JSON tree imports (rank-ordered
  children, notes, links — dangerous schemes dropped). Markmap files are Markdown, so they import via
  **Open files** (`.md`), stripping any `---` frontmatter (its `title:` becomes the map title). As part
  of this, **Markdown import now understands multi-level headings** (`#` / `##` / `###`) with bullets
  nested under them — so heading-structured outlines (and Markmap maps) import with their full
  hierarchy, not just a flat bullet list. (Schema-verified against the documented formats, not yet
  against real app exports — same caveat as `.smmx`/`.mind`.)
- **Task priority** — set a topic's priority (**High / Med / Low**) in the **ℹ Info** panel; a small
  coloured chip shows on the node, and the **🎚 Power Filter** can filter by priority. Distinct from
  the emoji priority markers in that it's a structured, filterable value. Stored on `task.priority`.
- **Styles organizer** — in the **🎨 Styles** panel, save the selected topic's look as a **named
  style** and reuse it on any topic with one click. Presets persist locally and travel between maps.
- **Conditional formatting** — a **🎨 Styles** panel where you set rules that **auto-style topics**
  by **tag**, **marker**, or **completion** (e.g. *completed → green*, *#risk → red border*). Rules
  are a **view-only overlay** layered *under* a topic's own styling (manual styling always wins), so
  nothing is baked into the model; they're per-map, lossless in `.json`, and carried into image
  exports.
- **Board view (Kanban)** — a new **▦ Board** toggle shows your topics grouped into **columns by tag**
  (a read-only visualisation of the same map — cards don't move or write back). Each card carries its
  rolled-up **progress pie** and **due date** (red when overdue); **click a card to jump** to that
  topic on the canvas. Untagged topics gather in a final column. A fast status wall over a tagged map.
- **File attachments on topics** — attach any file to a topic from the **ℹ Info** panel; a **📎 chip**
  shows on the node and the panel lists each file with its size, a one-click **download**, and a
  remove (✕). Files are stored inline (a data URL, capped at 5 MB each) so they travel with the
  map — lossless in `.json`, fully offline, ignored by flat exports.
- **Faster capture** — three quick-input additions: a **Quick add** box in the header (type a topic,
  press Enter to add it under the selected node — or the central topic — keeping focus for rapid
  fire); **drop a link** (or text) from your browser onto the canvas to create a floating topic
  (URLs become a clickable link, dangerous schemes refused); and a **⏱ brainstorm timer** for
  timeboxing an idea sprint (3 / 5 / 10 / 15 min, with a clear "time's up").
- **Due & start dates on topics** — set a topic's **start** and **due** date in the **ℹ Info** panel
  and a **📅 date chip** appears on the node; it turns **red when overdue** (past due and not yet
  100%). The **🎚 Power Filter** gains a **Due date** option — *Has a date · Overdue · Due ≤ 7 days* —
  so you can dim everything except what needs attention (and save it as a preset). Dates show in image
  exports too and are lossless in `.json`. Together with task progress, that's the core of a topic's
  task info.
- **Task progress + roll-up** — mark a topic's completion (0 / 25 / 50 / 75 / 100%) from the **ℹ Info**
  panel and a small **completion pie** (MindManager-style — empty / wedge / full, with a ✓ at 100%)
  appears on the node. **Click a node's pie to step its completion** (0 → 25 → 50 → 75 → 100 → 0). Parents
  **roll up automatically**: a branch's pie shows the average across all its sub-tasks plus a done/total
  count (e.g. *75% · 1/2*) in the Info panel, updating live as you tick items off. The completion also
  shows in the **Outline** and in image exports (PNG/SVG). It's a clean way to track a plan's status
  right on the map — lossless in `.json`, ignored by flat (outline) exports.
- **Saved filters** — name the current Power Filter and reuse it across maps. The **🎚 Filter** panel
  grows a **Saved filters** list: type/pick criteria, give it a name, **Save**; click a saved name to
  re-apply it on any map, or **✕** to remove it. Presets persist locally (browser storage) and travel
  with you between maps. Fully local — nothing leaves the browser.
- **Typo-tolerant Find** — **Find** now rescues near-misses. If an exact match isn't found, it falls
  back to a fuzzy pass (bounded edit-distance per word) so `Launhc` still finds **Launch** and
  `markteing` still finds **Marketing**. Exact matches always win and short queries (< 4 chars) stay
  strict, so precise searches are unaffected.
- **Paste text → map** — a **📋 Paste text** action turns a pasted outline, bullet list, or
  Markdown into topics: indentation (or `#` heading levels) sets the hierarchy, and `-`/`*`/`+`/`•`
  and numbered (`1.`) markers are all understood. Drop it in as a **new map**, or **Add under
  selected** to graft it onto the current map. Fully local — the fast, private way to bring an
  outline (including one you generated elsewhere) into a map without any upload.
- **Version history** — a **🕔 History** panel keeps per-map snapshots in IndexedDB, so you can roll
  a map back to an earlier state. Snapshots are captured automatically while you edit (throttled to
  ~one per few minutes) and on demand via **Save version now**; **Restore** loads a snapshot back in
  place (your current state is checkpointed first, so a restore is itself undoable). Capped at 30
  per map (oldest pruned); a map's history is deleted with the map. Fully local — nothing leaves
  the browser.
- **More import formats — iThoughts `.itmz`, MindMeister `.mind`, and legacy XMind `content.xml`.**
  iThoughts (a ZIP of `mapdata.xml`) brings in the topic tree, notes, web links, relationships, and
  floating topics; MindMeister (a ZIP of `map.json`) brings in the tree, notes, and links;
  and the XMind importer now falls back to the older `content.xml` layout when there's no
  `content.json`. All in **Open files**. (Schema-verified against community specs, not yet against
  real app exports — the same caveat as `.mmap`/`.smmx`; dangerous-scheme links are dropped.)
- **Import Word `.docx` and Excel `.xlsx`** — round out the Office story (export already shipped).
  `.docx` reads the document's outline — heading styles (Title / Heading 1/2/3 …) **or** paragraph
  indentation — into the topic tree (our own `.docx` export round-trips exactly). `.xlsx` reads an
  indented-outline sheet: each row's first non-empty column sets its depth, a trailing column
  becomes the note; it decodes inline **and** shared strings, so it reads real Excel files too.
  Both are in **Open files**. (Caveat: `.xlsx` is outline-based, so a node with an empty topic has
  no cell to anchor it and isn't imported; styling/images aren't carried.)
- **Unified topic info panel** — one **ℹ Info** side panel now holds everything you can set on the
  selected node: its **note** (Markdown editor + preview), **markers** (with the active ones
  highlighted), **tags** (add/remove — a new editor; tags were previously import-only), **style**
  (shape/fill/border/bold), and **links** (web / link-to-a-map / jump-to-a-topic). It replaces the
  separate Notes, Markers, and Style toggles and the Link / Jump toolbar dropdowns.
- **Per-map canvas background** — a **Canvas** colour control in the toolbar sets the background
  for the current map (overrides the theme); it persists with the map (stored in `meta.background`,
  lossless in `.json`) and carries into the image/PDF export.
- **Focus a branch** — a **◎ Focus** button isolates the selected node's branch: everything except
  that branch and its path back to the root dims (Esc or "Show all" exits). Read-only — it reuses
  the Power Filter's dim pipeline, changing nothing in the map.
- **In-map jump links + clickable hyperlinks** — link a node to **another topic in the same map**
  via the new **↪ Jump to…** toolbar picker (stored as a `#node=` hyperlink); clicking the node's
  **🔗** leaps to and selects that topic. The 🔗 is now a real button, which also restores following
  **cross-map links** (`#map=`, previously inert on the React Flow engine) and opens external URLs
  in a new tab — dangerous schemes are refused by the app-wide XSS guard. Link routing is a pure,
  unit-tested `classifyLink()`.
- **Read-only Power Filter** — a **🎚 Filter** panel that dims every topic *except* the ones
  matching your criteria (free text in topic/note, plus toggle chips for any marker or tag in the
  map) and the paths leading to them, with a live match count. It's strictly a view: nothing is
  hidden or deleted (pure `filterResult()` computes the lit set; the canvas only changes opacity),
  and closing the panel restores the full map. Marker/tag criteria AND across categories.
- **Auto-numbering** — a **1. Numbering** toolbar toggle that prefixes every topic with its
  hierarchical outline number (1, 1.2, 1.2.3 …) on the canvas *and* in the Outline panel, and
  carries through to image/PDF/Office exports. Purely a view: the numbers are computed from the
  tree (pure `outlineNumbers()`), never written into the model, so topics, search, and the flat
  exporters stay clean. The root (central topic) is the implicit "0" and isn't numbered. Persisted.
- **Marker & tag index panel** — a new **📑 Index** side panel listing every marker and tag
  used in the map, each grouped with the topics carrying it (with a count); click any entry to
  centre + select that node. A read-only navigation companion to the per-node **Markers** palette,
  mirroring the **Outline** panel. The collection logic is the pure, unit-tested `markerTagIndex()`.
- **SimpleMind interop (`.smmx`)** — import *and* export SimpleMind's `.smmx` (a ZIP of
  `document/mindmap.xml`): the topic tree, notes, web links, and relations↔cross-links, plus
  floating topics. Now in **Open files** + the **⬆ Export…** menu.
- **Export to XMind (`.xmind`)** — write the modern (2020+) `content.json` ZIP
  (topic tree, notes, web links, tags, plus floating topics + relationships),
  completing two-way XMind interop (import already shipped). `.xmind` is now in the
  **⬆ Export…** menu.
- **Polish** — a proper **favicon** for browser tabs + bookmarks (the mind-map glyph,
  `icon.svg` + a PNG/apple-touch fallback), and a **collapsible minimap** (a "Minimap ▾/▴"
  toggle that hides the corner overview when it's in the way; the choice persists).
- **Draw relationships on the canvas** — right-click a node → **Link to…** → click a
  target to add a labelled cross-link (double-click a relationship to relabel, right-click
  to delete). Restores interactive relationship-drawing on the React Flow engine.
- **Canvas engine → React Flow.** Replaced the mind-elixir renderer with
  **@xyflow/react** (MIT), unlocking first-class, editable **alternate layouts**
  (org-chart down/up, radial, timeline, fishbone), **organic tapered branches**,
  **anchored callouts**, **inline rich-text topics** (Ctrl+B/I/U), and a
  branch-coloured **minimap + zoom controls**. The canvas is model-first (pure ops
  on the canonical doc → re-project → re-layout → onChange), and the SVG export is
  authored natively from the model (it now carries arrow + boundary labels and
  rasterises without canvas-taint). The migration ran behind a flag across phases
  0/A–I; mind-elixir and its `foreignObject` export shim are removed, and the entry
  + lazy bundle shrank (the engine chunk dropped ~37 kB).
- **Phase 0 scaffold** — local-first mind-map PWA on React 19 + Vite 6 + TS,
  built on the mind-elixir core (MIT, since replaced — see above) with a
  format-agnostic canonical model (`src/model/types.ts`) as the single source of truth.
- **MindManager-style render** — theme with a per-branch colour palette,
  two-sided radial layout, and rounded topics (`src/mindmap/`).
- **One-way `.mmap` importer** (`src/import/mmap.ts`) — recovers the full common
  feature set, field-mapped from the bundled MindManager XSD (authoritative, not
  guessed): topic tree + text, notes (`NotesXhtmlData@PreviewPlainText`), stock
  icons (`Icon@IconType`), hyperlinks (`Hyperlink@Url`), relationships →
  cross-links (`ConnectionGroup > Connection > ObjectReference@OIdRef`),
  boundaries (`Topic > OneBoundary`, over the subtree), and floating topics.
  Out-of-scope task data is warned not imported, and a left-behind check warns on
  any unreached topics. Validated against a real export (25-topic map, zero loss)
  plus 9 synthetic unit tests and a CI-safe, env-gated (`MMAP_FILE`) integration
  test.
- **The "green before done" gate** — `pnpm gate` runs typecheck → lint/format
  (Biome) → dead-code (knip) → tests (vitest) → build (vite) → bundle-size
  budget, fail-fast. Mirrored in GitHub Actions CI (`.github/workflows/ci.yml`).
- **Working agreement** captured in `CLAUDE.md`.
- **Feature catalogue** (`docs/features.json`) — the curated list of user-facing
  capabilities that serves as the denominator for documentation coverage; a
  `check-feature-coverage` gate validates its integrity (ids, areas, dates,
  flags) and warns when the CHANGELOG advances past the catalogue's reviewed
  watermark.
- **Stats pipeline** (`scripts/build-stats.mjs`) — distils the repo's own tooling
  (Vitest coverage, git history, file + build scan) into `public/stats.json` plus
  a rolling `public/stats-history.json` for trend sparklines: lines of code by
  category, coverage, test counts, a high-churn×low-coverage risk map, code
  hygiene counters, domain richness, footprint and gzip bundle size. A **Stats**
  workflow (`.github/workflows/stats.yml`) regenerates and commits them back on
  every push to `main`, loop-guarded by `[skip ci]` + `paths-ignore`.
- **Project dashboard** (`public/dashboard.html`) — a standalone, backend-free page
  with two halves: a **live repo pulse** (commit frequency, conventional-commit
  types, authorship, day/hour rhythm and merged-PR activity, pulled client-side
  from the unauthenticated GitHub REST API on each open) and **project metrics from
  CI** (everything from `stats.json`, including the documentation-coverage map and
  the risk map). Chart.js from a pinned, SRI-checked CDN.
- **Dual licensing** — the software is licensed under the **Apache License 2.0**
  ([`LICENSE`](LICENSE); also `package.json`'s `license` field), while the
  forthcoming practitioner book in `docs/guide/` is **CC BY-NC 4.0**
  ([`LICENSE-BOOK`](LICENSE-BOOK)). Third-party trademark + open-source dependency
  notices live in [`NOTICE.md`](NOTICE.md), rendered to `/notices.html`, and the
  split is documented in the README "## License" section.
- **In-app About dialog** — a native `<dialog>` (modal semantics, focus management
  and Escape-to-close handled by the browser) reachable from the header, surfacing
  the copyright, the dual-license summary, and links to the third-party notices,
  the live dashboard, and the source repository.
- **User manual rendered to `/user-guide.html`** — the comprehensive `USER_GUIDE.md`
  is rendered to a styled, standalone page at build time by a small Vite plugin
  (`marked`, with GitHub-style heading slugs so the guide's own in-page anchors
  resolve) and served on demand in dev. Reachable from the in-app **About** dialog.
  One canonical source — never a hand-maintained second copy that can drift.
- **The book — _Thinking in Maps_** — a longer-form guide to mind mapping under
  [`docs/guide/`](docs/guide/), built from one Markdown source to **both** a
  reflowable EPUB (Kindle-friendly) and a fixed-A4 PDF (cover, clickable TOC,
  chapter bookmarks, document metadata + a stable book id) by pure-Node builders
  (`jszip` + `marked`, and `pdf-lib`). Its diagram is generated from a source
  constant — rendered as SVG for the EPUB and drawn natively for the PDF. Both
  builds are byte-deterministic. The artifacts deploy with the site
  (`/Thinking-in-Maps.epub`, `/Thinking-in-Maps.pdf`); a **Rebuild book** workflow
  regenerates and commits them when the manuscript changes (bot-actor loop guard),
  with opt-in send-to-Kindle. The catalogue's `book` flag now tracks coverage (97.7%).
- **`.mmap` import wired into the app** — an Open-file control runs `parseMmap`
  and renders the result on the canvas, surfacing importer warnings and parse
  errors inline.
- **Markdown I/O** (`src/io/markdown.ts`) — open `.md` outlines as maps and export
  any map to `.md` (H1 root + nested bullets, round-trippable); wired into the open
  dialog (accepts `.md` and `.mmap`) and an Export .md button.
- **Edit capture** (`src/mindmap/sync.ts`) — canvas edits flow back into the
  canonical model (mind-elixir `operation` → `fromMindElixir`), preserving
  canonical-only fields (notes/tasks/images) by id, so Export .md reflects live edits.
- **Local-first persistence** (`src/store/mapStore.ts`) — the current map autosaves
  to IndexedDB (debounced) and reloads on startup, so work survives a refresh.
- **Multi-map library** — many named maps in IndexedDB keyed by id, with the
  last-opened map restored on startup. The header gains a map switcher (dropdown)
  plus New and Delete; each import becomes its own library entry.
- **PNG / SVG export** — export the current map as a PNG or SVG image via
  mind-elixir's built-in renderers, exposed through a `MindMapHandle` ref
  (`.png` / `.svg` buttons in the header).
- **Installable PWA** — `vite-plugin-pwa` adds a web manifest, an on-brand app
  icon, and a Workbox service worker that precaches the app shell, so MindMap
  Studio installs to the home screen / desktop and runs fully offline.

- **Node editing UI** — `@mind-elixir/node-menu` adds an inline editor panel
  (icons, tags, font size/color, link, and memo) when a node is selected. Edits
  flow through the capture seam into the canonical model; the memo maps to the
  node's `note`, so notes persist and round-trip with imported maps.
- **Walk-Through presentation mode** — a "▶ Present" button opens a fullscreen
  slide view: an overview (title + branches), then one slide per branch with its
  nested bullets, navigated with Prev/Next, arrow keys, and Esc.
- **Relationship arrows** — imported `.mmap` relationships (`doc.links`) render as
  curved arrows between nodes, and arrows drawn on the canvas round-trip back into
  the model and persist.
- **Self-contained HTML export** — a `.html` button exports the map as a single
  standalone HTML file with the SVG embedded; opens anywhere, offline, no deps.
- **HTML slide-deck export** — a `.html (slide deck)` export turns the map into a
  standalone, navigable slide presentation — the Walk-Through as a shareable file:
  an overview slide plus one slide per branch, navigated by arrow keys / click /
  Prev-Next buttons, with embedded styling and no dependencies. Reuses the same
  slide model the in-app presentation renders (`src/io/deck.ts`, lazy-loaded so it
  stays out of the entry bundle); topic text is HTML-escaped, and the nav script is
  static, so map content has no scripting surface.
- **Word (.docx) export** — a `.docx (Word)` export saves the map as an editable
  outline document (a title, then indented bulleted topics, with notes as italic
  lines). It writes the minimal valid Open-XML package by hand
  (`[Content_Types].xml`, `_rels/.rels`, `word/document.xml`) via `fflate`, using
  direct run formatting rather than named styles so it renders identically in Word,
  LibreOffice, Pages, and Google Docs. Pure + deterministic (`src/io/docx.ts`,
  lazy-loaded); topic and note text is XML-escaped.
- **PowerPoint (.pptx) export** — a `.pptx (PowerPoint)` export turns the map into a real,
  editable slide deck — an overview slide, then one per branch with its subtree as bullets —
  reusing the same slide model as the in-app Walk-Through. It writes the full minimal
  PresentationML package by hand (presentation, slide master, layout, theme, and one part per
  slide, each wired through its own `.rels`) via `fflate`; slides are positioned text boxes, so
  they're self-describing. Pure + deterministic (`src/io/pptx.ts`, lazy-loaded); topic text is
  XML-escaped. Verified by opening the output with python-pptx (a real PowerPoint-class reader)
  plus well-formedness + referential-integrity unit tests.
- **Excel (.xlsx) export** — a `.xlsx (Excel)` export saves the map as an indented outline
  worksheet: each topic in the column matching its depth, plus a Notes column and a bold
  header. Minimal SpreadsheetML written by hand via `fflate` (inline strings, no
  sharedStrings part); pure + deterministic (`src/io/xlsx.ts`, lazy-loaded), topic/note text
  XML-escaped. Verified by opening the output with openpyxl (a real Excel-class reader) plus
  well-formedness + content unit tests.
- **Copy outline** — a `⧉ Copy outline` button copies the map as a Markdown outline straight
  to the clipboard (no file download), for pasting into an email, chat, or doc.
- **More starter templates** — the New menu gains five structured-thinking starters:
  **5 Whys** (a nested root-cause chain), **Decision** (pros & cons), **Retrospective**
  (Start / Stop / Continue), **Meeting notes**, and **Pre-mortem** (`src/templates.ts`).
- **Find nodes** — a header search box matches node topics _and notes_
  (case-insensitive), focuses and selects the match on the canvas, and cycles through
  multiple hits on repeated Enter (with an `n/total` counter). Matching is a pure,
  unit-tested helper (`src/search.ts`).
- **Library-wide search** — a **🔎 All maps** button opens a dialog that searches *every* map
  in the library (topics + notes, floating topics included) and jumps to the chosen map and
  node: a same-map hit focuses in place, another map switches then focuses. Pure, unit-tested
  matcher (`searchLibrary` in `src/search.ts`); the dialog loads the library with the live
  current map merged over its saved copy, so it sees unsaved edits.
- **Print / PDF export** — a `.pdf` button renders the map into a hidden iframe and
  opens the browser's print dialog ("Save as PDF"), laid out landscape to fit wide
  maps. Dep-free and fully local; the print document is a pure helper
  (`buildPrintDoc` in `src/io/html.ts`).
- **Batch import** — the Open control now accepts multiple files at once; each
  `.mmap`/`.md` becomes its own library entry, the last one opens on the canvas, and
  a one-line summary reports how many were imported (with per-map import notes).
  Serves migrating a folder of existing MindManager maps in one go.
- **Boundaries** — imported MindManager boundaries (`doc.boundaries`) draw on the
  canvas as labelled, shaded boxes around their subtree (see the filled-enclosure entry
  above), via mind-elixir summaries (`toSummaries`/`fromSummaries` in `src/mindmap/sync.ts`).
  Boundaries you draw on the canvas round-trip back into the model and persist, and imported
  ones survive edits — all keyed by stable node ids, so the boxes re-derive correctly after
  structural edits.
- **Native `.json` import/export** — a `.json` button saves the full canonical model
  (notes, links, boundaries, icons, tags) and an imported `.json` restores it exactly.
  Unlike the lossy/derived formats, this is a lossless round-trip — the format to use
  for backup or moving a map between machines. Malformed files are rejected with a clear
  message. Pure helpers (`serializeDoc`/`parseDoc` in `src/io/json.ts`).
- **Fit button** — re-scales and centers the map to the viewport (MindManager's "Fit
  Map"), handy after importing a large map or panning around. Exposed via the
  `MindMapHandle` ref (`fitView` is also reused for the initial auto-fit).
- **Image/document exports render everywhere** (`src/io/svgText.ts`) — mind-elixir
  emits topic labels as `<foreignObject>` (HTML-in-SVG), which only renders inline in a
  browser: opened as a file, rasterized to PNG, or placed in Office the labels vanished
  (and foreignObject *taints* the canvas, so the PNG path produced a blank/failed image).
  `inlineSvgText` rewrites those labels to native SVG `<text>`, reusing each label's
  existing x/y so it lands inside its box, and now runs in the `.svg`/`.png`/`.html`/`.pdf`
  pipeline (after `sanitizeSvg`). The PNG export rasterizes the cleaned SVG itself
  (`useMapExports.svgToPng`), replacing mind-elixir's taint-prone `exportPng`. Verified by
  a canvas-taint + text-pixel render check; the library's own `exportSvg(true)` was
  rejected because it mispositions every label. Covered by `test/svgText.test.ts`.
- **Multi-line topic labels in exports** — `inlineSvgText` now splits a topic on its
  explicit line breaks and emits one `<text>` with a `<tspan>` per line, distributed over
  the box height (single-line topics stay a plain `<text>`). Previously a multi-line topic
  collapsed onto one line in the exported image/document. Verified by a real multi-line
  render. An **export-fidelity regression test** (`test/exportFidelity.test.ts`) now pins
  the whole `sanitizeSvg → inlineSvgText` chain: topics (incl. multi-line), marker icons,
  node images, and connector/arrow/boundary `<path>` geometry all survive, while scripts,
  inline handlers, and dangerous URL schemes are stripped. (Known gap: mind-elixir's export
  omits arrow/boundary *text* labels — their geometry exports, the labels don't.)
- **Book — _Thinking in Maps_ grown to full feature coverage.** The two previously
  un-booked features now have prose: **Copy outline** (clipboard, Chapter 6) and the
  **remembered-workspace** panel persistence (Chapter 5) — `book` coverage is now 100%.
  The Chapter 5 & 6 "Now you try" exercises gained concrete worked examples for **Fit**,
  **PNG/SVG**, **PDF**, **Excel**, **Copy outline**, and the remembered workspace, lifting
  `bookExample` coverage to 54%. The PDF builder's `pdfText` now also strips the
  Misc-Math-Symbols-B block (so a toolbar glyph like `⧉` named in prose can't break the
  WinAnsi draw); both books still build byte-deterministically.
- **More book worked examples (Chapters 2–7).** The "Now you try" exercises gained
  concrete, hands-on steps for editing-into-the-model, images, per-topic styling/font,
  themes, layout direction, floating topics, cross-map links, duplicate/switch maps,
  walk-through Present, library backup, and PWA install — lifting `bookExample` coverage
  **54% → 82%**. Flags flipped only for features the prose genuinely walks the reader through.
- **Example gallery — 13 pre-built maps** (`src/examples.ts`). An **Examples** group in the
  **+ New…** menu (alongside the empty templates) opens complete, worked maps to explore and
  adapt: Product launch, Meeting notes, Decision log, Quarterly OKRs, Retrospective, a worked
  SWOT, Incident runbook, GTD natural planning, Talk/content outline, Personal knowledge map,
  Study/revision map, Trip plan (with a small embedded image), and a Cross-map atlas. Between
  them they exercise every major feature — notes, markers, boundaries, relationships, floating
  topics, per-topic styling, images, deep nesting, hyperlinks. Each is canonical-model data
  (opening one mints a fresh, editable copy) and covered by `test/examples.test.ts` (every
  example builds with unique ids and no dangling link/boundary references).
- **⬚ Group button — MindManager-style filled boundary enclosures.** A toolbar **⬚ Group**
  button draws a shaded, rounded box around the selected branch and its whole subtree
  (`MindMapHandle.groupBranch`); it's captured into the model (`doc.boundaries`) and persists
  like any edit. The box is a **custom overlay** (`renderBoundaryOverlay` in `MindMap.tsx`):
  it lives inside mind-elixir's transformed canvas, so it pans and zooms with the map, and
  its bounds are recomputed from the live node rects on every edit, init, and layout change.
  mind-elixir's own bracket summaries are suppressed (`hideNativeBrackets`) so only the filled
  box shows, with a single label chip; the canonical label round-trips by id even though the
  underlying summary's label is blanked (`toSummaries`/`fromSummaries`). This lifts filled
  boundary enclosures out of the renderer-ceiling list — **callouts** remain there (the engine
  has no callout primitive), tracked in `NEXT_STEPS.md`.
- **PWA self-update — "New version available — Refresh now."** The service worker now uses
  `registerType: "prompt"` (was `"autoUpdate"`, which reloaded silently): a new deploy parks
  the new worker and surfaces a non-intrusive toast with a **Refresh now** action that swaps
  to the new build and reloads — never a silent reload that could drop an in-flight edit. The
  update service (`src/pwa/pwaUpdate.ts`) also powers a **Check for updates** action in the
  About dialog (re-surfaces the prompt if one's already waiting). The toast surface gained an
  optional action button + duration; `navigateFallbackDenylist: [/\.html$/]` keeps the
  standalone pages out of the SPA shell. Verified offline end-to-end (kill the server → the
  app still loads from the SW cache); covered by `test/pwaUpdate.test.ts` (callbacks, the
  Refresh-now → `updateSW(true)` path, idempotency, and the four manual-check outcomes).
  Adds `workbox-window` as a direct devDep (strict pnpm doesn't expose it to the app).
- **Corner minimap + integrated zoom controls** (`src/mindmap/minimap.ts`). A bottom-right
  panel draws a schematic overview of the whole map — one branch-coloured rect per topic —
  with a viewport rectangle you can **click or drag to pan** the main canvas; below it sit
  zoom **−/+** buttons, a live percentage, and a **fit** button. mind-elixir has no built-in
  minimap (verified), so the schematic is custom: node rects are projected from the live DOM
  into the panel by a pure, unit-tested layout (`computeMinimapLayout`), redrawn on data
  edits and re-aligned on pan/zoom via the engine's `move`/`scale` events. mind-elixir's own
  bottom-right zoom widget is hidden so there's a single, integrated control, and the engine's
  zoom range is widened (`scaleMin 0.2` / `scaleMax 3`) so the buttons and wheel zoom in
  meaningfully. Covered by `test/minimap.test.ts` (projection, centring, viewport, inverse).
- **Interop with other mind-mapping tools — FreeMind/Freeplane, Mermaid, XMind.** New thin
  adapters to/from the canonical model widen the round-trip beyond `.mmap`/OPML/Markdown/JSON:
  **FreeMind/Freeplane `.mm`** (`src/io/freemind.ts`, import + export — topic tree, links,
  folded state, and notes), **Mermaid `mindmap`** (`src/io/mermaid.ts`, import + export — the
  text format you embed in Markdown/docs; topic tree), and **XMind `.xmind`** (`src/io/xmind.ts`,
  import — unzips `content.json`, mapping titles, notes, web links, and labels→tags). Wired into
  the **⬆ Export…** menu (`.mm`, `.mmd`) and **Open files** (`.mm`, `.mmd`/`.mermaid`, `.xmind`);
  dangerous-scheme links are dropped on both directions, as everywhere. Covered by
  `test/freemind.test.ts`, `test/mermaid.test.ts`, and `test/xmind.test.ts` (round-trips, shape/
  indentation parsing, malformed-input rejection). _(Update: XMind **export** and legacy `.xmind`
  `content.xml` **import** both shipped shortly after — see the entries above.)_
- **MindManager gap-analysis doc** (`docs/mindmanager-gap-analysis.md`). A systematic audit of
  MindManager's full current feature set (desktop 2023–2025, Web, Teams, Snap) mapped to
  MindMap Studio's status — shipped / partial / renderer-ceiling / out-of-scope — with a
  prioritized list of buildable gaps. It's the roadmap signal behind `NEXT_STEPS.md`: it shows
  the alternate-layouts/callouts/rich-text cluster all share one root cause (the renderer), and
  confirms the PM and collaboration/enterprise layers stay deliberately out of scope.

### Changed

- **Denser inspector rows + keyboard-accessible tabs.** The Details tab's single-value fields
  (**Progress, Dates, Priority**) now render as compact *label-left / control-right* rows instead of a
  full-width section header above a stacked control block, so more fits without scrolling (the control
  cluster wraps under the label only when it's too wide, e.g. the two date pickers in a narrow panel).
  The inspector's **Details / Style / Notes** tab strip is now a proper WAI-ARIA tablist with a
  **roving tab-stop** and **←/→ + Home/End** keyboard navigation, and each tab is tied to its panel
  via `aria-controls` / `aria-labelledby`. Purely a layout + a11y change — the controls themselves are
  unchanged.

- **The Topic-info inspector now matches the rest of the chrome and re-themes.** It was a light-only
  280px panel with a right-hand border (a left-rail idiom) that stayed white in Dark / Ocean / Sunset;
  it now uses the same themed `.mm-inspector` shell as the map-overview panel — 300px, border on the
  left, surface + controls driven by the editor's `--ed-*` tokens — so selecting/deselecting a node no
  longer makes the right edge jump width or flip its border, and the whole panel (tabs, inputs,
  buttons, notes editor, markers, stickers) reads correctly in every theme. Purely visual: the shared
  control primitives gained additive class hooks that only the inspector-scoped CSS targets, so the
  left-rail panels are byte-for-byte unchanged; priority chips keep their semantic colours.

- **Canvas + Present component tests (internal).** The two biggest untested components now have a net:
  `test/flowmindmap.test.tsx` mounts the real `FlowMindMap` (React Flow) canvas and drives it through
  the imperative `MindMapHandle` ref + `document` keyboard events — covering the contract surface the
  upcoming UX redesign depends on (every handle action, undo/redo, the keyboard tree-building, the
  drop-to-floating-topic path, and the brace/filter/numbering re-sync) plus the lazy `MindMap` seam.
  A scoped jsdom viewport shim (the documented React Flow test mock) makes the canvas render its nodes
  + edges, so the test also drives the right-click **context menu** (every action + the branch-layout
  override), node/pane clicks, the quick-action popover, the **Link to…** relationship gesture,
  **inline editing** (commit / add-sibling / add-child / cancel), the node affordances (follow link /
  step task pie / collapse), relationship-edge edit & delete, and the minimap toggle.
  `test/presentation.test.tsx` mounts the ▶ Present overlay and drives navigation, the keyboard, and
  the presenter sidebar. Lifts `FlowMindMap.tsx` 0 → 91%, `Presentation.tsx` 0 → 100%, the `mindmap/`
  area 8.5 → 91.5%, and overall line coverage ~67 → ~81%. Tests only — no behaviour change.
- **Dashboard load + contract tests (internal).** `public/dashboard.html` (the live GitHub + CI-metrics
  page built from `public/stats.json` / `public/stats-history.json`) had no automated coverage;
  `test/dashboard.test.ts` now guards that it loads, in three passes: **structure** (every id the inline
  script drives exists in the markup, Chart.js stays SRI-pinned, both data sources are wired to
  `window` `load`), **contract** (the committed `stats.json` / `stats-history.json` carry every field the
  dashboard reads — so a `build-stats.mjs` key rename fails CI instead of silently rendering "—"), and
  **behaviour** (the real inline script runs in jsdom against the real DOM — filling the metrics from the
  committed data, rendering the live repo pulse from stubbed GitHub responses, and degrading to the
  pending banner + "live fetch unavailable" note when the network is down).
- **Panel/filter state extracted into `usePanels()` + tech-debt sweep (internal).** The eight
  side-panel open/close toggles (outline / index / info / filter / styles / history / board /
  numbered) with their `mindmap-panels` persistence, the read-only Power Filter (text / markers /
  tags / due / priority + the clear/toggle rules and the "closing Filter clears it" behaviour), and
  the saved-filter presets (`mindmap-saved-filters`, add / apply / delete) all moved out of `App.tsx`
  into a single `src/hooks/usePanels.ts`, returned as a grouped `{ panels, filter, savedFilters }`
  object and unit-tested with `renderHook`. Behaviour-preserving — the persistence keys, defaults, and
  every rule are unchanged. Alongside it: the **callout** inline editor swapped its `autoFocus`
  attribute for a `useRef` + mount `useEffect(focus)` (same UX, one fewer a11y lint suppression), and
  the repeated d3-hierarchy tidy-tree placement in `mindmap/flow/layout.ts` was folded into one
  `layoutTidyTree(…)` helper shared by the side / left / right / org-down / org-up / brace layouts
  (verified byte-identical positions against the prior code). `App.tsx` drops to ~1,520 lines; this
  closes the foundation-hardening run (coverage **~44% → ~55%**, `App.tsx` **2,165 → ~1,520**, design
  tokens + primitives + `<Toolbar>`/`<Dialog>` extracted, the canvas memoised) ahead of the UX
  redesign.
- **Toolbar extracted from `App.tsx` (internal).** The ~580-line editor `<header>` (the ~50 nav /
  panel / map / canvas / layout / find / export controls) moved into a single prop-driven
  `src/components/Toolbar.tsx`, grouped into logical prop buckets (`nav` / `panels` / `map` /
  `canvas` / `find` / `io`) plus the canvas handle ref. The inline `controlStyle` / `inputStyle`
  buttons were swapped onto the Phase-C `Button` / `Select` / `Input` primitives where the swap is
  pixel-identical. Strictly behaviour-preserving — every control renders and behaves the same;
  `App.tsx` drops ~500 lines and the toolbar is now one self-contained component the upcoming UX
  redesign can restructure in isolation.
- **Controlled `<Dialog>` wrapper (internal).** The three native `<dialog>` modals (About, Search-all,
  Paste-text) now render through one controlled `src/components/Dialog.tsx` that owns the
  `showModal()` / `close()` mechanic, the native `close` event, and Escape-to-close — replacing the
  three hand-rolled `useEffect`s in `App.tsx`. Each dialog passes `open` / `onClose`, with its on-open
  side effects (focus the first field, lazy-load the searchable library) supplied via an `onOpen`
  callback. Behaviour-identical — same modal open/close, same content, same per-dialog look (the Paste
  sheet keeps its shadow-less surface).
- **Design-token + UI-primitive layer (internal).** The editor chrome's ad-hoc inline styles now
  draw from a single named palette + scales (`src/design/tokens.ts`: `colors`, `space`, `radius`,
  `fontSize`, `fontWeight`) through a small set of reusable primitives (`src/design/primitives.tsx`:
  `Button` with an `active`/`disabled` variant, `Input`, `Select`, `Chip`, `Panel`, `PanelSection`).
  `src/ui.ts` (`controlStyle`/`inputStyle`), `src/Panels.tsx` (the rail panels + style/marker bars),
  and the `src/mindmap/FlowMindMap.tsx` context menu were migrated onto them. Strictly
  behaviour-preserving — the values are the exact current ones, so every panel, control, and menu
  renders pixel-identical; this is the building-block layer the upcoming UX redesign sits on.
- **Canvas render perf (internal).** The React Flow building blocks are now wrapped in `React.memo`
  — `TopicNode`, `BranchEdge`, `CrosslinkEdge`, and the `ViewportPortal` overlays (`Boundaries`,
  `Callouts`, `Summaries`, `BraceConnectors`, `DiagramBackdrop`) — so a large map stops re-rendering
  every node/edge/overlay on unrelated state changes (selection, hover, menus, panning). Selection
  highlight, Power-Filter dimming, drag, and inline editing still update correctly (the producer mints
  fresh `data` only when content changes; editing flows through context, which memo never blocks). The
  per-item bbox math in the overlays is `useMemo`'d on `(nodes, items)`, and `CrosslinkEdge`'s
  **line-jump** crossing scan (an O(relationships²) pass that previously re-ran on every render) is
  memoised on the real inputs `(nodes, edges, id, lineJumps)` — it still recomputes the moment a node
  moves or a relationship is added/removed, but caches every other render. Behaviour-preserving;
  canvas == export is unchanged.
- **Component/hook test safety net (internal).** Added `@testing-library/react` (+ `/dom` +
  `/user-event`) and a jsdom test setup (`test/setup.ts`, polyfilling `ResizeObserver`,
  `matchMedia`, `IntersectionObserver`) wired through `vitest.config.ts` — `node` stays the default
  environment; component/hook specs opt into jsdom per-file. New **render + interaction smoke tests**
  for every left-rail panel (`Outline`, `Marker/tag index`, `Filter`, `Styles`, `Info`, `History`,
  `StyleBar`) assert user-visible text/roles (so they survive a later panel refactor), and
  **`renderHook` tests** cover `useFind`, `useMapExports`, `useTheme`, and `useIsMobile`. The pure
  relationship-arrowhead geometry is extracted from `CrosslinkEdge.tsx` into
  `mindmap/flow/arrowhead.ts` (behaviour-preserving — the canvas edge and the SVG exporter share the
  one byte-identical builder) and unit-tested alongside `taperedRibbonPath` + `floating.ts`. Coverage
  fill for `io/attachment.ts`, `io/image.ts` (`fileToMapImage` via mocked Image + canvas),
  `store/mapStore.ts` (`getAllMaps`/`listMaps`/cold-boot/concurrency), and the remaining `flow/ops.ts`
  branches. Statement/line coverage **~44% → ~55%**; suite now 742 tests. No behaviour change.
- **Hardening pass.** The PDF book builder now measures text through a `safeWidth`
  helper (mirroring `safeDraw`), so a glyph that slips past `pdfText` can never throw at
  the width step — the build degrades to the ASCII fallback instead of failing. The pure
  image-scale math is extracted from `src/io/image.ts` into a unit-tested `imageSizing`
  helper, and the shared OOXML infra (`escapeXml` + the deterministic `zipOoxml`) gains a
  direct test. Suite now 182 tests; no behavior change (books rebuild byte-for-byte).
- Upgraded the mind-elixir rendering core **4.6.2 → 5.12.2** (behavior-preserving —
  render, edit-capture, persistence, and export all re-verified in-browser).
  Unblocks the node-menu editing UI; the production bundle shrank slightly.
- The `.mmap` importer (`fast-xml-parser` + `fflate`) is now **code-split** into an
  on-demand chunk, trimming the initial JS bundle to ~99 kB gz (from ~114 kB). The
  size gate now budgets the entry chunk and reports lazy chunks separately.
- Bumped the GitHub Actions (checkout, setup-node, pnpm/action-setup) to **v6**
  (node24 runtimes), clearing the Node 20 deprecation annotation on CI.
- Bumped the GitHub **Pages** actions (`configure-pages` v6, `upload-pages-artifact` v5,
  `deploy-pages` v5) to their node24 majors, clearing the last Node-20 deprecation warning
  (on the Deploy workflow), and dropped the no-op `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` env
  that never actually suppressed it.
- Added a build-time guard (in the size-budget gate step) that asserts mind-elixir's core
  CSS is in the bundle — a `me-tpc` selector check — so the "canvas renders unstyled"
  regression can never ship silently again.
- **Deployed to GitHub Pages** — a `deploy.yml` workflow runs the gate, builds, and
  publishes on every push to `main`, served from the custom domain
  <https://mindmap-studio.struktureretsundfornuft.dk/> (HTTPS, with a `CNAME` baked into the
  build). The app is now live, installable, and offline-capable from a real URL.
- Extracted the six export handlers + the download helper out of `App` into a focused
  `useMapExports` hook (`src/useMapExports.ts`), so the component reads as orchestration
  rather than I/O plumbing (behavior-preserving — all formats re-verified in-browser).
- Further slimmed `App` by extracting the dark-mode preference (`useDarkMode`) and the
  Find behaviour (`useFind`) into self-contained hooks (behavior-preserving).
- Extracted the Outline, Notes, and Markers panels into presentational components
  (`src/Panels.tsx`) and the shared toolbar styles into `src/ui.ts`, so `App` reads as
  orchestration rather than markup (behavior-preserving — all three re-verified in-browser).
- The toolbar now **wraps** instead of overflowing, and the seven export buttons collapsed
  into one **⬆ Export…** menu to cut the clutter (all formats unchanged).
- The **⬆ Export…** menu is now grouped into labelled sections (Data & outline, Image,
  Document, Presentation) so the nine export formats stay scannable.
- In-map **Find** now searches floating topics too, not just the central tree, matching the
  newly-editable floating branch (`findDocMatches` in `src/search.ts`).
- Upgraded the build toolchain to **Vite 8** (6.4.3 → 8.0.16) with `@vitejs/plugin-react`
  6, matching TP Studio. Behavior-preserving — full gate green and the app re-verified
  in-browser (render, search, exports, no console errors); the production bundle even
  shrank (~100.6 → ~96.8 kB gz entry).
- Imported **floating topics render and are editable** on the canvas, in a labelled
  "Floating topics" branch (mind-elixir has no detached nodes, so this is the honest
  representation; the import banner notes their separate placement). Edits to the branch —
  rename, add, remove, nest, or drag a topic in/out of the tree — are captured back into
  `doc.floatingTopics` (with notes/images preserved by id) and persist; emptying or deleting
  the branch clears them. Pure round-trip in `fromMindElixir` (`src/mindmap/sync.ts`).
- **Node images** — an "Image" button attaches a picture to the selected node. The file
  is downscaled and stored as a self-contained data URL (so maps stay offline and a `.json`
  export carries its images), rendered on the node, and round-tripped through the model
  (`fileToMapImage` in `src/io/image.ts`; image sync in `src/mindmap/sync.ts`).
- **Canvas theme gallery** — a Theme picker swaps the whole map style live (Light, Dark,
  Ocean, Sunset — each its own branch palette + surfaces), for on-screen presentation;
  image exports inherit it. Switching is live (no reload, no lost edits) and the choice
  persists across sessions.
- **Per-topic styling** — a 🎨 Style bar applies shape (box / rounded / pill), fill, border,
  and bold to the selected node, with ✕ to clear and Reset for all. Styles persist and
  round-trip through the model and `.json` (`NodeStyle` extended with `borderRadius` /
  `border`). Complements node-menu's font size/colour controls.
- **Notes editor** — a 📝 Notes panel docks below the canvas and edits the selected node's
  note in a comfortable textarea (debounced autosave + commit on blur), replacing the
  cramped node-menu memo. Notes persist and round-trip through the model and `.json`. A
  **Preview** toggle renders a safe Markdown subset (headings, bold/italic, lists, code,
  http(s) links) — `renderNote` in `src/noteFormat.ts` (HTML-escaped, unit-tested).
- **Outline view** — a ☰ Outline side panel lists the map as an indented, live outline;
  click a row to focus that node on the canvas, and noted nodes show a 📝 marker. A filter
  box narrows the outline by topic. Pure flattener in `src/outline.ts`.
- **New-map templates** — the New menu offers starter maps (Blank, Brainstorm, SWOT,
  Project plan) instead of only a blank map (`src/templates.ts`).
- **Cross-map links** — link a node to another map in the library (🔗 Link… picker); the
  node shows a 🔗 that navigates to the linked map in-app. Stored as a `#map=<id>` hyperlink
  and intercepted on click (so it doesn't open a blank tab). Turns the library into a
  connected knowledge base.
- **Duplicate map** — copy the current map into a new library entry ("… (copy)").
- **Remembered workspace** — which panels (Outline / Notes / Markers / Style) you have open
  is persisted, so the layout is restored next time.
- **Layout direction** — a picker switches the map between both-sides, right-only, and
  left-only layouts (applied live, edits preserved); the choice persists across sessions.
- **Collapse / Expand all** — ⊟ / ⊞ toolbar buttons collapse every branch to a level-1
  overview or expand the whole tree (MindManager's detail-level control).
- **Marker palette** — a 🏷 Markers bar of common markers (priority/flag/status/etc.);
  click one to toggle it on the selected node. Markers render on the node and persist.
- **Find & Replace** — the Find bar gains a replace field + "Replace all" that rewrites the
  search text in every matching topic (case-insensitive, literal). Pure `replaceInTopic`
  helper in `src/search.ts`. Press `/` to jump to Find from anywhere (ignored while typing).
- **OPML import/export** — open and save `.opml` (the standard outline-interchange format
  used by Freeplane, OmniOutliner, Workflowy, …); topics + notes round-trip. The parser is
  lazy-loaded (`src/io/opml.ts`), so it stays out of the entry bundle.
- **Library backup & restore** — a ⬇ Backup button saves *every* map to one
  `mindmap-library.json`; opening that file restores them all. Pure helpers
  (`serializeLibrary`/`parseLibrary` in `src/io/library.ts`); restore is auto-detected when
  you open a backup via Open files.

### Fixed

- **Canvas-fidelity bug-hunt fixes (post-merge sweep of the MindManager rendering pass).** A review
  of the just-landed markers/layouts/connectors/relationships/boundaries code surfaced a cluster of
  defects, now fixed with tests: the **fishbone layout** now positions sub-causes at **any depth**
  (depth-3+ nodes used to get no position and stack on the spine head at the origin); an **organic
  branch that runs perfectly axis-aligned** (a child dragged directly in line with its parent) no
  longer collapses to an invisible zero-area ribbon (falls back to the chord normal); the export
  **due-date chip keeps its 📅 glyph** to match the canvas; `fromFlow` now carries a node's **roll-up
  binding and attachments** through the round-trip (they were silently dropped); `boundaryPath`
  **clamps its corner radius** so a small rounded-rect box can't invert; an imported empty-string
  branch colour now **falls back to the palette** instead of emitting an empty stroke; and the export
  root-background fallback colour matches the canvas. A follow-up pass cleared the remaining reviewed
  findings: an **emoji / unknown marker** (e.g. an imported 👍) now draws in the marker row above the
  title in exports — matching the canvas — instead of being prepended to the title text; **bulk marker /
  tag toggles reach a selected floating topic** (the single-node `toggleIcon` / `setTags` now resolve
  floating topics too, so the decision and the mutation agree); the export's **outline number** is drawn
  de-emphasised (opacity 0.55) like the canvas; an **underline leaf** wraps at its true 8px padding;
  and a topic **image with no stored size** uses the same fallback + aspect handling on canvas and in
  export. All canvas==export-invariant or round-trip correctness fixes — no behaviour change to normal
  maps.

- **Exports now match the canvas for wrapped text, callouts, indicators, collapsed branches and
  images.** Several things rendered on screen but were dropped or distorted in the SVG / PNG / PDF
  export; they now render identically (canvas == export): long topic labels **word-wrap** inside their
  box instead of overflowing; a **multi-line callout** grows to fit instead of clipping to one strip;
  the **note / hyperlink / attachment** indicators are drawn (they used to vanish); a **collapsed
  branch** shows a circled hidden-subtopic count instead of looking like a leaf; and a topic **image**
  uses the same size cap on both. The always-on dot **grid** is gone (clean paper, like MindManager),
  and topics are flat at rest (the soft shadow was a screen-only affordance) — so the screen and the
  exported deliverable agree.

- **Relationship lines now bow the same way on screen and in exports.** The live canvas drew a
  relationship with React Flow's default bottom/top handles (a *vertical* bow) while the SVG/PNG/PDF
  exporter drew a *horizontal* S-curve — so the same link could curve the opposite way in a deliverable.
  Both now build the curve from one shared helper (`crosslinkBezier`), restoring canvas == export.

- **An imported task priority of 4–9 no longer renders as a grey "?".** `TaskInfo.priority` is modelled
  1..9 (MindManager's range), but the badge only defined 1–3 (High/Med/Low) and fell back to "?" for
  anything higher. Priorities 4–9 (which arrive via import) now show their number on a neutral badge,
  on the canvas and in exports alike.

- **A new topic is now focused for typing immediately.** Adding a topic (Enter / Tab / Ctrl+Enter)
  opens it in edit mode, but a freshly-created node is briefly `visibility:hidden` while React Flow
  measures it — so the one-shot `focus()` was a no-op and the new node sat in edit mode *unfocused*,
  forcing a click before you could type. The editor now retries focus across a few frames until it
  lands (an existing node, e.g. via F2, still focuses on the first try).

- **Toolbar dropdown menus (Panels / Insert / Canvas) no longer open as an invisible sliver.**
  Row 2 of the toolbar sets `overflow-x: auto` for horizontal scrolling, which per CSS coerces
  `overflow-y` too — so the absolutely-positioned dropdown was clipped to the ~50px toolbar row and
  effectively didn't show. The shared `Menu` now renders the dropdown as `position: fixed` with
  coordinates computed from the trigger button's rect, so it escapes the row's overflow clip on both
  desktop and mobile. Not a z-index issue (the menu already sat at z-index 60); clipping ignores
  z-index. The close-on-outside-click logic is unchanged — the menu stays a DOM child of its wrapper.
- **The 📝 note indicator now disappears for empty notes.** A note containing only whitespace
  cleared the icon in the Outline (which judges notes by trimmed content) but still showed 📝 on
  the canvas. `setNote` now treats a blank/whitespace-only note as "no note" (cleared), and the
  canvas indicator is gated on trimmed content too, so the two surfaces agree.
- **Boundaries / the ⬚ Group button now actually work on the canvas.** The first cut shipped
  on a verified *data* round-trip but the live render was never visually confirmed (it leaned
  on mind-elixir's bracket summary, which only drew a faint `{` on the outer edge, not the
  shaded box the user wanted — and a self-grouped node sometimes left a stray duplicate label).
  Replaced with the custom filled-box overlay above and verified by a real headless-Chrome
  render: a clean rounded shaded box encloses the branch + subtree with even padding, a single
  label chip, no stray duplicate, and arrow labels intact. Pan/zoom and layout-direction
  changes keep the box aligned.
- **Canvas styling restored — the map no longer collapses into inline text.** The mind-elixir
  v4→v5 upgrade moved the core stylesheet from JS-injected to a separate file, but the import
  was never added — so in production the node wrappers lost their `position:absolute` and the
  whole map flowed as one run of inline topics (the toolbar, which has its own CSS, still looked
  fine, which masked it). `src/mindmap/MindMap.tsx` now imports `mind-elixir/style.css`
  directly, so the stylesheet is always bundled (entry CSS ~1.8 kB → ~12.6 kB). Caught by
  headless-rendering the live site, fixed, and re-verified the same way.
- **No first-frame layout flash on load.** The canvas is hidden (`opacity:0`, kept measurable
  so the fit still works) until mind-elixir has laid out and fit the map, then revealed — so a
  fresh load or map switch no longer flashes the un-positioned nodes as one line before the
  tree appears. The reveal is unconditional (a `finally`), so the canvas can never stay hidden
  (`src/mindmap/MindMap.tsx`).
- **Imported `.mmap` icons render as glyphs.** Stock-icon names (e.g.
  `urn:mindjet:ThumbsUp`) used to show as literal text on nodes; common ones now map to
  emoji (👍, 🚩, 1️⃣, …) via `src/icons.ts`, which also backs the marker palette. Unknown
  names are kept as-is so nothing is lost.
- **Undo/redo now sync the model.** mind-elixir's `undo`/`redo` revert the canvas via
  `refresh()` without firing an `operation` event, so the canonical doc (and thus
  autosave + export) used to drift out of sync with what's displayed after a Ctrl+Z.
  `MindMap` now wraps `undo`/`redo` to re-capture, so the model always matches the canvas.

### Fixed

- **Dashboard "last push"** read `repo.updated_at`, which GitHub bumps on stars, issue
  comments, or any attribute change; it now uses `repo.pushed_at` (the actual last push).
- **EPUB byte-determinism** — JSZip stamped every entry, including the `META-INF/` and
  `OEBPS/` folder entries it auto-creates, with the wall-clock time, so each rebuild differed
  and the Rebuild-book workflow committed a no-op timestamp churn. Every entry's date is now
  pinned to date-only (midnight UTC), matching the PDF; the build is reproducible.
- **Book PDF code blocks** now paginate cleanly — a block taller than a page draws a
  background per page segment instead of spilling later lines onto the next page without one
  (latent: the manuscript has no fenced code blocks yet).

### Security

- **Stored XSS in the SVG / HTML / PDF export is fixed.** mind-elixir builds the export SVG by
  re-injecting each node topic as live HTML inside an SVG `<foreignObject>` (and each hyperlink
  as a raw `href`), and `src/io/html.ts` embeds that SVG as live markup — so a topic like
  `<img src=x onerror=…>` or a `javascript:` link (typed, or carried in by a malicious import)
  executed when the exported `.svg`/`.html` was opened or the map was printed to PDF. A new
  namespace-aware sanitiser (`src/io/svgSanitize.ts`) now runs on every SVG/HTML/PDF export:
  it strips `<script>`/`<iframe>`/`<object>`/… , every `on*` handler, and any URL scheme outside
  a strict allowlist, while **preserving** the foreignObject node topics — which DOMPurify
  cannot, as it deletes foreignObject content in every profile. As defence-in-depth, the
  hyperlink input boundaries (`setSelectedHyperlink`, the model↔canvas sync in
  `src/mindmap/sync.ts`, and the `.mmap` importer) reject `javascript:`/`data:`/`vbscript:`
  links at the source (`src/io/urlSafety.ts`). Verified against a real export render — no script
  executes and every node topic still renders — plus jsdom unit tests (`test/svgSanitize.test.ts`,
  `test/urlSafety.test.ts`). The XML/JSON importers were reviewed and are safe.
- **Stored XSS in the note renderer is fixed.** `src/noteFormat.ts` escaped `&`/`<`/`>` but not
  quotes, so a Markdown link whose URL contained a `"` broke out of the generated `href="…"` and
  injected a live attribute (e.g. an event handler) into the `<a>`. Notes render via
  `dangerouslySetInnerHTML` and can arrive from an imported map, so this was a stored vector, not
  just a self-XSS. `escapeHtml` now also escapes `"`/`'`, so no user character survives as a raw
  quote in the generated markup; the link transform still accepts only `http(s)` URLs. Regression
  test in `test/noteFormat.test.ts`.
