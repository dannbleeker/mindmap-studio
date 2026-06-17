# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

Phase 1 (Brainstorming MVP) complete; canvas engine is **@xyflow/react**. MindMap Studio is
**feature-complete for its scope** (local-first, offline, single-user, free) — the competitive
gap-closing effort is **concluded by decision (2026-06-16)**; remaining gaps are surveyed, not
pursued (see Reference). The handbook documents every feature (`book` 100%), and the
**foundation-hardening run (2026-06-16)** prepped the chrome for the editor/UX redesign (design
tokens + primitives, `<Toolbar>` / `<Dialog>` / `usePanels()` extracted, canvas memoised, coverage
~44%→~55%) — all in `CHANGELOG.md`. Deployed to GitHub Pages on every push to `main` — live at
<https://mindmap-studio.struktureretsundfornuft.dk/>.

## Open items

- [ ] **UX redesign of the canvas/editor chrome (menus / toolbars / inspectors).** The next planned
      effort: restructure the editor shell — a proper menu system (nested menus + keyboard nav on the
      Phase-C primitives), a reorganised toolbar, and cleaner inspector/panel layout — now that the
      chrome is extracted into token-driven components with a regression test net behind it.
      *Inspector overhaul landed (2026-06-17): the Topic-info panel is a themed `.mm-inspector` shell
      (re-themes in every palette), resizable + persisted, with a breadcrumb + quick-facts header,
      denser label-left property rows, keyboard-accessible tabs, "Mixed" handling in bulk edit, and a
      "Linked from" backlinks section. The no-selection slot is now an editable **Map** panel
      (title / theme / layout / background / line-jumps / backdrop rings), and clicking a relationship
      opens an **EdgeInspector** (label / direction / colour / width / style / delete, canvas==export).
      Still open: the menu/toolbar restructure; **bulk markers + tags** (need set-semantics, stay
      single-topic); and the heavier **overlay editing** — per-overlay colours + click-to-select for
      individual boundaries / summaries / callouts (need new model fields), so those still edit on the
      canvas (the backdrop's rings/remove are in the inspector).*
- [ ] **Validate importers against real feature-rich files.** The `.mmap` + `.smmx` importers are
      spec/XSD-authoritative and integration-tested, but only real exports (an `MMAP_FILE`, a real
      SimpleMind file) fully close them.

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
- **Book worked examples** — every feature is now covered in prose (`book` **100%**); the only
  remaining book dimension is worked examples (`bookExample` ~54% in `docs/features.json`) — optional
  polish: add a worked example to a chapter when a feature genuinely benefits from one.
