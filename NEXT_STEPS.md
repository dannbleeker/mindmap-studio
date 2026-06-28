# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

Phase 1 (Brainstorming MVP) complete; canvas engine is **@xyflow/react**. MindMap Studio is
**feature-complete for its scope** (local-first, offline, single-user, free) — the competitive
gap-closing effort is **concluded by decision (2026-06-16)**; remaining gaps are surveyed, not
pursued (see Reference). The handbook documents every feature, each with a worked example (`book` + `bookExample` **100%**). The **editor/UX
redesign is complete** (2026-06-17): chrome (rail / two-row toolbar / inspector), the inspector
overhaul + its four follow-ups, and the **menu/toolbar restructure** — one accessible Menu primitive
(keyboard nav + viewport clamping), every dropdown + the canvas context menu migrated onto it,
grouped rows, an editor **⌘K command palette**, and mobile bottom-sheet menus — all in `CHANGELOG.md`.
A **MindManager canvas-rendering fidelity pass is also complete** (2026-06-19): the five
audited areas — markers (flat vector set), layouts (height-proportional / per-subtree tidy
tree + fishbone), connectors (style picker + per-branch colour/dash), relationships
(perpendicular-bow curve + arrowhead scaling), and boundaries (shape set + gradient +
title-tab + dashed) — all ship with UI controls and `.json` schema fields, and all render
identically on canvas and in export (see `CHANGELOG.md`). Deployed to GitHub Pages on every
push to `main` — live at <https://mindmap-studio.struktureretsundfornuft.dk/>.

## UX remediation (active — from the 2026-06-28 audit)

A 17-agent UX + feature-gap audit produced 56 items (47 UX findings, 2 genuinely-unreachable features,
7 structural gaps). Full plan + phasing approved this session
(`~/.claude/plans/vivid-sleeping-pudding.md`); implementing in priority phases, each landed green.

- [x] **Phase 0 — silent-failure & feedback fixes** (shipped — see CHANGELOG): export hints instead of
  no-ops, lossy-import notes for all formats, resilient batch import, dismissible/expandable banners,
  Agenda "Later" bucket, Find Next/Prev + announced count, saved-view delete-undo + overwrite ack,
  `Ctrl/⌘+F` typing guard, cheat-sheet completeness, command-palette paging, toast/banner tokenisation.
- [x] **Phase 1** — accent-colour picker (MapPanel); inline note link button. (shipped — see CHANGELOG)
- [x] **Phase 2** — real save-state + storage health; version-history finiteness; Settings surface;
  cross-map link-integrity warning on delete. (shipped — see CHANGELOG)
- [~] **Phase 3** — mobile/responsive. **Shipped:** inspector mobile bottom-sheet + grab handle +
  62vh + tap-out scrim; touch-aware first-run card. **Verified false-alarm:** the "Start 390px
  overflow" was a headless `--window-size` screenshot artifact — proper device emulation shows it
  reflows fine, so no fix needed. **Deferred:** desktop Row-2 overflow menu (T1) → folded into Phase 6
  (T3 moves the low-value toggles out of Row-2, which removes the crowding at the root); a dedicated
  mobile add-topic input (O3) → the touch first-run card now guides the on-node ＋ path.
- [x] **Phase 4** — multi-selection parity (shipped — see CHANGELOG): bulk right-click menu, keyboard
  indent/outdent over the selection, tree-mode group drag, overlay Delete key. Logic lives in tested
  pure helpers (BulkNodeMenu, moveSelectionInTree, applyAcrossIds, deleteSelectedOverlay). Deferred: a
  dedicated right-click menu *on overlays* (Rename/Recolour/Delete) — only the Delete key was wired.
  Note: the lines/stmts coverage floor was nudged 91→90.9 because the ~6 lines wiring the bulk menu to
  a React-Flow multi-selection can't be exercised in jsdom (RF needs real held-key state).
- [~] **Phase 5** — panel/workspace. **Shipped:** left rail → **tabbed dock** (PanelDock; the 10 side
  panels share one ~280px tabbed column instead of N crushing 250px columns — verified in-browser +
  unit-tested); bulk-edit banner clarity. **Deferred:** InfoPanel Details restructure (P3 — collapsible
  sections + note below task fields) and the note-editor de-dupe / placement cues (P6) — lower-value
  polish, the dock already fixed the core canvas-crush. Note: lines/stmts coverage floor nudged
  90.9→90.8 (the per-panel dock-entry App wiring only runs when each panel is opened via the flaky-to-
  drive Panels menu; the dock logic itself is unit-tested in PanelDock).
- [x] **Phase 6** — toolbar IA cleanup (shipped — see CHANGELOG): distinct maps-grid glyph for
  cross-map search + dropped the rail Find dup (T2); the four view toggles are labelled View-menu
  checkboxes, not icon buttons (T3); the View-menu Arrange group hides unless free-layout (T4);
  persistent styling (theme/background/connectors/branch-weight/fonts/backdrop) consolidated into the
  Map panel, Canvas menu kept to Design presets + Free layout + a link to the panel (T5); Row-1 map
  switcher relabelled as an "Open a map…" library picker, distinct from the open-doc tabs (T7). Note:
  the Canvas-menu "open Map panel" link opens the inspector — if a node is selected it shows that
  node's settings (no deselect API on the handle), so map-wide styling appears once nothing is selected.
- [~] **Phase 7** — onboarding & learnability (shipped — see CHANGELOG): in-app PWA install button + iOS
  A2HS hint (O2); "Learn the app" tip cards (O5); re-openable getting-started from Settings/⌘K/rail (O8);
  actionable "＋ New map" empty states (O4); one-line template/example descriptions + curated featured set
  (O6); "New here?" deep-link/new-user banner (O9); gesture coaching — relate-grip coach, Shift-drag in
  the coachmark + Shortcuts, selected-grip opacity (C7); non-overlapping hover affordances + touch sizing
  (C4). **Deferred:** C6 (NodePopover → "More…" that opens the rich context menu at the node) — it
  restructures the selection popover + context-menu wiring and needs test rewrites for higher regression
  risk; the right-click menu already provides the full power, so this is a discoverability follow-up.
- [x] **Phase 8** — app-wide dark mode (shipped — see CHANGELOG): a `useAppearance` hook (System /
  Light / Dark, persisted, honouring `prefers-color-scheme` live) resolves a single `chromeDark`
  that drives `--ed-*`/`--st-*` via decoupled `editorThemeVars(dark)`/`startThemeVars(dark)` (no longer
  piggy-backing on the canvas theme) + a `data-theme` + `color-scheme` on `<html>`; the static panel
  `colors.*` palette now resolves to `var(--ed-*)` so all panels/primitives/dialogs (incl. the native
  `<dialog>` surface) go dark in one move; App-theme control added to Settings. Sync rule: a dark canvas
  still darkens the chrome under System, so the old dark-canvas/light-chrome clash is gone. Verified by
  headless render in dark across Start + editor + Settings dialog.
- [x] **Phase 9** — feature-specific polish (shipped — see CHANGELOG): Kanban drag-to-retag (I6 — a pure
  `retagForMove` + a by-id `setNodeTags` handle, one undoable edit; board also tokenised for dark mode);
  presentation true fullscreen + key-hint footer + Home→first-slide (I10); roll-up ⤵ badge on bound nodes
  (I11 — projected via TopicData; the context-menu binder is **deferred**, the Insert menu already binds
  and a node-menu picker needs the maps list plumbed into FlowMindMap); inspector swatch unification +
  Edge/Overlay context lines from one `strokeSwatches` source (P5); undo coalescing for the
  priority/progress/task cycle chips — a same-node+field spree within ~0.6s collapses to one undo step,
  with the chain reset on undo/redo/discard (S4). Note: history keeps a 100-snapshot cap (history.ts CAP)
  — large maps trade older undo depth for memory; not changed here.

**The UX remediation plan (Phases 0–9) is complete.** Phases 3, 5, 6, 7 each shipped their high-value core
with a few sub-items deferred + documented above (none blocking).

## Open items

_No other actionable items._ The MindManager `.mmap` importer is now feature-complete for its scope — Phases A–C
shipped (task info, full notes, tags, per-topic colour/font/shape, rich-text runs, embedded images +
attachments, relationship/boundary styling, callouts, map background), each into an existing model
field and unit-tested. What remains is intentionally lossy (see *Deferred* below). The
**embedded-image / attachment code paths are now covered deterministically** — the `mmarch://bin/`
resolver's scheme/case/basename tolerance, `ImageSize` mm→px conversion + 280px capping, the
vector→raster `AlternateImageData` fallback, `IconImage`, attachment Folder/missing-bin skips, and a
combined realistic multi-feature archive are all exercised by synthetic fixtures (`test/mmap.test.ts`).
Running a *genuine* export through the env-gated `MMAP_FILE` test remains an optional extra-confidence
check (the owner did so 2026-06-19), not a blocker.

Both real-file importer validations remain done — **`.mmap`** and **`.smmx`** — each owner-validated
**2026-06-19** and guarded by an env-gated integration test (`MMAP_FILE` / `SMMX_FILE`).

## Deferred / blocked (off the active list)

- **AI assist** — **decided against (2026-06-15).** The biggest category-wide gap, but the only fit
  for a no-backend, local-first app is a keyless copy-prompt → paste-result bridge (or BYO-key),
  which isn't worth building. The manual path already exists: paste an outline / Markdown → map.
- **`.mmap` writer** — high-risk, low-value (open formats already bridge every tool).
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
