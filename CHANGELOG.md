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
- **Feature catalogue** (`docs/features.json`) — the curated list of user-facing
  capabilities that serves as the denominator for documentation coverage; a
  `check-feature-coverage` gate validates its integrity (ids, areas, dates,
  flags) and warns when the CHANGELOG advances past the catalogue's reviewed
  watermark.
- **Stats pipeline** (`scripts/build-stats.mjs`) — distils the repo's own tooling
  (Vitest coverage, git history, file + build scan) into `public/stats.json` plus
  a rolling `public/stats-history.json` for trend sparklines: lines of code by
  category, coverage, test counts, a high-churn×low-coverage risk map, code
  hygiene counters, domain richness, footprint and gzip bundle size. A **Stats**
  workflow (`.github/workflows/stats.yml`) regenerates and commits them back on
  every push to `main`, loop-guarded by `[skip ci]` + `paths-ignore`.
- **Project dashboard** (`public/dashboard.html`) — a standalone, backend-free page
  with two halves: a **live repo pulse** (commit frequency, conventional-commit
  types, authorship, day/hour rhythm and merged-PR activity, pulled client-side
  from the unauthenticated GitHub REST API on each open) and **project metrics from
  CI** (everything from `stats.json`, including the documentation-coverage map and
  the risk map). Chart.js from a pinned, SRI-checked CDN.
- **Dual licensing** — the software is licensed under the **Apache License 2.0**
  ([`LICENSE`](LICENSE); also `package.json`'s `license` field), while the
  forthcoming practitioner book in `docs/guide/` is **CC BY-NC 4.0**
  ([`LICENSE-BOOK`](LICENSE-BOOK)). Third-party trademark + open-source dependency
  notices live in [`NOTICE.md`](NOTICE.md), rendered to `/notices.html`, and the
  split is documented in the README "## License" section.
- **In-app About dialog** — a native `<dialog>` (modal semantics, focus management
  and Escape-to-close handled by the browser) reachable from the header, surfacing
  the copyright, the dual-license summary, and links to the third-party notices,
  the live dashboard, and the source repository.
- **User manual rendered to `/user-guide.html`** — the comprehensive `USER_GUIDE.md`
  is rendered to a styled, standalone page at build time by a small Vite plugin
  (`marked`, with GitHub-style heading slugs so the guide's own in-page anchors
  resolve) and served on demand in dev. Reachable from the in-app **About** dialog.
  One canonical source — never a hand-maintained second copy that can drift.
- **The book — _Thinking in Maps_** — a longer-form guide to mind mapping under
  [`docs/guide/`](docs/guide/), built from one Markdown source to **both** a
  reflowable EPUB (Kindle-friendly) and a fixed-A4 PDF (cover, clickable TOC,
  chapter bookmarks, document metadata + a stable book id) by pure-Node builders
  (`jszip` + `marked`, and `pdf-lib`). Its diagram is generated from a source
  constant — rendered as SVG for the EPUB and drawn natively for the PDF. Both
  builds are byte-deterministic. The artifacts deploy with the site
  (`/Thinking-in-Maps.epub`, `/Thinking-in-Maps.pdf`); a **Rebuild book** workflow
  regenerates and commits them when the manuscript changes (bot-actor loop guard),
  with opt-in send-to-Kindle. The catalogue's `book` flag now tracks coverage (97.7%).
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
- **HTML slide-deck export** — a `.html (slide deck)` export turns the map into a
  standalone, navigable slide presentation — the Walk-Through as a shareable file:
  an overview slide plus one slide per branch, navigated by arrow keys / click /
  Prev-Next buttons, with embedded styling and no dependencies. Reuses the same
  slide model the in-app presentation renders (`src/io/deck.ts`, lazy-loaded so it
  stays out of the entry bundle); topic text is HTML-escaped, and the nav script is
  static, so map content has no scripting surface.
- **Word (.docx) export** — a `.docx (Word)` export saves the map as an editable
  outline document (a title, then indented bulleted topics, with notes as italic
  lines). It writes the minimal valid Open-XML package by hand
  (`[Content_Types].xml`, `_rels/.rels`, `word/document.xml`) via `fflate`, using
  direct run formatting rather than named styles so it renders identically in Word,
  LibreOffice, Pages, and Google Docs. Pure + deterministic (`src/io/docx.ts`,
  lazy-loaded); topic and note text is XML-escaped.
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
- **Deployed to GitHub Pages** — a `deploy.yml` workflow runs the gate, builds, and
  publishes on every push to `main`, served from the custom domain
  <https://mindmap-studio.struktureretsundfornuft.dk/> (HTTPS, with a `CNAME` baked into the
  build). The app is now live, installable, and offline-capable from a real URL.
- Extracted the six export handlers + the download helper out of `App` into a focused
  `useMapExports` hook (`src/useMapExports.ts`), so the component reads as orchestration
  rather than I/O plumbing (behavior-preserving — all formats re-verified in-browser).
- Further slimmed `App` by extracting the dark-mode preference (`useDarkMode`) and the
  Find behaviour (`useFind`) into self-contained hooks (behavior-preserving).
- Extracted the Outline, Notes, and Markers panels into presentational components
  (`src/Panels.tsx`) and the shared toolbar styles into `src/ui.ts`, so `App` reads as
  orchestration rather than markup (behavior-preserving — all three re-verified in-browser).
- The toolbar now **wraps** instead of overflowing, and the seven export buttons collapsed
  into one **⬆ Export…** menu to cut the clutter (all formats unchanged).
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
- **Canvas theme gallery** — a Theme picker swaps the whole map style live (Light, Dark,
  Ocean, Sunset — each its own branch palette + surfaces), for on-screen presentation;
  image exports inherit it. Switching is live (no reload, no lost edits) and the choice
  persists across sessions.
- **Per-topic styling** — a 🎨 Style bar applies shape (box / rounded / pill), fill, border,
  and bold to the selected node, with ✕ to clear and Reset for all. Styles persist and
  round-trip through the model and `.json` (`NodeStyle` extended with `borderRadius` /
  `border`). Complements node-menu's font size/colour controls.
- **Notes editor** — a 📝 Notes panel docks below the canvas and edits the selected node's
  note in a comfortable textarea (debounced autosave + commit on blur), replacing the
  cramped node-menu memo. Notes persist and round-trip through the model and `.json`. A
  **Preview** toggle renders a safe Markdown subset (headings, bold/italic, lists, code,
  http(s) links) — `renderNote` in `src/noteFormat.ts` (HTML-escaped, unit-tested).
- **Outline view** — a ☰ Outline side panel lists the map as an indented, live outline;
  click a row to focus that node on the canvas, and noted nodes show a 📝 marker. A filter
  box narrows the outline by topic. Pure flattener in `src/outline.ts`.
- **New-map templates** — the New menu offers starter maps (Blank, Brainstorm, SWOT,
  Project plan) instead of only a blank map (`src/templates.ts`).
- **Cross-map links** — link a node to another map in the library (🔗 Link… picker); the
  node shows a 🔗 that navigates to the linked map in-app. Stored as a `#map=<id>` hyperlink
  and intercepted on click (so it doesn't open a blank tab). Turns the library into a
  connected knowledge base.
- **Duplicate map** — copy the current map into a new library entry ("… (copy)").
- **Remembered workspace** — which panels (Outline / Notes / Markers / Style) you have open
  is persisted, so the layout is restored next time.
- **Layout direction** — a picker switches the map between both-sides, right-only, and
  left-only layouts (applied live, edits preserved); the choice persists across sessions.
- **Collapse / Expand all** — ⊟ / ⊞ toolbar buttons collapse every branch to a level-1
  overview or expand the whole tree (MindManager's detail-level control).
- **Marker palette** — a 🏷 Markers bar of common markers (priority/flag/status/etc.);
  click one to toggle it on the selected node. Markers render on the node and persist.
- **Find & Replace** — the Find bar gains a replace field + "Replace all" that rewrites the
  search text in every matching topic (case-insensitive, literal). Pure `replaceInTopic`
  helper in `src/search.ts`. Press `/` to jump to Find from anywhere (ignored while typing).
- **OPML import/export** — open and save `.opml` (the standard outline-interchange format
  used by Freeplane, OmniOutliner, Workflowy, …); topics + notes round-trip. The parser is
  lazy-loaded (`src/io/opml.ts`), so it stays out of the entry bundle.
- **Library backup & restore** — a ⬇ Backup button saves *every* map to one
  `mindmap-library.json`; opening that file restores them all. Pure helpers
  (`serializeLibrary`/`parseLibrary` in `src/io/library.ts`); restore is auto-detected when
  you open a backup via Open files.

### Fixed

- **Imported `.mmap` icons render as glyphs.** Stock-icon names (e.g.
  `urn:mindjet:ThumbsUp`) used to show as literal text on nodes; common ones now map to
  emoji (👍, 🚩, 1️⃣, …) via `src/icons.ts`, which also backs the marker palette. Unknown
  names are kept as-is so nothing is lost.
- **Undo/redo now sync the model.** mind-elixir's `undo`/`redo` revert the canvas via
  `refresh()` without firing an `operation` event, so the canonical doc (and thus
  autosave + export) used to drift out of sync with what's displayed after a Ctrl+Z.
  `MindMap` now wraps `undo`/`redo` to re-capture, so the model always matches the canvas.

### Fixed

- **Dashboard "last push"** read `repo.updated_at`, which GitHub bumps on stars, issue
  comments, or any attribute change; it now uses `repo.pushed_at` (the actual last push).
- **EPUB byte-determinism** — JSZip stamped every entry, including the `META-INF/` and
  `OEBPS/` folder entries it auto-creates, with the wall-clock time, so each rebuild differed
  and the Rebuild-book workflow committed a no-op timestamp churn. Every entry's date is now
  pinned to date-only (midnight UTC), matching the PDF; the build is reproducible.
- **Book PDF code blocks** now paginate cleanly — a block taller than a page draws a
  background per page segment instead of spilling later lines onto the next page without one
  (latent: the manuscript has no fenced code blocks yet).

### Security

- **Stored XSS in the SVG / HTML / PDF export is fixed.** mind-elixir builds the export SVG by
  re-injecting each node topic as live HTML inside an SVG `<foreignObject>` (and each hyperlink
  as a raw `href`), and `src/io/html.ts` embeds that SVG as live markup — so a topic like
  `<img src=x onerror=…>` or a `javascript:` link (typed, or carried in by a malicious import)
  executed when the exported `.svg`/`.html` was opened or the map was printed to PDF. A new
  namespace-aware sanitiser (`src/io/svgSanitize.ts`) now runs on every SVG/HTML/PDF export:
  it strips `<script>`/`<iframe>`/`<object>`/… , every `on*` handler, and any URL scheme outside
  a strict allowlist, while **preserving** the foreignObject node topics — which DOMPurify
  cannot, as it deletes foreignObject content in every profile. As defence-in-depth, the
  hyperlink input boundaries (`setSelectedHyperlink`, the model↔canvas sync in
  `src/mindmap/sync.ts`, and the `.mmap` importer) reject `javascript:`/`data:`/`vbscript:`
  links at the source (`src/io/urlSafety.ts`). Verified against a real export render — no script
  executes and every node topic still renders — plus jsdom unit tests (`test/svgSanitize.test.ts`,
  `test/urlSafety.test.ts`). The XML/JSON importers were reviewed and are safe.
- **Stored XSS in the note renderer is fixed.** `src/noteFormat.ts` escaped `&`/`<`/`>` but not
  quotes, so a Markdown link whose URL contained a `"` broke out of the generated `href="…"` and
  injected a live attribute (e.g. an event handler) into the `<a>`. Notes render via
  `dangerouslySetInnerHTML` and can arrive from an imported map, so this was a stored vector, not
  just a self-XSS. `escapeHtml` now also escapes `"`/`'`, so no user character survives as a raw
  quote in the generated markup; the link transform still accepts only `http(s)` URLs. Regression
  test in `test/noteFormat.test.ts`.
