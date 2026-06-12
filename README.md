# MindMap Studio

A local-first, offline mind-mapping PWA — a self-hosted replacement for Corel/Mindjet
MindManager. Built on the [mind-elixir](https://github.com/SSShooter/mind-elixir-core) core
(MIT) with a format-agnostic canonical model as the single source of truth. No telemetry, no
accounts — your maps live in your browser (IndexedDB) and on disk.

Sibling to TP Studio and MECE Studio (same stack: React 19 + Vite + TypeScript, deployed to
GitHub Pages).

## Features

- **Open** `.mmap` (MindManager exports) and `.md` (Markdown outlines) — rendered as a
  MindManager-style map. The `.mmap` importer is field-mapped from the bundled MindManager
  XSD (topic tree, notes, icons, hyperlinks, relationships, boundaries, floating topics).
  Select multiple files to batch-import a whole folder of maps into the library at once.
  Also opens native `.json` maps (exported from this app) losslessly.
- **Edit** on the canvas — keyboard-first (Enter = sibling, Tab = child), drag-to-reparent,
  plus a node editor panel (icons, tags, font size/color, link, memo) via node-menu.
- **Find** — search the map by topic or note; matches are focused and selected on the
  canvas, cycling through multiple hits on repeated Enter.
- **Multi-map library** — keep many named maps; switch, create, and delete from the header.
- **Autosave + reload** — every change persists to IndexedDB; your last map is restored on
  startup. Works fully offline.
- **Relationships** — imported relationships render as arrows, and arrows you draw round-trip
  back into the model.
- **Boundaries** — imported MindManager boundaries render as labelled brackets over their
  subtree, and boundaries you draw on the canvas round-trip back into the model (via
  mind-elixir summaries).
- **Floating topics** — imported detached topics render in a labelled "Floating topics"
  branch (display-only).
- **Export** — native `.json` (lossless — the format for backup/transfer), Markdown
  (`.md`), PNG, SVG, a self-contained HTML file, and print-to-PDF.
- **Present** — a Walk-Through mode that steps through the map as fullscreen slides.
- **Installable PWA** — install to the home screen / desktop; precached app shell for offline use.

## Architecture

A format-agnostic **canonical model** (`src/model/types.ts`) is the single source of truth.
Everything targets it through thin adapters, so the rendering engine and file formats stay
replaceable:

- `src/mindmap/` — the mind-elixir renderer + a two-way `sync` bridge (canvas edits ⇄ model).
- `src/import/mmap.ts` — one-way `.mmap` importer (ZIP of `Document.xml`; XSD-sourced mapping).
- `src/io/` — Markdown, native-JSON, and self-contained-HTML/print I/O.
- `src/useMapExports.ts` — the header's export handlers (json/md/png/svg/html/pdf).
- `src/store/mapStore.ts` — IndexedDB-backed multi-map library (autosave + last-opened).
- `src/present/` — the Walk-Through presentation overlay.

## Commands

```sh
pnpm install
pnpm dev         # dev server (preview: "mindmap-dev", port 5175)
pnpm gate        # full local gate — run before every push
pnpm test        # unit + integration tests (vitest)
pnpm build       # production build
```

`pnpm gate` is the "green before done" check: typecheck → lint/format (Biome) → dead-code
(knip) → tests → build → bundle-size budget (entry chunk), fail-fast. CI
(`.github/workflows/ci.yml`) runs the same command. See `CLAUDE.md` for how we build,
`CHANGELOG.md` for what's shipped, and `NEXT_STEPS.md` for open work.

## The `.mmap` importer

`.mmap` is a ZIP of `Document.xml` (Mindjet's proprietary, partly-binary schema). The import is
**one-way and lossy by design** — it recovers the topic tree, notes, icons, hyperlinks,
relationships, and boundaries (field-mapped from the bundled MindManager XSD), warns about
out-of-scope data (e.g. tasks), and flags any topics it leaves behind. Validated against a real
MindManager export (a 25-topic map imported with zero content loss) plus synthetic unit fixtures
and a CI-safe, env-gated (`MMAP_FILE`) integration test.

## Status

**Phase 1 (Brainstorming MVP) is complete**; Phase 2 is in progress. The only Phase 1 item left
is a GitHub Pages deploy. Scope intentionally excludes the task / Gantt / resource PM layer. See
`NEXT_STEPS.md`.
