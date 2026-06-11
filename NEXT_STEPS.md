# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Blocking / decisions

- [ ] **GitHub Pages deploy** — the repo is live and CI is green; the actual
      Pages publish (build + deploy workflow) isn't set up yet.

## Phase 1 — Brainstorming MVP

Done: keyboard editing (mind-elixir), `.mmap` + Markdown import, Markdown export,
edit-capture (canvas edits → canonical model), and autosave + reload (IndexedDB).
Remaining:

- [ ] Multi-map library — list / switch / new / delete maps (autosave foundation
      is in; today there's a single "current" map in IndexedDB).
- [ ] Icons / tags / notes editing UI on nodes (mind-elixir node-menu plugin).
- [ ] PNG / SVG export (mind-elixir's built-in `exportPng` / `exportSvg`).
- [ ] PWA offline (vite-plugin-pwa).
- [ ] Deploy to GitHub Pages.

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
