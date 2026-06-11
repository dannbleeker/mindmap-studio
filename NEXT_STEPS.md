# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Blocking / decisions

- [ ] **GitHub Pages deploy** — the repo is live and CI is green; the actual
      Pages publish (build + deploy workflow) isn't set up yet.

## Phase 1 — Brainstorming MVP

- [ ] Keyboard-first capture (Enter = sibling, Tab = child), inline rename.
- [ ] Icons / tags / notes on nodes.
- [ ] Autosave + multi-map library (IndexedDB via Dexie).
- [ ] Markdown import / export.
- [ ] PNG / SVG export (snapdom).
- [ ] PWA offline (vite-plugin-pwa).
- [ ] Deploy to GitHub Pages.

## Later

- [ ] Phase 2 — robust `.mmap` batch import, Walk-Through presentation mode,
      share/export (PDF, self-contained HTML), images + boundaries.
- [ ] `.mmap` importer follow-ups: import floating/detached topics (currently
      counted + warned, not imported); verify the real notes + relationship
      formats (the sample map had neither, so those code paths are still guesses).
- [ ] Custom tapered-branch renderer (only if pixel-exact organic branches are
      ever wanted; mind-elixir's default is already close).
- [ ] Bump Vite 6 → 8 to match TP Studio.
- [ ] CI: bump GitHub Actions majors (checkout / setup-node / pnpm-action-setup)
      to Node 24-compatible versions. Node 20 runtime is deprecated and
      auto-forced on 2026-06-16 — currently a benign CI annotation, not a
      failure. Verify the new majors exist before bumping (don't redden CI).
