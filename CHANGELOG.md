# Changelog

Notable changes to MindMap Studio. Loosely follows Keep a Changelog; pre-1.0 and
phase-based. Open work lives in `NEXT_STEPS.md`, not here.

## [Unreleased]

### Added

- **Conditional formatting** — a **🎨 Styles** panel where you set rules that **auto-style topics**
  by **tag**, **marker**, or **completion** (e.g. *completed → green*, *#risk → red border*). Rules
  are a **view-only overlay** layered *under* a topic's own styling (manual styling always wins), so
  nothing is baked into the model; they're per-map, lossless in `.json`, and carried into image
  exports.
- **Board view (Kanban)** — a new **▦ Board** toggle shows your topics grouped into **columns by tag**
  (a read-only visualisation of the same map — cards don't move or write back). Each card carries its
  rolled-up **progress pie** and **due date** (red when overdue); **click a card to jump** to that
  topic on the canvas. Untagged topics gather in a final column. A fast status wall over a tagged map.
- **File attachments on topics** — attach any file to a topic from the **ℹ Info** panel; a **📎 chip**
  shows on the node and the panel lists each file with its size, a one-click **download**, and a
  remove (✕). Files are stored inline (a data URL, capped at 5 MB each) so they travel with the
  map — lossless in `.json`, fully offline, ignored by flat exports.
- **Faster capture** — three quick-input additions: a **Quick add** box in the header (type a topic,
  press Enter to add it under the selected node — or the central topic — keeping focus for rapid
  fire); **drop a link** (or text) from your browser onto the canvas to create a floating topic
  (URLs become a clickable link, dangerous schemes refused); and a **⏱ brainstorm timer** for
  timeboxing an idea sprint (3 / 5 / 10 / 15 min, with a clear "time's up").
- **Due & start dates on topics** — set a topic's **start** and **due** date in the **ℹ Info** panel
  and a **📅 date chip** appears on the node; it turns **red when overdue** (past due and not yet
  100%). The **🎚 Power Filter** gains a **Due date** option — *Has a date · Overdue · Due ≤ 7 days* —
  so you can dim everything except what needs attention (and save it as a preset). Dates show in image
  exports too and are lossless in `.json`. Together with task progress, that's the core of a topic's
  task info.
- **Task progress + roll-up** — mark a topic's completion (0 / 25 / 50 / 75 / 100%) from the **ℹ Info**
  panel and a small **completion pie** (MindManager-style — empty / wedge / full, with a ✓ at 100%)
  appears on the node. **Click a node's pie to step its completion** (0 → 25 → 50 → 75 → 100 → 0). Parents
  **roll up automatically**: a branch's pie shows the average across all its sub-tasks plus a done/total
  count (e.g. *75% · 1/2*) in the Info panel, updating live as you tick items off. The completion also
  shows in the **Outline** and in image exports (PNG/SVG). It's a clean way to track a plan's status
  right on the map — lossless in `.json`, ignored by flat (outline) exports.
- **Saved filters** — name the current Power Filter and reuse it across maps. The **🎚 Filter** panel
  grows a **Saved filters** list: type/pick criteria, give it a name, **Save**; click a saved name to
  re-apply it on any map, or **✕** to remove it. Presets persist locally (browser storage) and travel
  with you between maps. Fully local — nothing leaves the browser.
- **Typo-tolerant Find** — **Find** now rescues near-misses. If an exact match isn't found, it falls
  back to a fuzzy pass (bounded edit-distance per word) so `Launhc` still finds **Launch** and
  `markteing` still finds **Marketing**. Exact matches always win and short queries (< 4 chars) stay
  strict, so precise searches are unaffected.
- **Paste text → map** — a **📋 Paste text** action turns a pasted outline, bullet list, or
  Markdown into topics: indentation (or `#` heading levels) sets the hierarchy, and `-`/`*`/`+`/`•`
  and numbered (`1.`) markers are all understood. Drop it in as a **new map**, or **Add under
  selected** to graft it onto the current map. Fully local — the fast, private way to bring an
  outline (including one you generated elsewhere) into a map without any upload.
- **Version history** — a **🕔 History** panel keeps per-map snapshots in IndexedDB, so you can roll
  a map back to an earlier state. Snapshots are captured automatically while you edit (throttled to
  ~one per few minutes) and on demand via **Save version now**; **Restore** loads a snapshot back in
  place (your current state is checkpointed first, so a restore is itself undoable). Capped at 30
  per map (oldest pruned); a map's history is deleted with the map. Fully local — nothing leaves
  the browser.
- **More import formats — iThoughts `.itmz`, MindMeister `.mind`, and legacy XMind `content.xml`.**
  iThoughts (a ZIP of `mapdata.xml`) brings in the topic tree, notes, web links, relationships, and
  floating topics; MindMeister (a ZIP of `map.json`) brings in the tree, notes, and links;
  and the XMind importer now falls back to the older `content.xml` layout when there's no
  `content.json`. All in **Open files**. (Schema-verified against community specs, not yet against
  real app exports — the same caveat as `.mmap`/`.smmx`; dangerous-scheme links are dropped.)
- **Import Word `.docx` and Excel `.xlsx`** — round out the Office story (export already shipped).
  `.docx` reads the document's outline — heading styles (Title / Heading 1/2/3 …) **or** paragraph
  indentation — into the topic tree (our own `.docx` export round-trips exactly). `.xlsx` reads an
  indented-outline sheet: each row's first non-empty column sets its depth, a trailing column
  becomes the note; it decodes inline **and** shared strings, so it reads real Excel files too.
  Both are in **Open files**. (Caveat: `.xlsx` is outline-based, so a node with an empty topic has
  no cell to anchor it and isn't imported; styling/images aren't carried.)
- **Unified topic info panel** — one **ℹ Info** side panel now holds everything you can set on the
  selected node: its **note** (Markdown editor + preview), **markers** (with the active ones
  highlighted), **tags** (add/remove — a new editor; tags were previously import-only), **style**
  (shape/fill/border/bold), and **links** (web / link-to-a-map / jump-to-a-topic). It replaces the
  separate Notes, Markers, and Style toggles and the Link / Jump toolbar dropdowns.
- **Per-map canvas background** — a **Canvas** colour control in the toolbar sets the background
  for the current map (overrides the theme); it persists with the map (stored in `meta.background`,
  lossless in `.json`) and carries into the image/PDF export.
- **Focus a branch** — a **◎ Focus** button isolates the selected node's branch: everything except
  that branch and its path back to the root dims (Esc or "Show all" exits). Read-only — it reuses
  the Power Filter's dim pipeline, changing nothing in the map.
- **In-map jump links + clickable hyperlinks** — link a node to **another topic in the same map**
  via the new **↪ Jump to…** toolbar picker (stored as a `#node=` hyperlink); clicking the node's
  **🔗** leaps to and selects that topic. The 🔗 is now a real button, which also restores following
  **cross-map links** (`#map=`, previously inert on the React Flow engine) and opens external URLs
  in a new tab — dangerous schemes are refused by the app-wide XSS guard. Link routing is a pure,
  unit-tested `classifyLink()`.
- **Read-only Power Filter** — a **🎚 Filter** panel that dims every topic *except* the ones
  matching your criteria (free text in topic/note, plus toggle chips for any marker or tag in the
  map) and the paths leading to them, with a live match count. It's strictly a view: nothing is
  hidden or deleted (pure `filterResult()` computes the lit set; the canvas only changes opacity),
  and closing the panel restores the full map. Marker/tag criteria AND across categories.
- **Auto-numbering** — a **1. Numbering** toolbar toggle that prefixes every topic with its
  hierarchical outline number (1, 1.2, 1.2.3 …) on the canvas *and* in the Outline panel, and
  carries through to image/PDF/Office exports. Purely a view: the numbers are computed from the
  tree (pure `outlineNumbers()`), never written into the model, so topics, search, and the flat
  exporters stay clean. The root (central topic) is the implicit "0" and isn't numbered. Persisted.
- **Marker & tag index panel** — a new **📑 Index** side panel listing every marker and tag
  used in the map, each grouped with the topics carrying it (with a count); click any entry to
  centre + select that node. A read-only navigation companion to the per-node **Markers** palette,
  mirroring the **Outline** panel. The collection logic is the pure, unit-tested `markerTagIndex()`.
- **SimpleMind interop (`.smmx`)** — import *and* export SimpleMind's `.smmx` (a ZIP of
  `document/mindmap.xml`): the topic tree, notes, web links, and relations↔cross-links, plus
  floating topics. Now in **Open files** + the **⬆ Export…** menu.
- **Export to XMind (`.xmind`)** — write the modern (2020+) `content.json` ZIP
  (topic tree, notes, web links, tags, plus floating topics + relationships),
  completing two-way XMind interop (import already shipped). `.xmind` is now in the
  **⬆ Export…** menu.
- **Polish** — a proper **favicon** for browser tabs + bookmarks (the mind-map glyph,
  `icon.svg` + a PNG/apple-touch fallback), and a **collapsible minimap** (a "Minimap ▾/▴"
  toggle that hides the corner overview when it's in the way; the choice persists).
- **Draw relationships on the canvas** — right-click a node → **Link to…** → click a
  target to add a labelled cross-link (double-click a relationship to relabel, right-click
  to delete). Restores interactive relationship-drawing on the React Flow engine.
- **Canvas engine → React Flow.** Replaced the mind-elixir renderer with
  **@xyflow/react** (MIT), unlocking first-class, editable **alternate layouts**
  (org-chart down/up, radial, timeline, fishbone), **organic tapered branches**,
  **anchored callouts**, **inline rich-text topics** (Ctrl+B/I/U), and a
  branch-coloured **minimap + zoom controls**. The canvas is model-first (pure ops
  on the canonical doc → re-project → re-layout → onChange), and the SVG export is
  authored natively from the model (it now carries arrow + boundary labels and
  rasterises without canvas-taint). The migration ran behind a flag across phases
  0/A–I; mind-elixir and its `foreignObject` export shim are removed, and the entry
  + lazy bundle shrank (the engine chunk dropped ~37 kB).
- **Phase 0 scaffold** — local-first mind-map PWA on React 19 + Vite 6 + TS,
  built on the mind-elixir core (MIT, since replaced — see above) with a
  format-agnostic canonical model (`src/model/types.ts`) as the single source of truth.
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
- **PowerPoint (.pptx) export** — a `.pptx (PowerPoint)` export turns the map into a real,
  editable slide deck — an overview slide, then one per branch with its subtree as bullets —
  reusing the same slide model as the in-app Walk-Through. It writes the full minimal
  PresentationML package by hand (presentation, slide master, layout, theme, and one part per
  slide, each wired through its own `.rels`) via `fflate`; slides are positioned text boxes, so
  they're self-describing. Pure + deterministic (`src/io/pptx.ts`, lazy-loaded); topic text is
  XML-escaped. Verified by opening the output with python-pptx (a real PowerPoint-class reader)
  plus well-formedness + referential-integrity unit tests.
- **Excel (.xlsx) export** — a `.xlsx (Excel)` export saves the map as an indented outline
  worksheet: each topic in the column matching its depth, plus a Notes column and a bold
  header. Minimal SpreadsheetML written by hand via `fflate` (inline strings, no
  sharedStrings part); pure + deterministic (`src/io/xlsx.ts`, lazy-loaded), topic/note text
  XML-escaped. Verified by opening the output with openpyxl (a real Excel-class reader) plus
  well-formedness + content unit tests.
- **Copy outline** — a `⧉ Copy outline` button copies the map as a Markdown outline straight
  to the clipboard (no file download), for pasting into an email, chat, or doc.
- **More starter templates** — the New menu gains five structured-thinking starters:
  **5 Whys** (a nested root-cause chain), **Decision** (pros & cons), **Retrospective**
  (Start / Stop / Continue), **Meeting notes**, and **Pre-mortem** (`src/templates.ts`).
- **Find nodes** — a header search box matches node topics _and notes_
  (case-insensitive), focuses and selects the match on the canvas, and cycles through
  multiple hits on repeated Enter (with an `n/total` counter). Matching is a pure,
  unit-tested helper (`src/search.ts`).
- **Library-wide search** — a **🔎 All maps** button opens a dialog that searches *every* map
  in the library (topics + notes, floating topics included) and jumps to the chosen map and
  node: a same-map hit focuses in place, another map switches then focuses. Pure, unit-tested
  matcher (`searchLibrary` in `src/search.ts`); the dialog loads the library with the live
  current map merged over its saved copy, so it sees unsaved edits.
- **Print / PDF export** — a `.pdf` button renders the map into a hidden iframe and
  opens the browser's print dialog ("Save as PDF"), laid out landscape to fit wide
  maps. Dep-free and fully local; the print document is a pure helper
  (`buildPrintDoc` in `src/io/html.ts`).
- **Batch import** — the Open control now accepts multiple files at once; each
  `.mmap`/`.md` becomes its own library entry, the last one opens on the canvas, and
  a one-line summary reports how many were imported (with per-map import notes).
  Serves migrating a folder of existing MindManager maps in one go.
- **Boundaries** — imported MindManager boundaries (`doc.boundaries`) draw on the
  canvas as labelled, shaded boxes around their subtree (see the filled-enclosure entry
  above), via mind-elixir summaries (`toSummaries`/`fromSummaries` in `src/mindmap/sync.ts`).
  Boundaries you draw on the canvas round-trip back into the model and persist, and imported
  ones survive edits — all keyed by stable node ids, so the boxes re-derive correctly after
  structural edits.
- **Native `.json` import/export** — a `.json` button saves the full canonical model
  (notes, links, boundaries, icons, tags) and an imported `.json` restores it exactly.
  Unlike the lossy/derived formats, this is a lossless round-trip — the format to use
  for backup or moving a map between machines. Malformed files are rejected with a clear
  message. Pure helpers (`serializeDoc`/`parseDoc` in `src/io/json.ts`).
- **Fit button** — re-scales and centers the map to the viewport (MindManager's "Fit
  Map"), handy after importing a large map or panning around. Exposed via the
  `MindMapHandle` ref (`fitView` is also reused for the initial auto-fit).
- **Image/document exports render everywhere** (`src/io/svgText.ts`) — mind-elixir
  emits topic labels as `<foreignObject>` (HTML-in-SVG), which only renders inline in a
  browser: opened as a file, rasterized to PNG, or placed in Office the labels vanished
  (and foreignObject *taints* the canvas, so the PNG path produced a blank/failed image).
  `inlineSvgText` rewrites those labels to native SVG `<text>`, reusing each label's
  existing x/y so it lands inside its box, and now runs in the `.svg`/`.png`/`.html`/`.pdf`
  pipeline (after `sanitizeSvg`). The PNG export rasterizes the cleaned SVG itself
  (`useMapExports.svgToPng`), replacing mind-elixir's taint-prone `exportPng`. Verified by
  a canvas-taint + text-pixel render check; the library's own `exportSvg(true)` was
  rejected because it mispositions every label. Covered by `test/svgText.test.ts`.
- **Multi-line topic labels in exports** — `inlineSvgText` now splits a topic on its
  explicit line breaks and emits one `<text>` with a `<tspan>` per line, distributed over
  the box height (single-line topics stay a plain `<text>`). Previously a multi-line topic
  collapsed onto one line in the exported image/document. Verified by a real multi-line
  render. An **export-fidelity regression test** (`test/exportFidelity.test.ts`) now pins
  the whole `sanitizeSvg → inlineSvgText` chain: topics (incl. multi-line), marker icons,
  node images, and connector/arrow/boundary `<path>` geometry all survive, while scripts,
  inline handlers, and dangerous URL schemes are stripped. (Known gap: mind-elixir's export
  omits arrow/boundary *text* labels — their geometry exports, the labels don't.)
- **Book — _Thinking in Maps_ grown to full feature coverage.** The two previously
  un-booked features now have prose: **Copy outline** (clipboard, Chapter 6) and the
  **remembered-workspace** panel persistence (Chapter 5) — `book` coverage is now 100%.
  The Chapter 5 & 6 "Now you try" exercises gained concrete worked examples for **Fit**,
  **PNG/SVG**, **PDF**, **Excel**, **Copy outline**, and the remembered workspace, lifting
  `bookExample` coverage to 54%. The PDF builder's `pdfText` now also strips the
  Misc-Math-Symbols-B block (so a toolbar glyph like `⧉` named in prose can't break the
  WinAnsi draw); both books still build byte-deterministically.
- **More book worked examples (Chapters 2–7).** The "Now you try" exercises gained
  concrete, hands-on steps for editing-into-the-model, images, per-topic styling/font,
  themes, layout direction, floating topics, cross-map links, duplicate/switch maps,
  walk-through Present, library backup, and PWA install — lifting `bookExample` coverage
  **54% → 82%**. Flags flipped only for features the prose genuinely walks the reader through.
- **Example gallery — 13 pre-built maps** (`src/examples.ts`). An **Examples** group in the
  **+ New…** menu (alongside the empty templates) opens complete, worked maps to explore and
  adapt: Product launch, Meeting notes, Decision log, Quarterly OKRs, Retrospective, a worked
  SWOT, Incident runbook, GTD natural planning, Talk/content outline, Personal knowledge map,
  Study/revision map, Trip plan (with a small embedded image), and a Cross-map atlas. Between
  them they exercise every major feature — notes, markers, boundaries, relationships, floating
  topics, per-topic styling, images, deep nesting, hyperlinks. Each is canonical-model data
  (opening one mints a fresh, editable copy) and covered by `test/examples.test.ts` (every
  example builds with unique ids and no dangling link/boundary references).
- **⬚ Group button — MindManager-style filled boundary enclosures.** A toolbar **⬚ Group**
  button draws a shaded, rounded box around the selected branch and its whole subtree
  (`MindMapHandle.groupBranch`); it's captured into the model (`doc.boundaries`) and persists
  like any edit. The box is a **custom overlay** (`renderBoundaryOverlay` in `MindMap.tsx`):
  it lives inside mind-elixir's transformed canvas, so it pans and zooms with the map, and
  its bounds are recomputed from the live node rects on every edit, init, and layout change.
  mind-elixir's own bracket summaries are suppressed (`hideNativeBrackets`) so only the filled
  box shows, with a single label chip; the canonical label round-trips by id even though the
  underlying summary's label is blanked (`toSummaries`/`fromSummaries`). This lifts filled
  boundary enclosures out of the renderer-ceiling list — **callouts** remain there (the engine
  has no callout primitive), tracked in `NEXT_STEPS.md`.
- **PWA self-update — "New version available — Refresh now."** The service worker now uses
  `registerType: "prompt"` (was `"autoUpdate"`, which reloaded silently): a new deploy parks
  the new worker and surfaces a non-intrusive toast with a **Refresh now** action that swaps
  to the new build and reloads — never a silent reload that could drop an in-flight edit. The
  update service (`src/pwa/pwaUpdate.ts`) also powers a **Check for updates** action in the
  About dialog (re-surfaces the prompt if one's already waiting). The toast surface gained an
  optional action button + duration; `navigateFallbackDenylist: [/\.html$/]` keeps the
  standalone pages out of the SPA shell. Verified offline end-to-end (kill the server → the
  app still loads from the SW cache); covered by `test/pwaUpdate.test.ts` (callbacks, the
  Refresh-now → `updateSW(true)` path, idempotency, and the four manual-check outcomes).
  Adds `workbox-window` as a direct devDep (strict pnpm doesn't expose it to the app).
- **Corner minimap + integrated zoom controls** (`src/mindmap/minimap.ts`). A bottom-right
  panel draws a schematic overview of the whole map — one branch-coloured rect per topic —
  with a viewport rectangle you can **click or drag to pan** the main canvas; below it sit
  zoom **−/+** buttons, a live percentage, and a **fit** button. mind-elixir has no built-in
  minimap (verified), so the schematic is custom: node rects are projected from the live DOM
  into the panel by a pure, unit-tested layout (`computeMinimapLayout`), redrawn on data
  edits and re-aligned on pan/zoom via the engine's `move`/`scale` events. mind-elixir's own
  bottom-right zoom widget is hidden so there's a single, integrated control, and the engine's
  zoom range is widened (`scaleMin 0.2` / `scaleMax 3`) so the buttons and wheel zoom in
  meaningfully. Covered by `test/minimap.test.ts` (projection, centring, viewport, inverse).
- **Interop with other mind-mapping tools — FreeMind/Freeplane, Mermaid, XMind.** New thin
  adapters to/from the canonical model widen the round-trip beyond `.mmap`/OPML/Markdown/JSON:
  **FreeMind/Freeplane `.mm`** (`src/io/freemind.ts`, import + export — topic tree, links,
  folded state, and notes), **Mermaid `mindmap`** (`src/io/mermaid.ts`, import + export — the
  text format you embed in Markdown/docs; topic tree), and **XMind `.xmind`** (`src/io/xmind.ts`,
  import — unzips `content.json`, mapping titles, notes, web links, and labels→tags). Wired into
  the **⬆ Export…** menu (`.mm`, `.mmd`) and **Open files** (`.mm`, `.mmd`/`.mermaid`, `.xmind`);
  dangerous-scheme links are dropped on both directions, as everywhere. Covered by
  `test/freemind.test.ts`, `test/mermaid.test.ts`, and `test/xmind.test.ts` (round-trips, shape/
  indentation parsing, malformed-input rejection). XMind export and older `.xmind` (`content.xml`)
  remain out of scope — `.opml`/`.mm` already import into XMind.
- **MindManager gap-analysis doc** (`docs/mindmanager-gap-analysis.md`). A systematic audit of
  MindManager's full current feature set (desktop 2023–2025, Web, Teams, Snap) mapped to
  MindMap Studio's status — shipped / partial / renderer-ceiling / out-of-scope — with a
  prioritized list of buildable gaps. It's the roadmap signal behind `NEXT_STEPS.md`: it shows
  the alternate-layouts/callouts/rich-text cluster all share one root cause (the renderer), and
  confirms the PM and collaboration/enterprise layers stay deliberately out of scope.

### Changed

- **Hardening pass.** The PDF book builder now measures text through a `safeWidth`
  helper (mirroring `safeDraw`), so a glyph that slips past `pdfText` can never throw at
  the width step — the build degrades to the ASCII fallback instead of failing. The pure
  image-scale math is extracted from `src/io/image.ts` into a unit-tested `imageSizing`
  helper, and the shared OOXML infra (`escapeXml` + the deterministic `zipOoxml`) gains a
  direct test. Suite now 182 tests; no behavior change (books rebuild byte-for-byte).
- Upgraded the mind-elixir rendering core **4.6.2 → 5.12.2** (behavior-preserving —
  render, edit-capture, persistence, and export all re-verified in-browser).
  Unblocks the node-menu editing UI; the production bundle shrank slightly.
- The `.mmap` importer (`fast-xml-parser` + `fflate`) is now **code-split** into an
  on-demand chunk, trimming the initial JS bundle to ~99 kB gz (from ~114 kB). The
  size gate now budgets the entry chunk and reports lazy chunks separately.
- Bumped the GitHub Actions (checkout, setup-node, pnpm/action-setup) to **v6**
  (node24 runtimes), clearing the Node 20 deprecation annotation on CI.
- Bumped the GitHub **Pages** actions (`configure-pages` v6, `upload-pages-artifact` v5,
  `deploy-pages` v5) to their node24 majors, clearing the last Node-20 deprecation warning
  (on the Deploy workflow), and dropped the no-op `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` env
  that never actually suppressed it.
- Added a build-time guard (in the size-budget gate step) that asserts mind-elixir's core
  CSS is in the bundle — a `me-tpc` selector check — so the "canvas renders unstyled"
  regression can never ship silently again.
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
- The **⬆ Export…** menu is now grouped into labelled sections (Data & outline, Image,
  Document, Presentation) so the nine export formats stay scannable.
- In-map **Find** now searches floating topics too, not just the central tree, matching the
  newly-editable floating branch (`findDocMatches` in `src/search.ts`).
- Upgraded the build toolchain to **Vite 8** (6.4.3 → 8.0.16) with `@vitejs/plugin-react`
  6, matching TP Studio. Behavior-preserving — full gate green and the app re-verified
  in-browser (render, search, exports, no console errors); the production bundle even
  shrank (~100.6 → ~96.8 kB gz entry).
- Imported **floating topics render and are editable** on the canvas, in a labelled
  "Floating topics" branch (mind-elixir has no detached nodes, so this is the honest
  representation; the import banner notes their separate placement). Edits to the branch —
  rename, add, remove, nest, or drag a topic in/out of the tree — are captured back into
  `doc.floatingTopics` (with notes/images preserved by id) and persist; emptying or deleting
  the branch clears them. Pure round-trip in `fromMindElixir` (`src/mindmap/sync.ts`).
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

- **The 📝 note indicator now disappears for empty notes.** A note containing only whitespace
  cleared the icon in the Outline (which judges notes by trimmed content) but still showed 📝 on
  the canvas. `setNote` now treats a blank/whitespace-only note as "no note" (cleared), and the
  canvas indicator is gated on trimmed content too, so the two surfaces agree.
- **Boundaries / the ⬚ Group button now actually work on the canvas.** The first cut shipped
  on a verified *data* round-trip but the live render was never visually confirmed (it leaned
  on mind-elixir's bracket summary, which only drew a faint `{` on the outer edge, not the
  shaded box the user wanted — and a self-grouped node sometimes left a stray duplicate label).
  Replaced with the custom filled-box overlay above and verified by a real headless-Chrome
  render: a clean rounded shaded box encloses the branch + subtree with even padding, a single
  label chip, no stray duplicate, and arrow labels intact. Pan/zoom and layout-direction
  changes keep the box aligned.
- **Canvas styling restored — the map no longer collapses into inline text.** The mind-elixir
  v4→v5 upgrade moved the core stylesheet from JS-injected to a separate file, but the import
  was never added — so in production the node wrappers lost their `position:absolute` and the
  whole map flowed as one run of inline topics (the toolbar, which has its own CSS, still looked
  fine, which masked it). `src/mindmap/MindMap.tsx` now imports `mind-elixir/style.css`
  directly, so the stylesheet is always bundled (entry CSS ~1.8 kB → ~12.6 kB). Caught by
  headless-rendering the live site, fixed, and re-verified the same way.
- **No first-frame layout flash on load.** The canvas is hidden (`opacity:0`, kept measurable
  so the fit still works) until mind-elixir has laid out and fit the map, then revealed — so a
  fresh load or map switch no longer flashes the un-positioned nodes as one line before the
  tree appears. The reveal is unconditional (a `finally`), so the canvas can never stay hidden
  (`src/mindmap/MindMap.tsx`).
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
