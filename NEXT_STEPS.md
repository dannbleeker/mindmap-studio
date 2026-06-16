# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

Phase 1 (Brainstorming MVP) complete; the canvas engine is **@xyflow/react** (the only one); the
**entire in-scope MindManager gap is closed**, and the broader cross-tool gap is mostly closed too —
the competitive matrix is down to **5 partials** plus deferred / out-of-scope items (see Reference).
The handbook (*Thinking in Maps*) now documents every feature (`book` 100%). Deployed to GitHub
Pages on every push to `main` — live at <https://mindmap-studio.struktureretsundfornuft.dk/>. See
`CHANGELOG.md` for all shipped work.

## Open items

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

- **Competitive feature matrix** — [`docs/competitive-feature-matrix.md`](docs/competitive-feature-matrix.md):
  the cross-tool **gap** list (19 tools surveyed) — what the category does that MindMap Studio
  doesn't or only partly has, grouped into 11 areas, with the A–G gap clusters (B–G shipped; A — AI —
  deferred). Shipped (✅) features were pruned out (2026-06-15); see `CHANGELOG.md` for those.
- **Book worked examples** — every feature is now covered in prose (`book` **100%**); the only
  remaining book dimension is worked examples (`bookExample` ~41% in `docs/features.json`) — optional
  polish: add a worked example to a chapter when a feature genuinely benefits from one.
