# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

Phase 1 (Brainstorming MVP) complete, the canvas-engine migration to **@xyflow/react** done (React
Flow is the only engine), and the **entire in-scope MindManager gap is now closed** — every
creation / visualisation / navigation / interchange capability the product set out to own ships,
including the phone layout. (The detailed MindManager gap-analysis doc has been retired; its
remaining items are folded in below.) Deployed to GitHub Pages on every push to `main` — live at
<https://mindmap-studio.struktureretsundfornuft.dk/>. See `CHANGELOG.md` for all shipped work.

## Open items

- [ ] **Grow the book** further. The recent **structure** features are now covered (summary topics,
      node shapes, free-canvas, onion/funnel/Venn backdrops, per-branch layout, sheets) — catalogue
      **manual 100%, book 84.8%** (`docs/features.json`). Remaining book gaps are in *other* areas:
      task markers (progress/priority/dates), conditional formatting + styles organizer, Kanban,
      quick-add / drop-link / timer, MindMup + Markmap import, saved filters, fuzzy find, start screen.
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
native mobile app** (the PWA is responsive — a native app is a different product). A local-first,
no-backend PWA can't and shouldn't chase these.

## Reference

- **Competitive feature matrix** — [`docs/competitive-feature-matrix.md`](docs/competitive-feature-matrix.md):
  the whole-category survey (19 tools) mapped to MindMap Studio, grouped into 11 areas, with the
  A–G gap clusters (B–G shipped; A — AI — deferred).
- **Book worked examples** — `book` ~85%, `bookExample` ~46% (`docs/features.json`). The recent
  structure features are where to keep growing it (see "Grow the book" above).
