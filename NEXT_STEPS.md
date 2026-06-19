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

## Open items

_None actionable._ Both real-file importer validations are now done — **`.mmap`** (a feature-rich
MindManager export) and **`.smmx`** (a real ~100-topic SimpleMind export), each
owner-validated **2026-06-19** with zero content loss and guarded by an env-gated integration test
(`MMAP_FILE` / `SMMX_FILE`). The only remaining importer gap is embedded-image `.mmap` import, under
*Deferred* below (blocked on an image-bearing sample).

## Deferred / blocked (off the active list)

- **AI assist** — **decided against (2026-06-15).** The biggest category-wide gap, but the only fit
  for a no-backend, local-first app is a keyless copy-prompt → paste-result bridge (or BYO-key),
  which isn't worth building. The manual path already exists: paste an outline / Markdown → map.
- **Image-bearing `.mmap` import** — blocked on a real image-bearing sample.
- **`.mmap` writer** — high-risk, low-value (open formats already bridge every tool).
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
