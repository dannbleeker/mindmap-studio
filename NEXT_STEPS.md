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

**Tiers 1–4 — all 30 items — shipped on 2026-07-02** (batches A–G, then the Tier-4 blocks; see
`CHANGELOG.md` for the per-item detail), along with a cross-cutting `border`/`borderColor`
shorthand-conflict sweep found while verifying Tier 3. Only the **Tier 5 housekeeping** items below
remain open.

Anything deliberately **not** built is recorded under *Deferred / blocked* or *Out of scope* below,
so the decisions don't get re-litigated.

## Backlog — 2026-07-02 MindManager review (remaining: Tier 5 housekeeping)

Tiers 1–4 shipped (see `CHANGELOG.md`). Sizes: **S** = hours, **M** = days, **L** = a week+. Each
item: what + why → *Now* (verified current state) → *Scope* (the exact delta).

### Tier 5 — housekeeping / hygiene (no MindManager angle, found during the review)

24. **USER_GUIDE catch-up sweep: 115 of 253 catalogue entries are `manual:false`** — everything
    shipped since ~2026-06-19 (including the 2026-07-02 Tier 1–4 batch; book/bookExample lag too now).
    A dedicated docs session: write the missing USER_GUIDE sections, flip flags as they land.

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
