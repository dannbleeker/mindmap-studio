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
- **Find nodes** — a header search box matches node topics _and notes_
  (case-insensitive), focuses and selects the match on the canvas, and cycles through
  multiple hits on repeated Enter (with an `n/total` counter). Matching is a pure,
  unit-tested helper (`src/search.ts`).
- **Print / PDF export** — a `.pdf` button renders the map into a hidden iframe and
  opens the browser's print dialog ("Save as PDF"), laid out landscape to fit wide
  maps. Dep-free and fully local; the print document is a pure helper
  (`buildPrintDoc` in `src/io/html.ts`).
- **Batch import** — the Open control now accepts multiple files at once; each
  `.mmap`/`.md` becomes its own library entry, the last one opens on the canvas, and
  a one-line summary reports how many were imported (with per-map import notes).
  Serves migrating a folder of existing MindManager maps in one go.
- **Boundaries** — imported MindManager boundaries (`doc.boundaries`) draw on the
  canvas as labelled brackets over their subtree, via mind-elixir summaries
  (`toSummaries`/`fromSummaries` in `src/mindmap/sync.ts`). Boundaries you draw on the
  canvas round-trip back into the model and persist, and imported ones survive edits —
  all keyed by stable node ids, so brackets re-derive correctly after structural edits.
- **Native `.json` import/export** — a `.json` button saves the full canonical model
  (notes, links, boundaries, icons, tags) and an imported `.json` restores it exactly.
  Unlike the lossy/derived formats, this is a lossless round-trip — the format to use
  for backup or moving a map between machines. Malformed files are rejected with a clear
  message. Pure helpers (`serializeDoc`/`parseDoc` in `src/io/json.ts`).
- **Fit button** — re-scales and centers the map to the viewport (MindManager's "Fit
  Map"), handy after importing a large map or panning around. Exposed via the
  `MindMapHandle` ref (`fitView` is also reused for the initial auto-fit).

### Changed

- Upgraded the mind-elixir rendering core **4.6.2 → 5.12.2** (behavior-preserving —
  render, edit-capture, persistence, and export all re-verified in-browser).
  Unblocks the node-menu editing UI; the production bundle shrank slightly.
- The `.mmap` importer (`fast-xml-parser` + `fflate`) is now **code-split** into an
  on-demand chunk, trimming the initial JS bundle to ~99 kB gz (from ~114 kB). The
  size gate now budgets the entry chunk and reports lazy chunks separately.
- Bumped the GitHub Actions (checkout, setup-node, pnpm/action-setup) to **v6**
  (node24 runtimes), clearing the Node 20 deprecation annotation on CI.
- Extracted the six export handlers + the download helper out of `App` into a focused
  `useMapExports` hook (`src/useMapExports.ts`), so the component reads as orchestration
  rather than I/O plumbing (behavior-preserving — all formats re-verified in-browser).
- Further slimmed `App` by extracting the dark-mode preference (`useDarkMode`) and the
  Find behaviour (`useFind`) into self-contained hooks (behavior-preserving).
- Upgraded the build toolchain to **Vite 8** (6.4.3 → 8.0.16) with `@vitejs/plugin-react`
  6, matching TP Studio. Behavior-preserving — full gate green and the app re-verified
  in-browser (render, search, exports, no console errors); the production bundle even
  shrank (~100.6 → ~96.8 kB gz entry).
- Imported **floating topics now render** on the canvas, in a labelled "Floating topics"
  branch (mind-elixir has no detached nodes, so this is the honest representation; the
  import banner notes their separate placement). The branch is display-only —
  `fromMindElixir` strips it on capture, so it never enters the model and `floatingTopics`
  is preserved across edits.
- **Node images** — an "Image" button attaches a picture to the selected node. The file
  is downscaled and stored as a self-contained data URL (so maps stay offline and a `.json`
  export carries its images), rendered on the node, and round-tripped through the model
  (`fileToMapImage` in `src/io/image.ts`; image sync in `src/mindmap/sync.ts`).
- **Dark canvas theme** — a 🌙/☀ toggle switches the map to a dark theme (same MindManager
  branch palette, dark surfaces) for on-screen presentation; image exports inherit it. The
  switch is live (no reload, no lost edits) and the preference persists across sessions.
- **Notes editor** — a 📝 Notes panel docks below the canvas and edits the selected node's
  note in a comfortable textarea (debounced autosave + commit on blur), replacing the
  cramped node-menu memo. Notes persist and round-trip through the model and `.json`.
- **Outline view** — a ☰ Outline side panel lists the map as an indented, live outline;
  click a row to focus that node on the canvas, and noted nodes show a 📝 marker. Pure
  flattener in `src/outline.ts`.

### Fixed

- **Undo/redo now sync the model.** mind-elixir's `undo`/`redo` revert the canvas via
  `refresh()` without firing an `operation` event, so the canonical doc (and thus
  autosave + export) used to drift out of sync with what's displayed after a Ctrl+Z.
  `MindMap` now wraps `undo`/`redo` to re-capture, so the model always matches the canvas.
