# Changelog

Notable changes to MindMap Studio. Loosely follows Keep a Changelog; pre-1.0 and
phase-based. Open work lives in `NEXT_STEPS.md`, not here.

## [Unreleased]

### Added

- **Phase 0 scaffold** — local-first mind-map PWA on React 19 + Vite 6 + TS,
  built on the mind-elixir core (MIT) with a format-agnostic canonical model
  (`src/model/types.ts`) as the single source of truth.
- **MindManager-style render** — theme with a per-branch colour palette,
  two-sided radial layout, and rounded topics (`src/mindmap/`).
- **One-way `.mmap` importer** (`src/import/mmap.ts`) — recovers the full common
  feature set, field-mapped from the bundled MindManager XSD (authoritative, not
  guessed): topic tree + text, notes (`NotesXhtmlData@PreviewPlainText`), stock
  icons (`Icon@IconType`), hyperlinks (`Hyperlink@Url`), relationships →
  cross-links (`ConnectionGroup > Connection > ObjectReference@OIdRef`),
  boundaries (`Topic > OneBoundary`, over the subtree), and floating topics.
  Out-of-scope task data is warned not imported, and a left-behind check warns on
  any unreached topics. Validated against a real export (25-topic map, zero loss)
  plus 9 synthetic unit tests and a CI-safe, env-gated (`MMAP_FILE`) integration
  test.
- **The "green before done" gate** — `pnpm gate` runs typecheck → lint/format
  (Biome) → dead-code (knip) → tests (vitest) → build (vite) → bundle-size
  budget, fail-fast. Mirrored in GitHub Actions CI (`.github/workflows/ci.yml`).
- **Working agreement** captured in `CLAUDE.md`.
- **`.mmap` import wired into the app** — an Open-file control runs `parseMmap`
  and renders the result on the canvas, surfacing importer warnings and parse
  errors inline.
- **Markdown I/O** (`src/io/markdown.ts`) — open `.md` outlines as maps and export
  any map to `.md` (H1 root + nested bullets, round-trippable); wired into the open
  dialog (accepts `.md` and `.mmap`) and an Export .md button.
- **Edit capture** (`src/mindmap/sync.ts`) — canvas edits flow back into the
  canonical model (mind-elixir `operation` → `fromMindElixir`), preserving
  canonical-only fields (notes/tasks/images) by id, so Export .md reflects live edits.
- **Local-first persistence** (`src/store/mapStore.ts`) — the current map autosaves
  to IndexedDB (debounced) and reloads on startup, so work survives a refresh.
- **Multi-map library** — many named maps in IndexedDB keyed by id, with the
  last-opened map restored on startup. The header gains a map switcher (dropdown)
  plus New and Delete; each import becomes its own library entry.
- **PNG / SVG export** — export the current map as a PNG or SVG image via
  mind-elixir's built-in renderers, exposed through a `MindMapHandle` ref
  (`.png` / `.svg` buttons in the header).
- **Installable PWA** — `vite-plugin-pwa` adds a web manifest, an on-brand app
  icon, and a Workbox service worker that precaches the app shell, so MindMap
  Studio installs to the home screen / desktop and runs fully offline.

- **Node editing UI** — `@mind-elixir/node-menu` adds an inline editor panel
  (icons, tags, font size/color, link, and memo) when a node is selected. Edits
  flow through the capture seam into the canonical model; the memo maps to the
  node's `note`, so notes persist and round-trip with imported maps.
- **Walk-Through presentation mode** — a "▶ Present" button opens a fullscreen
  slide view: an overview (title + branches), then one slide per branch with its
  nested bullets, navigated with Prev/Next, arrow keys, and Esc.
- **Relationship arrows** — imported `.mmap` relationships (`doc.links`) render as
  curved arrows between nodes, and arrows drawn on the canvas round-trip back into
  the model and persist.
- **Self-contained HTML export** — a `.html` button exports the map as a single
  standalone HTML file with the SVG embedded; opens anywhere, offline, no deps.
- **Find nodes** — a header search box matches topics (case-insensitive), focuses
  and selects the match on the canvas, and cycles through multiple hits on repeated
  Enter (with an `n/total` counter). Matching is a pure, unit-tested helper
  (`src/search.ts`).
- **Print / PDF export** — a `.pdf` button renders the map into a hidden iframe and
  opens the browser's print dialog ("Save as PDF"), laid out landscape to fit wide
  maps. Dep-free and fully local; the print document is a pure helper
  (`buildPrintDoc` in `src/io/html.ts`).
- **Batch import** — the Open control now accepts multiple files at once; each
  `.mmap`/`.md` becomes its own library entry, the last one opens on the canvas, and
  a one-line summary reports how many were imported (with per-map import notes).
  Serves migrating a folder of existing MindManager maps in one go.
- **Boundaries render** — imported MindManager boundaries (`doc.boundaries`) now draw
  on the canvas as labelled brackets over their subtree, via mind-elixir summaries
  (`toSummaries` in `src/mindmap/sync.ts`). Boundaries are keyed by stable node ids,
  so the bracket re-derives correctly after edits. Render-only for now —
  summaries drawn on the canvas aren't captured back into the model yet.

### Changed

- Upgraded the mind-elixir rendering core **4.6.2 → 5.12.2** (behavior-preserving —
  render, edit-capture, persistence, and export all re-verified in-browser).
  Unblocks the node-menu editing UI; the production bundle shrank slightly.
- The `.mmap` importer (`fast-xml-parser` + `fflate`) is now **code-split** into an
  on-demand chunk, trimming the initial JS bundle to ~99 kB gz (from ~114 kB). The
  size gate now budgets the entry chunk and reports lazy chunks separately.
- Bumped the GitHub Actions (checkout, setup-node, pnpm/action-setup) to **v6**
  (node24 runtimes), clearing the Node 20 deprecation annotation on CI.
