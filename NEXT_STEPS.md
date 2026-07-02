# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

Phase 1 (Brainstorming MVP) complete; canvas engine is **@xyflow/react**. MindMap Studio is
**feature-complete for its scope** (local-first, offline, single-user, free) — the competitive
gap-closing effort is **concluded by decision (2026-06-16)**; remaining gaps are surveyed, not
pursued (see Reference). `book`/`bookExample` were **100% as of 2026-06-19**; every feature shipped
since (including the 2026-07-02 batch below) is catalogued but not yet written up — see Tier 4/5
item **24** (USER_GUIDE catch-up sweep). The **editor/UX redesign** (2026-06-17) and the **MindManager
canvas-fidelity pass** (2026-06-19) are both complete. Deployed to GitHub Pages on every push to
`main` — live at <https://mindmap-studio.struktureretsundfornuft.dk/>.

**All prior remediation programmes are shipped** — see `CHANGELOG.md` for the per-item detail:

- the **2026-06-28 UX + feature-gap audit** (56 items, Phases 0–9);
- the **2026-06-29 UI review** (48 suggestions, Phases 1–12, including 10b wrap-width **Layers 1 & 2** —
  the Style-tab snap slider *and* the on-canvas right-edge drag grip);
- the **2026-06-30 UI research** report
  ([`docs/UI_RESEARCH_2026-06-30.md`](docs/UI_RESEARCH_2026-06-30.md), phases UI-1…UI-7);
- the **2026-07-01 UX/feature-gap batch** — space-bar pan, natural-language dates, touch outline
  drag-reorder, typed relationships, export-a-branch, deck/PPTX speaker notes, visual interactive-HTML
  export, library folders + ⌘K folder grouping, and the custom theme designer.

**2026-07-02: MindManager-inspired review.** A multi-agent review (5 code-inventory readers, 4
MindManager 23→2025/26 researchers, gap analysis, per-candidate adversarial verification against the
real repo) produced the backlog below. The six outright **bugs** it surfaced were fixed the same day
(commit `918a1eb`: swimlane persistence, Relationships/Inbox mobile sheets + dock activation,
Breadcrumb/BrainstormTimer theme tokens, reduced-motion reset-zoom, stale `files-mmst` flag). Every
backlog item below was **verified against the code** — evidence paths are as of that date. Three
review candidates were rejected as already shipped (user-savable map parts, instant task filters,
active-filter indicator) — don't re-propose them.

**Tier 3 (all 7 items) shipped the same day**, along with a cross-cutting `border`/`borderColor`
shorthand-conflict sweep found while verifying it — see `CHANGELOG.md` for the per-item detail.

Anything deliberately **not** built is recorded under *Deferred / blocked* or *Out of scope* below,
so the decisions don't get re-litigated.

## Backlog — 2026-07-02 MindManager review (execute later, order = suggested priority)

Sizes: **S** = hours, **M** = days, **L** = a week+. Each item: what + why → *Now* (verified current
state) → *Scope* (the exact delta).

### Tier 1 — top picks

1. **Live-map slides: custom deck frames the real canvas (L).** The biggest presentation gap vs
   MindManager. Studio's deck exports render topics as *text bullets* — node images, markers, styles,
   boundaries all vanish. MindManager's Slides view frames the actual map per slide (own collapse
   state + pan/zoom framing) and presents by animating the map.
   *Now:* `src/present/slides.ts` + `deckEdit.ts` (custom deck, per-slide notes) render bullets;
   `src/io/deck.ts` + `pptx.ts` export text only. The **cinematic guided walk**
   (`src/hooks/useGuidedWalk.ts`) already animates zoom frames on the real canvas.
   *Scope:* let the custom deck drive the cinematic camera (per-slide framing + collapse state), and
   render per-branch map images (via `exportSvg` per branch) into the PPTX/HTML deck exports instead
   of bullets. Canvas==export invariant applies — go through the shared resolvers.

2. **Create relationships silently, label inline (S).** Every relationship creation (drag-connect
   *and* linking mode) pops a modal label prompt, and cancel *still creates* the unlabelled link —
   friction for rapid linking. MindManager types labels directly on the line.
   *Now:* `FlowMindMap.tsx:2186-2195` + `2229-2233` call `editorPrompt` on both creation paths (a
   comment confirms cancel-still-creates). Inline label editing already shipped (feature
   `inline-link-label`, double-click the line; `linkEdit.ts`).
   *Scope:* remove `editorPrompt` from both paths; auto-open the existing inline label editor on the
   new edge.

3. **Relationship right-click context menu (S).** Right-clicking an edge jumps straight to a delete
   confirm — the only surface without a context menu. MindManager's edge menu offers flip/format/
   label/shape.
   *Now:* `FlowMindMap.tsx:2287` `onEdgeContextMenu` only fires the delete confirm. Label edit, type,
   style presets, arrow direction all exist on other surfaces (EdgeInspector, inline editor).
   *Scope:* replace the confirm with a context menu wiring those existing actions + delete.

4. **Marker/priority board columns — MindManager Icon View (M).** The Kanban board is tags-only;
   MindManager's Icon View keys columns to an icon group (default: priority) and drag reassigns the
   marker.
   *Now:* `src/board.ts` + `Kanban.tsx` key columns by tag and drag re-tags (`retagForMove`);
   single-select marker groups (Priority/Status/Mood/Vote) already exist in the model.
   *Scope:* a board column-source selector (tags vs a single-select marker group incl. task
   priority); dragging a card between marker columns reassigns that marker — a new keying mode in
   `board.ts`/`Kanban.tsx` reusing the retag-on-move logic.

5. **Schedule board: drag tasks onto date columns (M).** The Agenda panel is read-only date buckets;
   MindManager's Schedule view has an Unscheduled column + date columns where dropping a task assigns
   its date — the personal triage surface.
   *Now:* `src/agenda.ts` + `AgendaPanel` (`Panels.tsx:1345`) are read-only; `taskDate.ts` has
   `isOverdue`/`addDaysISO` helpers ready; Kanban drag plumbing exists.
   *Scope:* a drag-target board (Unscheduled + date columns) writing `task.due`. Cheapest angles:
   make AgendaPanel buckets drop targets, or add a date-mode to the Kanban column engine.

6. **PNG export: scale factor + transparent background (S).** PNG is fixed 1× on white — matters for
   pasting into decks/print.
   *Now:* `svgToPng` in `src/useMapExports.ts:16-34` rasterises at 1× (canvas = naturalWidth) and
   hard-fills `#ffffff`.
   *Scope:* a scale multiplier (2×/4× via `canvas.width = naturalWidth*scale` + `ctx.scale`) and a
   transparent-background toggle (skip the white fillRect), wired to both `exportPng` and `copyPng`;
   branch export (`BranchExportDialog`) inherits for free.

7. **Direct PDF file export (M).** The PDF path is print-dialog-only (page-size/multi-page control
   left to the user); MindManager exports real PDFs with page control.
   *Now:* feature `export-pdf` = "Print to PDF"; `src/useMapExports.ts:221-235` opens browser print
   via a hidden iframe. **pdf-lib is already a dependency** (used only by
   `scripts/build-book-pdf.mjs`).
   *Scope:* a client-side SVG→PDF exporter (pdf-lib + the shared `exportSvg.ts` renderer) with
   page-size/orientation options, alongside the existing print path. Keep it lazy-loaded (size
   budget).

8. **`.mmap` export fidelity: tags, task info, images (M).** The writer drops data **our own
   importer reads** — the highest-value item for real-MindManager migration credibility.
   *Now:* `src/io/mmap.ts` header (lines 28-30) documents dropping images/tags/task data; the
   importer's `extractTags`/`extractTask`/`extractImage` (`src/import/mmap.ts`) define the target
   schema exactly.
   *Scope:* write `TextLabels` (tags), `Task@StartDate`/`DeadlineDate`/`TaskPriority`/
   `TaskPercentage`/`Resources`, and `OneImage` + `bin/` image embedding. Stays clear of the
   deferred theme-styling/summary-bracket work. Determinism rules in the writer are load-bearing
   (FNV OId, fixed mtime) — keep them.

### Tier 2 — quick wins (S each)

9. **Inline summary rename.** Summaries alone open a modal prompt; callouts and edge labels edit
   inline. *Now:* `FlowMindMap.tsx:1170-1186` `handleRenameSummary` uses `editorPrompt`; callouts
   commit inline via `setCalloutText`. *Scope:* reuse the callout inline-edit pattern on the summary
   label chip (`Summaries.tsx`); keep empty-label-deletes semantics + OverlayInspector editing.

10. **Keyboard zoom: Ctrl/⌘ +/−/0.** Zoom needs wheel/controls/status-bar today; +/−/0 is universal
    muscle memory. *Now:* no bindings (`shortcuts.ts` lists only Scroll / Cmd+scroll). *Scope:* bind
    in the canvas keydown in `FlowMindMap.tsx` (`zoomIn`/`zoomOut`/`zoomTo(1)`, `preventDefault` to
    override browser zoom, respect reduced motion), add rows to the SHORTCUTS cheat sheet; guard
    against firing while editing text.

11. **Backspace deletes topics.** Only Delete is handled for topics; overlays accept both; Mac
    keyboards lack forward-Delete. *Now:* `keyIntent.ts:112` maps `e.key === "Delete"` only;
    overlays accept both (`FlowMindMap.tsx:1698`). *Scope:* add Backspace at `keyIntent.ts:112`
    (safe — the type-to-edit branch at line 119 only catches `key.length === 1`), update
    `shortcuts.ts` label + keyIntent tests.

12. **Quick Filter from any marker or tag.** The Markers & tags index is jump-only; MindManager's
    right-click Quick Filter shows/hides all topics with a marker from wherever you see it.
    *Now:* `MarkerTagIndex` (`Panels.tsx:1061`) is a "read-only navigation aid" (onPick only); the
    Power Filter pipeline + hide mode already exist. *Scope:* a filter/hide action on index rows
    (and on-node marker chips) that pre-fills the existing `FilterCriteria` — thin UI wiring, no new
    pipeline.

13. **Smart Ctrl+V routing.** Ctrl+V is image-only; branches need Ctrl+Shift+V; text needs the paste
    dialog — asymmetric with Ctrl+C. *Now:* `useClipboardImagePaste.ts` (images),
    `keyIntent.ts:87` (branch on Ctrl+Shift+V), `usePasteOutline.ts` (text dialog). *Scope:* one
    Ctrl+V dispatcher — internal branch clipboard → `pasteBranch`; image item → image pipeline; else
    route text through `parsePaste` (URL → linked topic, outline → subtree) without the dialog.

14. **"Move project": shift all dates ±N days.** Replanning a slipped plan means editing every date
    by hand; MindManager's Move Project shifts a whole set preserving offsets. *Now:* nothing like
    it exists (verified). *Scope:* a pure helper over the ISO `startDate`/`dueDate` in
    `src/taskDate.ts` + a bulk op in `src/mindmap/flow/ops.ts`, scoped to selected branch or whole
    map, ±N days, **one undo step**. No dependencies/Gantt — stays clear of the out-of-scope PM
    engine.

15. **Drag modifiers: Shift+drag detach, Ctrl+drag copy.** No drag-out-to-detach in tree mode
    (empty-canvas drop snaps back); duplicate is menu-only. *Now:* `detachBranch` op and
    duplicate/copy-branch exist; `handleDragStop` (`FlowMindMap.tsx:831-836`) ignores modifier keys.
    *Scope:* read `shiftKey` (empty-canvas drop → `detachBranch` instead of snap-back) and `ctrlKey`
    (drop → copy subtree instead of re-parent) in `handleDragStop`.

16. **Inline `#tag` accelerator while typing.** Keyboard-only tagging during capture — MindManager's
    text accelerators pop the tag picker on `#`. *Now:* tag autocomplete exists only in the
    inspector's Add-a-tag field (datalist, `Panels.tsx:2673`); the editor has `[[`/`@` link
    autocomplete (`src/mindmap/flow/linkAutocomplete.ts`) and slash commands, no `#` trigger.
    *Scope:* a `#` mid-text trigger in the topic editor reusing the `[[`/`@` picker machinery to
    assign an existing/new tag.

17. **Sticky-note colour set + preferred-style memory.** Sticky insert is single-amber; MindManager
    23.2 offers 9 colours + persistable preferred styles. *Now:* `addStickyNote`
    (`src/mindmap/flow/ops.ts`) hardcodes `STICKY_NOTE_STYLE`; recolouring after insert already
    works via the StyleBar fill picker. *Scope:* a small colour-variant palette at insert time + a
    persisted preferred default. Only the insert-time UX is new.

18. **Find & replace: search history.** MindManager remembers the last 10 searches.
    *Now:* replace-in-notes with topics/notes/both scoping **already shipped** (features
    `find-replace`, `replace-scope`; `src/components/FindReplaceOverlay.tsx`) — only the history is
    missing. *Scope:* a last-~10-queries dropdown, localStorage-backed.

19. **Command palette: visible trigger + panel parity.** The editor palette is hotkey-only (mobile
    users locked out) and misses panel toggles. *Now:* `useCommandPaletteHotkey.ts` is the only
    opener (`setCmdkOpen` never called from a button); `editorCommands.ts` `panel-*` list lacks
    agenda/maps/inbox though App has `agendaOpen`/`mapsOpen`/`inboxOpen`. *Scope:* a visible
    toolbar/IconRail ⌘K trigger + register `panel-agenda`/`panel-maps`/`panel-inbox`. (Deck is an
    export and already registered — not part of this.)

20. **Shared panel-name constants.** Dock tabs and the Panels menu use different vocabularies
    ("Markers & tags" vs "Markers & tags index", "Deck" vs "Slide deck (custom)"). *Now:* labels are
    inline literals (`App.tsx:1931-2127` vs `Toolbar.tsx:708-806`); the menu's parenthetical hints
    are deliberate. *Scope:* one shared base-name constant per panel — dock tab = base name, menu =
    base name + optional parenthetical hint.

### Tier 4 — big bets (L)

21. **StyleBar redesign: reflect state, group, enlarge targets.** ~35 write-only 18 px controls with
    tooltip-only labels; MindManager 24's context toolbar shows only relevant commands and always
    reflects current values. *Now:* `Panels.tsx:333-404` — colour pickers already open on the live
    value and the Wrap slider reflects selection; the rest is write-only. *Scope:* active-shape/
    border indication on the button grid, grouped/labelled sections, touch-sized controls. (The gap
    is narrower than it first looks — don't rebuild the pickers.)

22. **Smart containers: lanes/grids that capture and move topics (M–L, ⚠ adjacent to a
    deprioritised decision).** MindManager Smart Shapes (swim lanes, matrices) capture floating
    topics — moving the container moves contents. *Now:* backdrops are pure geometry fixed at the
    origin (`src/mindmap/flow/backdrop.ts`) — no containment, no drag-moves-contents. *Scope:*
    draggable swimlane/matrix backdrop kinds with region-membership capture in freeform mode.
    **Flag before starting:** the "infinite Miro-style object canvas" is recorded as
    feasible-but-deprioritised in Reference — this walks toward it.

23. **Free shapes on the canvas (L).** MindManager background objects (rect/oval/block arrow/
    chevron) enable ad-hoc SWOT/Venn/risk-grid composition. *Now:* `BackdropKind =
    onion|funnel|venn2|venn3` only (`src/model/types.ts:240`); text boxes are largely covered by
    sticky-note/floating topics — scope shapes only. *Scope:* a general background-shape layer
    reusing the Backdrop render/export seam (canvas==export invariant — shared resolver).

### Tier 5 — housekeeping / hygiene (no MindManager angle, found during the review)

24. **USER_GUIDE catch-up sweep: 91 of 228 catalogue entries are `manual:false`** — everything
    shipped since ~2026-06-19 (book/bookExample are 100%, the guide lags). A dedicated docs session:
    write the missing USER_GUIDE sections, flip flags as they land.

25. **Rich-text editing rides deprecated `document.execCommand`** (bold/italic/underline/colour in
    the topic editor). Works today; needs a migration plan before browsers pull it.

33. **Saved views + saved filters live in localStorage** — they don't travel with `.json` export or
    across machines. Consider persisting them in doc meta (like the deck) with a migration.

34. **XMind export asymmetry** — the writer emits relationships/detached topics **our own XMind
    importer can't read back**; styles/markers drop both ways. Either close the loop or document.

### Surveyed rough edges (unprioritised; record so they're not re-found)

Canvas/interaction: callout bubbles have no on-canvas drag (dx/dy fixed at creation); unlabelled
boundaries are selectable only via the 6 px border rim; type-to-edit **replaces** the topic text
(append-expecters get surprised; Escape/undo recovers); grid/timeline/radial spacing keys off the
single largest node (one image topic inflates every cell/ring); wrap grip only appears on
single-selected nodes ≥72 px tall, desktop only; freeform **group** drags skip alignment
guides/snapping; the relate grip is hidden on touch (Link to… is the fallback); floating topics
auto-stack below the map in tree layouts (free placement needs freeform mode).

Views/panels: Kanban has no column reorder, WIP limits, in-board card creation or ordering
(alphabetical tags); presentation keyboard lacks End/PageUp/PageDown and the elapsed timer resets on
exit; brainstorm timer has no audible time's-up cue and no custom duration; query grammar lacks OR,
`completion:`, and date-range comparisons; natural-language dates skip month-name forms ("Mar 14")
and relative weeks/months; `markerSuggest` cue words are English-only; flat vector markers cover 21
of 46 glyphs (the rest fall back to platform emoji, weakening identical-everywhere rendering).

Files/IO: version history is capped at 30 snapshots/map with no diff view; deep links resolve only
on the same machine/library; cross-tab same-map editing is warn-only (ignoring it still loses the
losing tab's autosave); 5 MB attachment cap + 800 px image downscale limit document-heavy use; no
`.txt`/`.csv`/`.html` file import (paste-only); Office imports are structure-only (.docx ignores
hyperlinks/images, .xlsx expects depth-per-column); save-back to disk + OS file association are
Chromium-desktop-only (documented).

## Open items (pre-review)

The MindManager `.mmap` importer is feature-complete for its scope (Phases A–C shipped). Both
real-file importer validations remain done — **`.mmap`** and **`.smmx`** — each owner-validated
**2026-06-19** and guarded by an env-gated integration test (`MMAP_FILE` / `SMMX_FILE`). Running a
genuine export through those env-gated tests is an optional extra-confidence check, not a blocker.
The single **manual MindManager open-test** of a Studio-exported `.mmap` still awaits Dann's next
MindManager access (backlog item 8 raises its value — re-test after shipping it).

## Deferred / blocked (off the active list)

- **AI assist** — **decided against (2026-06-15).** The biggest category-wide gap, but the only fit
  for a no-backend, local-first app is a keyless copy-prompt → paste-result bridge (or BYO-key),
  which isn't worth building. The manual path already exists: paste an outline / Markdown → map.
- **Theme-only `.mmap` styling + summary brackets** — a topic with no explicit colour inherits the
  MindManager `StyleGroup` theme (we don't resolve it), and summary spans are positional/implicit in
  the schema; both are low-ROI, left lossy by design.
- **LaTeX / math** — deferred by decision (heavy KaTeX + ~1 MB offline fonts; not native to MindManager).
- **True simultaneous multi-map / split view** — the sheet tab strip already covers tabbed
  switching; side-by-side comparison is a large change (selection/notes/style all assume one active
  `docRef`), deferred unless needed.

## Out of scope (by decision — won't build)

Recorded so the decisions don't get re-litigated (folded in from the retired MindManager gap doc): the
**project-management engine** (Gantt, resources, dependencies, cost, formulas / roll-up dashboards,
topic properties), **real-time collaboration / publishing / enterprise** (co-editing, comments,
access control, cloud/Teams hosting), **capture** (Snap-style web/mobile clippers), and a **separate
native mobile app** (the PWA is responsive — a native app is a different product). Also out by
design (2026-06-16): a **networked / multi-parent graph** — the model is a single-parent, **acyclic
tree**; cross-node links live in the relationship-arrow layer, and a TheBrain-style graph would
re-architect the product (cyclic *connectors* already ship as relationships). A local-first,
no-backend PWA can't and shouldn't chase these.

## Reference

- **Competitive gaps (19-tool survey — concluded 2026-06-16).** The standalone cross-tool comparison
  doc has been retired and folded in here. The category was surveyed across 19 mind-mapping tools; the
  B–G gap clusters shipped (see `CHANGELOG.md`) and the rest is decided. Feasible-but-deprioritised
  gaps, recorded for awareness only (**not a backlog**): voice / audio-memo capture, idea bank
  (capture-then-place), audio / video embed on a node, formulas / key-value attributes, spreadsheet
  data binding, embed-a-live-webpage, idea voting, arbitrary custom fonts, named bookmarks, native
  desktop / mobile shells, and an infinite Miro-style object canvas. The decided / blocked ones are
  under *Deferred* and *Out of scope* above.
- **Book worked examples — COMPLETE (2026-06-19).** `book` + `bookExample` are both at **100%**:
  every catalogued feature is covered in prose AND carries a concrete worked example across chapters
  1–7 (the import/export format adapters + PWA got concrete walkthroughs in chapter 6; the UX
  affordances got prose + examples in chapters 1/3/4/5).
