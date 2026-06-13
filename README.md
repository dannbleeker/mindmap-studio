# MindMap Studio

**Live:** [mindmap-studio.struktureretsundfornuft.dk](https://mindmap-studio.struktureretsundfornuft.dk/)

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
  Also opens native `.json` maps (exported from this app) losslessly, and `.opml` outlines.
- **Edit** on the canvas — keyboard-first (Enter = sibling, Tab = child), drag-to-reparent,
  undo/redo (Ctrl+Z / Ctrl+Shift+Z), images on nodes, a docked **Notes** editor for the
  selected node, plus a node editor panel (icons, tags, font size/color, link) via node-menu.
- **Find & Replace** — search the map by topic or note (matches focused on the canvas,
  cycling on repeated Enter), and replace the search text across all matching topics.
- **Library-wide search** — the **🔎 All maps** button searches every map in the library by
  topic or note (floating topics included) and jumps to the chosen map and node.
- **Outline** — a side panel showing the map as an indented outline; click a row to jump to
  that node (noted nodes are marked 📝).
- **Markers** — a click-to-toggle palette of common markers (priority, flag, status, …) on
  the selected node.
- **Style** — a per-topic style bar: shape (box/rounded/pill), fill, border, and bold.
- **Multi-map library** — keep many named maps; switch, create, and delete from the header.
- **Autosave + reload** — every change persists to IndexedDB; your last map is restored on
  startup. Works fully offline.
- **Relationships** — imported relationships render as arrows, and arrows you draw round-trip
  back into the model.
- **Boundaries** — imported MindManager boundaries render as labelled brackets over their
  subtree, and boundaries you draw on the canvas round-trip back into the model (via
  mind-elixir summaries).
- **Floating topics** — imported detached topics render in a labelled "Floating topics"
  branch, and are editable: rename, add, remove, nest, or drag them in/out of the tree, and
  the changes round-trip back into the model.
- **Export** — native `.json` (lossless — the format for backup/transfer), Markdown
  (`.md`), OPML (`.opml`), PNG, SVG, a self-contained HTML file, a standalone HTML
  **slide deck** (the Walk-Through as a shareable file), a **PowerPoint** (`.pptx`) deck,
  a Word **`.docx`** outline document, an Excel **`.xlsx`** outline sheet, and print-to-PDF.
- **Copy outline** — copy the map as a Markdown outline straight to the clipboard (no file),
  for pasting into an email, chat, or doc.
- **Present** — a Walk-Through mode that steps through the map as fullscreen slides.
- **Theme gallery** — pick a canvas style (Light, Dark, Ocean, Sunset); persists and carries
  into image exports. Per-topic font/colour/background via the node editor panel.
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
(`.github/workflows/ci.yml`) runs the same command. See `USER_GUIDE.md` for how to use the
app, `CLAUDE.md` for how we build, `CHANGELOG.md` for what's shipped, and `NEXT_STEPS.md` for
open work.

## The `.mmap` importer

`.mmap` is a ZIP of `Document.xml` (Mindjet's proprietary, partly-binary schema). The import is
**one-way and lossy by design** — it recovers the topic tree, notes, icons, hyperlinks,
relationships, and boundaries (field-mapped from the bundled MindManager XSD), warns about
out-of-scope data (e.g. tasks), and flags any topics it leaves behind. Validated against a real
MindManager export (a 25-topic map imported with zero content loss) plus synthetic unit fixtures
and a CI-safe, env-gated (`MMAP_FILE`) integration test.

## Status

**Phase 1 (Brainstorming MVP) is complete** and the app is **deployed** — live at
<https://mindmap-studio.struktureretsundfornuft.dk/> (GitHub Pages, custom domain). Phase 2 is in
progress. Scope intentionally excludes the task / Gantt / resource PM layer. See `NEXT_STEPS.md`.

## The book

A longer-form guide to mind mapping — _Thinking in Maps_ — lives in
[`docs/guide/`](docs/guide/), built from one Markdown source to two downloads that refresh
automatically when the manuscript changes:

- **EPUB** (reflowable, Kindle-friendly):
  [`/Thinking-in-Maps.epub`](https://mindmap-studio.struktureretsundfornuft.dk/Thinking-in-Maps.epub)
- **PDF** (fixed A4, cover + clickable TOC + bookmarks):
  [`/Thinking-in-Maps.pdf`](https://mindmap-studio.struktureretsundfornuft.dk/Thinking-in-Maps.pdf)

Run `pnpm book` to rebuild both (pure Node — no Chromium or LaTeX). Authoring notes are in
[`docs/guide/AUTHORING.md`](docs/guide/AUTHORING.md).

## License

MindMap Studio is dual-licensed. The two artefacts in this repository are governed by different
licenses:

- **The software** — all source code under `src/`, `test/`, `scripts/`, the build configuration,
  etc. — is licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for the full text.
  Permissive use including commercial use, with attribution and a patent grant.
- **The book** — the practitioner guide in [`docs/guide/`](docs/guide/) (the source Markdown, the
  assembled EPUB, the PDF) — is licensed under **Creative Commons Attribution-NonCommercial 4.0
  International (CC BY-NC 4.0)**. See [LICENSE-BOOK](LICENSE-BOOK) for the full text + scope. Free
  for non-commercial use with attribution; commercial republishing or paid courses / consulting use
  requires prior written permission.

Third-party trademarks and third-party authors' work referenced in the book remain the property of
their respective owners. See [NOTICE.md](NOTICE.md) for the trademark notices and the boundary
between MindMap Studio's own license and what it doesn't grant rights to.
