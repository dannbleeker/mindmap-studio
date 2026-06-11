# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Blocking / decisions

- [ ] **GitHub Pages deploy** — the repo is live and CI is green; the actual
      Pages publish (build + deploy workflow) isn't set up yet.

## Phase 1 — Brainstorming MVP

Done: keyboard editing (mind-elixir), `.mmap` + Markdown import, Markdown export,
edit-capture (canvas edits → canonical model), autosave + reload (IndexedDB), a
multi-map library (list / switch / new / delete), PNG / SVG export, and an
installable offline PWA. Remaining:

- [ ] Upgrade mind-elixir 4→5 (unblocks the node editing UI; re-verify render +
      edit-capture + persistence after the bump).
- [ ] Node icons/tags/style/link editing UI (`@mind-elixir/node-menu` — needs the
      mind-elixir 5 upgrade above).
- [ ] Deploy to GitHub Pages — **needs Dann**: enable Pages in repo settings +
      confirm a public live deploy (outward-facing, so skipped during the loop).

## Later

- [ ] Phase 2 — robust `.mmap` batch import, Walk-Through presentation mode,
      share/export (PDF, self-contained HTML), images + boundaries.
- [ ] Validate the `.mmap` importer's notes / hyperlinks / relationships /
      boundaries / floating-topic paths against a real map that *uses* them — the
      current impl is XSD-authoritative + synthetic-tested, but Dann's sample
      exercised none of them.
- [ ] Custom tapered-branch renderer (only if pixel-exact organic branches are
      ever wanted; mind-elixir's default is already close).
- [ ] Bump Vite 6 → 8 to match TP Studio.
- [ ] Lazy-load the importer (`fast-xml-parser`) via dynamic import so it stays
      out of the initial bundle (added ~15 kB gz when wired into the app).
- [ ] CI: bump GitHub Actions majors (checkout / setup-node / pnpm-action-setup)
      to Node 24-compatible versions. Node 20 runtime is deprecated and
      auto-forced on 2026-06-16 — currently a benign CI annotation, not a
      failure. Verify the new majors exist before bumping (don't redden CI).
