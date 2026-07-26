# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

Phase 1 (Brainstorming MVP) complete; canvas engine is **@xyflow/react**. MindMap Studio is
**feature-complete for its scope** (local-first, offline, single-user, free) — the competitive
gap-closing effort is **concluded by decision (2026-06-16)**; remaining gaps are surveyed, not
pursued (see Reference). **Docs coverage:** `manual` is **100%** (2026-07-03 sweep). `book` coverage
is **editorial by design** since the 2026-07-08 revision (which also added the method chapters, 2 and
8): every feature that serves the book's technique-first narratives is written up, and the remaining
`book:false` catalogue entries are deliberate exclusions (UI chrome/affordances that don't belong in
the book — the user guide is the 100% reference) — not a backlog. The **editor/UX redesign**
(2026-06-17) and the **MindManager
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

**Tiers 1–4 — all 30 items — shipped on 2026-07-02** (batches A–G, then the Tier-4 blocks; see
`CHANGELOG.md` for the per-item detail), along with a cross-cutting `border`/`borderColor`
shorthand-conflict sweep found while verifying Tier 3. The three **Tier 5 housekeeping** items shipped
on 2026-07-25/26, closing the review backlog; the two residuals they left are listed under *Open
residuals*.

Anything deliberately **not** built is recorded under *Deferred / blocked* or *Out of scope* below,
so the decisions don't get re-litigated.

## Backlog — 2026-07-02 MindManager review: CLOSED

**All 33 items are shipped** — Tiers 1–4 on 2026-07-02, and the three Tier-5 housekeeping items (25
`execCommand`, 33 saved views, 34 XMind round-trip) on 2026-07-25/26. Per-item detail is in
`CHANGELOG.md`. The two deliberate residuals they left are under *Open residuals* below.

## Open residuals (from the Tier 5 batch, 2026-07-26)

- **The two list commands still call `document.execCommand`** (`insertUnorderedList` /
  `insertOrderedList`), isolated behind `listFallback()` in `src/richTextCommands.ts` — everything else
  in both editors is now selection/Range based. Left deliberately: reimplementing list toggling
  (splitting blocks into items, merging adjacent lists, nesting) is a rich-text-engine problem and a
  shaky version would regress a working editor. `listFallback` already returns false if a browser drops
  the API, so the failure mode is a dead button, not a crash. Related behaviour note: inline formatting
  now requires a **selection** — the old collapsed-selection "typing style" has no standards-track
  equivalent.
- **Settings export / import** — the genuine gap behind the declined half of item 33. Saved *filter*
  presets are app-wide by design and deliberately stayed in localStorage (see *Deferred* below), so the
  way to get them onto a second machine is exporting preferences, not scoping them to a document. Not
  started; no size estimate yet.

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

- **Saved *filter* presets stay app-wide in localStorage — decided 2026-07-26, don't re-raise as
  written.** Backlog item 33 asked for saved views *and* filters to move into doc meta; the views half
  shipped, the filter half was declined on recon. `FilterCriteria` is entirely generic (text / markers /
  tags / due / priority / completion / relationship direction + type) with **no map-specific ids**, and
  `filter.ts` documents the presets as "persisted app-wide, reusable across maps". Scoping them to a
  document would *remove* that reuse — a preset saved on one map would stop appearing on the next —
  turning a working feature into a per-map one. The real gap (getting them to a second machine) is a
  settings export, listed under *Open residuals*.

- **UI localisation (i18n) — analysed 2026-07-25, deferred by decision; the *bugs* it surfaced are
  fixed.** The app is English-only with no infrastructure: no library, zero `Intl.*` calls, no
  `navigator.language`, no `dir`. A sweep counted **~2,000 distinct user-facing strings** (~2,730 call
  sites) across **135 of 235** source files, of which ~1,440 are must-do chrome + IO messages and ~560
  are seed content (`examples.ts`, `templates.ts`, marker/sticker names and their English *search
  keywords*); the top 9 files carry 57%. Extraction won't be purely mechanical for ~340 of them
  (expression-form props, interpolated templates, `editorCommands.ts`'s positional tuples).
  Locale-sensitive logic beyond strings: 15 date sites (hand-rolled `timeAgo`, English `MONTHS`, and
  `taskDate.parseNaturalDate`'s English-only weekday/`today`/`+Nd` grammar — logic work, not
  translation), 11 number sites, 18 hand-rolled `n === 1 ? "" : "s"` plurals, 21 collation sites (9 raw
  `.sort()`, 12 optionless `localeCompare` — Danish `å` already sorts wrong), 103 locale-unsafe
  `toLowerCase` calls across 40 files (incl. the exported interactive HTML's own search), and English
  regex cue-lists in `markerSuggest.ts`.
  Two constraints shape any implementation: **i18next is not viable** (~40 kB against a 165 kB gz entry
  budget currently at 164.0) — a ~1-2 kB `t()` plus lazily-fetched per-locale JSON is the fit, with
  every formatter (`NumberFormat`/`RelativeTimeFormat`/`PluralRules`/`Collator`/`Segmenter`) native and
  free; and **text metrics must not use canvas `measureText`**, which would make export output
  machine-dependent and break the byte-identical export snapshots — the shipped `widthUnits()`
  per-script table is the deterministic form. Rough shape if picked up: infra 1 session, extraction 3-5,
  export pipeline 2 (SVG embeds no fonts; PDF is image-only; PPTX hardcodes `lang="en-US"` with empty
  `<a:ea>`/`<a:cs>`; XLSX is Calibri-only), content plumbing 1.
- **RTL — deferred (2026-07-25), lower value than it looks and gated on a spike.** ~113 physical
  left/right CSS and inline-style sites in the chrome, 0 logical properties. Scope note that makes it
  cheaper than it first appears: the **39 canvas `flow/*` sites must NOT be mirrored** — a node's
  `side` is persisted *geometry* the user authored, not text direction — and arrow-key semantics need
  only a ~5-line mirror at the `keyIntent.ts` boundary, because `ops.nextSelectionId` is already purely
  topological (left = parent) rather than spatial, with the freeform `nudge` deliberately excluded.
  Unverified risk to spike first: whether `dir="rtl"` on the chrome can be cleanly isolated from the
  React Flow viewport's own transform maths. Note Arabic/Hebrew *content* already renders correctly
  inside nodes via the Unicode bidi algorithm — what's LTR-only is the chrome.
- **AI assist** — **decided against (2026-06-15).** The biggest category-wide gap, but the only fit
  for a no-backend, local-first app is a keyless copy-prompt → paste-result bridge (or BYO-key),
  which isn't worth building. The manual path already exists: paste an outline / Markdown → map.
- **Theme-only `.mmap` styling + summary brackets** — a topic with no explicit colour inherits the
  MindManager `StyleGroup` theme (we don't resolve it), and summary spans are positional/implicit in
  the schema; both are low-ROI, left lossy by design.
- **LaTeX / math** — deferred by decision (heavy KaTeX + ~1 MB offline fonts; not native to MindManager).
- **True simultaneous multi-map / split view** — the multi-doc tab strip already covers tabbed
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
