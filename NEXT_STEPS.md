# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

MindMap Studio is **feature-complete for its scope** (local-first, offline, single-user, free) and
**live** at <https://mindmap-studio.struktureretsundfornuft.dk/> (GitHub Pages, custom domain,
redeployed on every push to `main`). Canvas engine is **@xyflow/react**.

**Docs coverage:** the user manual covers **100%** of the feature catalogue. `book` coverage is
**editorial by design** — the remaining `book:false` catalogue entries are deliberate exclusions (UI
chrome/affordances that don't belong in a technique-first book; the user guide is the 100% reference),
**not a backlog**.

Every remediation programme is shipped, including the 2026-07-02 MindManager review (all 33 items,
Tiers 1–5). Per-item detail lives in `CHANGELOG.md`. Three of that review's candidates were rejected as
**already shipped** — user-savable map parts, instant task filters, active-filter indicator —
**don't re-propose them**. Anything deliberately **not** built is recorded under *Deferred / blocked*
or *Out of scope*, so the decisions don't get re-litigated. Known-thin areas that are neither open work
nor decided sit in [`docs/KNOWN_ROUGH_EDGES.md`](docs/KNOWN_ROUGH_EDGES.md).

## Open residuals (2026-07-26)

- **The two list commands still call `document.execCommand`** (`insertUnorderedList` /
  `insertOrderedList`), isolated behind `listFallback()` in `src/richTextCommands.ts` — everything else
  in both editors is now selection/Range based. Left deliberately: reimplementing list toggling
  (splitting blocks into items, merging adjacent lists, nesting) is a rich-text-engine problem and a
  shaky version would regress a working editor. `listFallback` already returns false if a browser drops
  the API, so the failure mode is a dead button, not a crash. Related behaviour note: inline formatting
  now requires a **selection** — the old collapsed-selection "typing style" has no standards-track
  equivalent.
- ~~**Settings export / import**~~ — **SHIPPED 2026-07-26.** Settings ▸ *Preferences file*; see
  `CHANGELOG.md`. Saved filter presets, custom themes, named styles, panel layout and the
  accessibility preferences travel; the branch clipboard and ⌘K recents deliberately don't.

## Blocked on owner access

- **Manual MindManager open-test of a Studio-exported `.mmap`.** The writer is Studio-faithful but has
  never been opened in real MindManager; the `.mmap`/`.smmx` *importers* are both owner-validated
  (2026-06-19) and guarded by env-gated integration tests (`MMAP_FILE` / `SMMX_FILE`). Awaits Dann's
  next MindManager access. Value rose once the writer began emitting tags, task metadata and embedded
  images, so re-test against that.

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
  Two constraints shape any implementation: **i18next is not viable** (~40 kB against the gz entry
  budget in `scripts/size-budget.mjs`, which the app already nearly fills) — a ~1-2 kB `t()` plus
  lazily-fetched per-locale JSON is the fit, with
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
