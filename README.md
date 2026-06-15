# MindMap Studio

**Live:** [mindmap-studio.struktureretsundfornuft.dk](https://mindmap-studio.struktureretsundfornuft.dk/)

A local-first, offline mind-mapping PWA — a self-hosted replacement for Corel/Mindjet
MindManager. Built on [React Flow](https://reactflow.dev) (`@xyflow/react`, MIT) with a
format-agnostic canonical model as the single source of truth. No telemetry, no accounts —
your maps live in your browser (IndexedDB) and on disk.

Sibling to TP Studio and MECE Studio (same stack: React 19 + Vite + TypeScript, deployed to
GitHub Pages).

## Features

- **Open** `.mmap` (MindManager exports) and `.md` (Markdown outlines) — rendered as a
  MindManager-style map. The `.mmap` importer is field-mapped from the bundled MindManager
  XSD (topic tree, notes, icons, hyperlinks, relationships, boundaries, floating topics).
  Select multiple files to batch-import a whole folder of maps into the library at once.
  Also opens native `.json` maps (exported from this app) losslessly, and interchanges with
  other tools: `.opml` outlines, **FreeMind/Freeplane `.mm`**, **Mermaid** `mindmap`,
  **XMind `.xmind`** (modern + legacy), **SimpleMind `.smmx`**, **iThoughts `.itmz`**,
  **MindMeister `.mind`**, **MindMup `.mup`**, **Markmap** (`.md`), and **Word `.docx` / Excel
  `.xlsx`** outlines.
- **Paste text → map** — turn a pasted outline / bullet list / Markdown into topics (indentation or
  `#` levels set the hierarchy); drop in as a new map or graft under the selected node.
- **Edit** on the canvas — keyboard-first (Enter = sibling, Tab = child), drag-to-reparent,
  undo/redo (Ctrl+Z / Ctrl+Shift+Z), inline **rich-text** topics (Ctrl+B/I/U), images on
  nodes, and a unified **ℹ Info** panel (note, markers, tags, style, links) for the selected node.
- **Find & Replace** — search the map by topic or note (matches focused on the canvas,
  cycling on repeated Enter), and replace the search text across all matching topics. Find is
  **typo-tolerant** — it falls back to a fuzzy match when nothing matches exactly (`Launhc` → Launch).
- **Library-wide search** — the **🔎 All maps** button searches every map in the library by
  topic or note (floating topics included) and jumps to the chosen map and node.
- **Outline** — a side panel showing the map as an indented outline; click a row to jump to
  that node (noted nodes are marked 📝).
- **Marker & tag index** — a side panel listing every marker and tag in the map, grouped with
  the topics carrying each one; click a topic to jump to it.
- **Auto-numbering** — a toggle that prefixes every topic with its outline number (1, 1.2, …)
  on the canvas, in the outline, and in exports; purely a view (your topic text is untouched).
- **Power Filter** — a read-only filter that dims every topic except those matching your criteria
  (text, markers, tags) and the paths to them; nothing is hidden or deleted. Name and **save** a
  filter to reuse it as a preset across maps.
- **Focus a branch** — spotlight one branch (and its path to the root); everything else dims (Esc exits).
- **Per-map canvas background** — set a background colour for a map; it persists and exports with it.
- **Minimap + zoom** — a corner overview with a draggable viewport for panning large maps,
  plus integrated zoom controls (−/+, live %, fit).
- **Topic info panel** — one **ℹ Info** side panel consolidating the selected node's note,
  markers (click-to-toggle, with active highlighted), **tags** (add/remove), style
  (shape/fill/border/bold), and links.
- **Task progress** — set a topic's completion (0–100%) and a small **completion pie**
  (MindManager-style, ✓ at 100%) shows on the node — click the pie to step it (0→25→…→100→0).
  Parents **roll up automatically** (average + done/total count), with the percentage echoed in the
  Outline and in image exports.
- **Due & start dates** — give a topic dates in the **ℹ Info** panel; a **📅 chip** shows on the node
  and turns **red when overdue**. Filter by due date (has-a-date / overdue / due ≤ 7 days) in the
  Power Filter.
- **Task priority** — set High / Med / Low on a topic (coloured chip on the node); filter by priority
  in the Power Filter.
- **Fast capture** — a header **Quick add** box (type + Enter to add under the selection, keeps
  focus), **drop a link** from your browser onto the canvas to make a floating topic, and a
  **⏱ brainstorm timer** for timeboxed sprints.
- **File attachments** — attach any file to a topic (**📎 chip** on the node); stored inline so it
  travels with the map, with one-click download.
- **Board view (Kanban)** — **▦ Board** shows topics grouped into columns by tag (read-only); cards
  carry progress + due, and clicking one jumps to it on the map.
- **Summary topics** — **⊐ Summary** draws a labelled bracket beside a branch (side-aware;
  double-click to rename), the classic MindManager summary.
- **Node shapes** — beyond box / rounded / pill, give a topic a **diamond** (decision), **oval**
  (start/end), **parallelogram** (I/O), **hexagon**, or **cylinder** (data store) from the style
  bar — the flowchart vocabulary. Drawn from one path builder shared by the canvas, exports, and the
  picker, so the screen and the export always match.
- **Conditional formatting** — a **🎨 Styles** panel of rules that auto-style topics by tag, marker,
  or completion (view-only; manual styling wins).
- **Styles organizer** — save a topic's look as a **named style** and reuse it on others (in the same
  **🎨 Styles** panel); persists across maps.
- **Layouts** — beyond the two-sided map: all-left / all-right, org-chart (down/up), radial,
  timeline, fishbone, a **grid / matrix** (tiles the first-level branches into a grid — a
  2×2 for SWOT / Eisenhower frames), and a **brace map** (left-to-right tree with `{` fork
  connectors), switchable from the toolbar and remembered per session. **Per-branch layout**:
  right-click a branch → *Branch layout* to give just that subtree a different layout (e.g. an
  org-chart branch inside a radial map).
- **Free-canvas (whiteboard) mode** — **🧲 Free layout** turns any map into a free canvas: drag
  topics anywhere and they stay (the auto-layout pauses). With shapes + directional arrows it makes
  place-anywhere flowcharts, concept maps, and whiteboards; positions persist on the node and flip
  back to auto-layout cleanly.
- **Diagram backdrops** — **◎ Diagram** draws a geometric frame behind your topics — **onion**
  (concentric rings), **funnel** (stacked stages), or **Venn** (2 or 3 overlapping circles) — and
  switches to free layout so you drop topics into its regions; **−/+** changes the ring/stage count.
  The frame renders into image exports too.
- **Multi-map library** — keep many named maps; switch, create, and delete from the header.
- **Version history** — per-map snapshots (auto while editing + on demand) with one-click restore;
  capped at 30, stored in IndexedDB, deleted with the map.
- **Autosave + reload** — every change persists to IndexedDB; your last map is restored on
  startup. Works fully offline.
- **Relationships** — draw a labelled, **directional** arrow (arrowhead at the target) between two
  nodes: right-click a node → **Link to…**, then click the target (with an optional label).
  Double-click a relationship to relabel it, right-click to delete. Imported `.mmap` relationships
  render too.
- **Links** — from the **ℹ Info** panel, give a node a clickable 🔗 to another **topic** in the
  same map, to another **map**, or to a **web page**; click the 🔗 to follow it.
- **Boundaries** — a toolbar **⬚ Group** draws a shaded, rounded box around the selected
  branch and its subtree (double-click the box's chip to label it); imported MindManager
  boundaries render the same way, and boundaries you draw round-trip back into the model.
- **Callouts** — anchored sticky-note annotations on any node (right-click → Add callout),
  inline-editable; they render into image exports too.
- **Floating topics** — imported detached topics render in a labelled "Floating topics"
  branch, and are editable: rename, add, remove, nest, or drag them in/out of the tree, and
  the changes round-trip back into the model.
- **Export** — native `.json` (lossless — the format for backup/transfer), Markdown
  (`.md`), OPML (`.opml`), **FreeMind/Freeplane `.mm`**, **Mermaid** (`.mmd`), **XMind `.xmind`**,
  **SimpleMind `.smmx`**, PNG, SVG, a
  self-contained HTML file, a standalone HTML **slide deck** (the Walk-Through as a shareable
  file), a **PowerPoint** (`.pptx`) deck, a Word **`.docx`** outline document, an Excel
  **`.xlsx`** outline sheet, and print-to-PDF.
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

- `src/mindmap/flow/` — the React Flow canvas: model→nodes/edges projection (`project.ts`),
  layouts (`layout.ts`), pure edit ops (`ops.ts`), and the native-text SVG exporter (`exportSvg.ts`).
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
