# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

Phase 1 (Brainstorming MVP) complete; canvas engine is **@xyflow/react**. MindMap Studio is
**feature-complete for its scope** (local-first, offline, single-user, free) — the competitive
gap-closing effort is **concluded by decision (2026-06-16)**; remaining gaps are surveyed, not
pursued (see Reference). The handbook documents every feature with a worked example (`book` +
`bookExample` **100%**). The **editor/UX redesign** (2026-06-17) and the **MindManager canvas-fidelity
pass** (2026-06-19) are both complete. Deployed to GitHub Pages on every push to `main` — live at
<https://mindmap-studio.struktureretsundfornuft.dk/>.

**All remediation programmes are shipped** — see `CHANGELOG.md` for the per-item detail:

- the **2026-06-28 UX + feature-gap audit** (56 items, Phases 0–9);
- the **2026-06-29 UI review** (48 suggestions, Phases 1–12, including 10b wrap-width **Layers 1 & 2** —
  the Style-tab snap slider *and* the on-canvas right-edge drag grip);
- the **2026-06-30 UI research** report
  ([`docs/UI_RESEARCH_2026-06-30.md`](docs/UI_RESEARCH_2026-06-30.md), phases UI-1…UI-7);
- the **2026-07-01 UX/feature-gap batch** — space-bar pan, natural-language dates, touch outline
  drag-reorder, typed relationships, export-a-branch, deck/PPTX speaker notes, visual interactive-HTML
  export, library folders + ⌘K folder grouping, and the custom theme designer.

Anything from those efforts that was deliberately **not** built is recorded under *Deferred / blocked*
or *Out of scope* below, so the decisions don't get re-litigated.

## Open items

_No actionable items._ The MindManager `.mmap` importer is feature-complete for its scope — Phases A–C
shipped (task info, full notes, tags, per-topic colour/font/shape, rich-text runs, embedded images +
attachments, relationship/boundary styling, callouts, map background), each into an existing model
field and unit-tested; what remains is intentionally lossy (see *Deferred*). Both real-file importer
validations remain done — **`.mmap`** and **`.smmx`** — each owner-validated **2026-06-19** and guarded
by an env-gated integration test (`MMAP_FILE` / `SMMX_FILE`). Running a genuine export through those
env-gated tests is an optional extra-confidence check, not a blocker.

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
