# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

Phase 1 (Brainstorming MVP) complete, the canvas-engine migration to **@xyflow/react** done (React
Flow is the only engine), and the **MindManager layouts-and-structures gap is closed** (the A–G
competitive clusters are done except AI; gap-analysis §2 fully closed). Deployed to GitHub Pages on
every push to `main` — live at <https://mindmap-studio.struktureretsundfornuft.dk/>. See
`CHANGELOG.md` for all shipped work.

## Open items

- [ ] **AI assist** — the one remaining major cluster. Only a **keyless copy-prompt → paste-result
      bridge** (or optional BYO-key) fits the no-backend identity; paste-to-tree is half-built via
      OPML/Markdown import. Prompt→map, expand-branch, doc/URL→map, summarise. *Needs a go/no-go.*
- [ ] **Grow the book** further. The recent **structure** features are now covered (summary topics,
      node shapes, free-canvas, onion/funnel/Venn backdrops, per-branch layout, sheets) — catalogue
      **manual 100%, book 84.8%** (`docs/features.json`). Remaining book gaps are in *other* areas:
      task markers (progress/priority/dates), conditional formatting + styles organizer, Kanban,
      quick-add / drop-link / timer, MindMup + Markmap import, saved filters, fuzzy find, start screen.
- [ ] **Validate importers against real feature-rich files.** The `.mmap` + `.smmx` importers are
      spec/XSD-authoritative and integration-tested, but only real exports (an `MMAP_FILE`, a real
      SimpleMind file) fully close them.

## Deferred / blocked (off the active list)

- **Image-bearing `.mmap` import** — blocked on a real image-bearing sample.
- **`.mmap` writer** — high-risk, low-value (open formats already bridge every tool).
- **LaTeX / math** — deferred by decision (heavy KaTeX + ~1 MB offline fonts; not native to MindManager).
- **True simultaneous multi-map / split view** — the sheet tab strip already covers tabbed
  switching; side-by-side comparison is a large change (selection/notes/style all assume one active
  `docRef`), deferred unless needed.

## Reference

- **Competitive feature matrix** — [`docs/competitive-feature-matrix.md`](docs/competitive-feature-matrix.md):
  the whole-category survey (19 tools) mapped to MindMap Studio, grouped into 11 areas, with the
  A–G gap clusters (B complete; only A — AI — open).
- **MindManager gap analysis** — [`docs/mindmanager-gap-analysis.md`](docs/mindmanager-gap-analysis.md):
  the MindManager-specific deep audit. The renderer-ceiling cluster and **all of §2 (layouts &
  structures)** are closed; it's the MindManager-side record of what shipped.
- **Book worked examples** — `book` ~80%, `bookExample` ~46% (`docs/features.json`). The recent
  structure features are where to keep growing it (see "Grow the book" above).
