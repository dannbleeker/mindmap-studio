# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Blocking / decisions

- [ ] **GitHub repo + Pages deploy** (name, visibility, account) — needed for CI
      to actually run. The workflow is in place and pinned to pnpm 11.0.9, but is
      **unverified until the first push**.
- [ ] **Get a real `.mmap` export** from Dann to harden the importer's field
      mapping (currently validated only against a synthetic fixture).

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
- [ ] Custom tapered-branch renderer (only if pixel-exact organic branches are
      ever wanted; mind-elixir's default is already close).
- [ ] Bump Vite 6 → 8 to match TP Studio.
