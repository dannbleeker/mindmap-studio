# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

**Phase 1 (Brainstorming MVP) is complete**, a broad slice of Phase 2 is done, and the app
is **deployed** — a `deploy.yml` workflow publishes to GitHub Pages on every push to `main`,
live at <https://mindmap-studio.struktureretsundfornuft.dk/> (custom domain, HTTPS). See
`CHANGELOG.md`.

## ✅ Done: canvas engine migration (mind-elixir → React Flow)

To unlock the renderer-ceiling cluster (editable alternate layouts, callouts, rich-text
topics, organic branches) we're replacing the canvas engine with **@xyflow/react-flow**.
Approved plan: `~/.claude/plans/bubbly-finding-squirrel.md` (10 phases, ~8–11 wks; both
engines run in parallel behind `VITE_CANVAS_ENGINE` + a dev `?engine=flow` override, default
stays elixir until parity; the canonical model never changes, so the flag is the rollback).
**Done:** Phase 0 (engine-neutral contract `src/mindmap/contract.ts` + chooser `index.tsx`);
Phase A (React Flow added, **go/no-go #1 cleared** — lazy-loading both engines *dropped* the
entry to 78.7 kB ≤ 150 kB); Phase B (read-only render at parity); Phase C (**alternate layouts** —
side/left/right/org-down/org-up/radial/timeline/fishbone in `flow/layout.ts`, all routed by
**floating edges** `flow/floating.ts` so connections work in any orientation; layout `<select>`
extended + a `?layout=` URL param; new kinds fall back to "side" on the elixir engine). All
verified by headless screenshot under `?engine=flow`; Phase D (**editing UX**, model-first — pure
`flow/ops.ts` transforms (add/outdent/indent/delete/reparent/setTopic/collapse/note/icon/style/
group/replace; 14 tests), inline contenteditable (double-click / F2), keyboard tree-building
(Enter=sibling, Tab=child, Shift+Tab=outdent, Delete), all MindMapHandle mutators wired; verified
end-to-end via `__getLiveDoc`); Phase E (**undo/redo** snapshot stack `flow/history.ts` (Ctrl+Z /
Ctrl+Shift+Z / Ctrl+Y; 4 tests), **drag-to-reparent** (floating hit-test → `reparent` op, snap-back
on invalid drop), a right-click **context menu**, and **theming via CSS vars** (4 themes on flow +
a `?theme=` URL param); undo/redo/menu/dark all verified); Phase F (**model-authored
`exportSvg`** `flow/exportSvg.ts` — native `<text>` SVG from the doc + live node rects, reusing the
canvas's tapered-ribbon + floating-edge geometry plus a new shared `flow/style.ts` (boundary/cross-link
constants, so *canvas == export* can't drift). **go/no-go #2 cleared:** the export carries arrow +
boundary *labels* (the old elixir export dropped them), rasterises to PNG with **no canvas-taint**, and
survives the `sanitizeSvg → inlineSvgText` pipeline (14 tests; Office/deck are model-backed → untouched);
verified by rendering an exported SVG standalone); Phase G (**`flow/sync.ts` `fromFlow`** — the inverse of
`project()`: rebuild the canonical doc from RF nodes+edges, reading canvas-editable fields from node `data`,
preserving canonical-only `task`/`side` by id, restoring a collapsed node's omitted children from the prior
doc, and carrying boundaries (pruned of gone members). The headline guarantee is the round trip
`fromFlow(project(doc)) ≈ doc` (13 tests). The flow engine is model-first, so `fromFlow` is the regression
guard that `project()` stays lossless + the reconstruction primitive for future native gestures — not yet
wired to a UI gesture); Phase H pre-cutover features (you chose callouts + rich-text *before* the cutover):
**minimap + zoom Controls** (RF `<MiniMap>`/`<Controls>`, themed for dark via `colorMode`); **inline
rich-text topics** (`MapNode.topicRich`, Ctrl+B/I/U → `io/richText.ts` allowlist sanitiser, plain `topic`
fallback so flat formats are untouched); **anchored callouts** (`MapNode.callouts` + `flow/Callouts.tsx`
overlay + add via context menu, inline edit, delete; rendered in the SVG export too). Fixed a latent bug:
the boundary/callout overlays read a live `renderDoc` mirror (updated in `sync()`) instead of the stable
`doc` prop, so freshly-created boundaries + callouts now appear. **go/no-go #3 met** (parity verified +
441-node recompute ~1 ms). **CUTOVER + Phase I DONE (2026-06-14):** React Flow is now the only engine —
mind-elixir, its `foreignObject` export shim (`svgText.ts`), the elixir minimap/sync/node-menu, and both
deps are removed; `size-budget.mjs` guards `.react-flow`; the engine chunk (~37 kB) is gone (lazy 95.4 kB
/ entry 78.5 kB). Docs swept (README / CLAUDE / CHANGELOG / NOTICE / gap-analysis). **Follow-up:** deepen
USER_GUIDE + book + `features.json` coverage of the new features (callouts, rich-text, alternate layouts,
minimap) — they ship and work, but aren't yet documented in depth.

## MindManager UI-parity work (2026-06-12)

Worked the UI-comparison gap groups (1–8) plus deeper items. **Built:** Notes editor +
**Markdown preview**, Outline view + filter, theme gallery (Light/Dark/Ocean/Sunset),
layout direction, collapse/expand-all, marker palette + imported-icon→emoji, **per-topic
styling (shape/fill/border/bold)**, Find & Replace + `/`, new-map templates, **duplicate
map**, OPML import/export, **whole-library backup/restore**, **cross-map links**, an
enriched sample, a panels/hooks refactor, and a toolbar-wrap + a11y pass.

**2026-06-13:** shipped the full Office export trio — **Word `.docx`**, **PowerPoint `.pptx`**,
**Excel `.xlsx`** (each verified by opening the output with a real consumer — python-pptx /
openpyxl — or structural XML checks) — plus an HTML **slide deck**, **Copy outline** to the
clipboard, **editable floating topics**, **library-wide search** (🔎 All maps), the
mind-elixir core-CSS fix + a bundle guard, a shared-OOXML refactor, the Pages-actions
node24 bump, and the **native-SVG-`<text>` image export** (`.svg`/`.png`/`.html`/`.pdf` now
render everywhere, not only inline in a browser). See `CHANGELOG.md`.

Remaining items are Dann-dependent:

- [x] **Renderer-ceiling features — ALL SHIPPED (React Flow migration).** Alternate layouts
      (org-chart / timeline / fishbone / radial / up-down), organic tapered branches, callouts,
      rich-text *topics*, and full-fidelity image export (arrow + boundary *labels* + the filled
      boundary box, no canvas-taint) all ship now that React Flow is the only engine. See
      `CHANGELOG.md`.
- [ ] Import embedded **images from `.mmap`** binary blobs (in-app images work; MM import
      is the gap — needs the XSD image-ref scheme or a real image-bearing sample).
- [ ] Validate the `.mmap` importer's rich paths against a *real* feature-rich map
      (XSD-authoritative + integration-tested, but only `MMAP_FILE` fully closes it).

## Backlog — feature candidates

- [ ] **Tab-based multi-map open (reviewed 2026-06-13).** *Today:* one active map at a time —
      `App` holds a single `doc`/`liveDoc`, swapped by `switchMap()` via a `<select>` dropdown;
      one React Flow canvas (`FlowMindMap`, keyed by `doc.id`); persistence remembers a single `meta.lastOpened`.
      The data layer already holds many maps (IndexedDB library), so "many available" exists;
      "many *open* in tabs" is a UI/state change. **Two routes:** (a) **tab bar over one canvas**
      — replace the dropdown with a tab strip, persist `{openIds[], activeId}` instead of one
      `lastOpened`, reuse `switchMap()`; only the active map renders. *Low effort/risk* and
      covers the real "files open in tabs" UX. (b) **true simultaneous instances / split view**
      — multiple live canvas instances; *high effort/risk* because selection, notes,
      markers, and style panels are all written around a single active map (`docRef`).
      **Recommendation:** do (a) if wanted; defer (b) unless side-by-side comparison is needed.
- [x] **Alternate layout orientations — SHIPPED + default.** org-chart down/up, radial/hub,
      timeline, and fishbone all ship in `flow/layout.ts` and are in the Layout `<select>`
      (remembered via `localStorage["mindmap-layout"]`). Available to all users — React Flow is
      the only engine.
- [x] **Minimize/collapse the minimap — DONE (2026-06-14).** A "Minimap ▾/▴" toggle (RF
      `<Panel>`, bottom-right) hides/shows the `<MiniMap>` when it covers a dense map; the choice
      persists in `localStorage["mindmap-minimap-open"]`.
- [ ] **Import/export interop with other mind-mapping tools — remaining formats.** *Shipped
      (2026-06-14):* FreeMind/Freeplane `.mm` (import + export), Mermaid `mindmap` (import +
      export), and **XMind `.xmind` import + export** (modern `content.json` ZIP; export carries
      the tree + notes/links/tags + floating topics + relationships) — on top of the existing
      `.mmap`/OPML/Markdown/`.json` and the image/Office/deck exporters. *Remaining targets* (each
      a thin adapter to/from the canonical model): **older `.xmind`** (`content.xml`); **MindMup**
      (JSON), **iThoughts** (`.itmz`, ZIP), **SimpleMind** (`.smmx`, see its own item below), and
      **Markmap**. Lower priority — `.mm`/OPML/Markdown already bridge most of these tools both ways. Add by format openness +
      how many tools accept it.
- [x] **Favicon for browser tabs + bookmarks — DONE (2026-06-14).** Wired `icon.svg` as the
      SVG favicon + a 180×180 `apple-touch-icon.png` (rendered from the SVG, for iOS + as a PNG
      fallback) in `index.html`, and precached both in the PWA.
- [x] **SimpleMind import + export (`.smmx`) — DONE (2026-06-14).** `src/io/smmx.ts`
      (`fromSmmx`/`toSmmx`): a ZIP of `document/mindmap.xml`, topics stored FLAT with `parent`
      id refs + `relations`; round-trips the tree, notes, web links, relations↔cross-links, and
      floating topics, with a tidy x/y layout on export. Wired into **Open files** (`parseImport`)
      + the **⬆ Export…** menu; 7 tests. Schema confirmed against a working `.smmx` parser, **but
      not yet verified against a real SimpleMind file/app** — validate with a real `.smmx` when one
      is available (same caveat as the `.mmap` importer).
- [x] **Deep research: MindManager features vs MindMap Studio gaps** — done (2026-06-14).
      The full audit lives in [`docs/mindmanager-gap-analysis.md`](docs/mindmanager-gap-analysis.md):
      every MindManager capability mapped to shipped / partial / renderer-ceiling / out-of-scope,
      with a **prioritized list of buildable gaps**. Treat that doc's "Prioritized buildable gaps"
      section as the live signal behind this backlog. Headline quick wins it surfaced: the
      **marker/tag index view** (📑 Index panel), **auto-numbering** (1. Numbering toggle), and the
      **read-only Power Filter** (🎚 Filter panel) have all shipped (2026-06-14); still to build:
      **in-map topic-to-topic jump links**.

## Shippable product artifacts (parity with TP Studio, 2026-06-12)

All four "ships-with-the-product" artifacts (parity with the sibling project) are now
**shipped and wired into CI** — see `CHANGELOG.md`:

1. Project dashboard + stats pipeline + feature catalogue.
2. Dual licensing (Apache-2.0 / CC BY-NC 4.0) + in-app About dialog.
3. User manual rendered to `/user-guide.html`.
4. The book — _Thinking in Maps_ — built to EPUB + PDF, with a Rebuild-book workflow.

Open follow-ups: every feature is now booked (`book` 100%); `bookExample` is at 54% — the
remaining features without a worked example in the book (mostly import/styling/markers) are
the place to keep growing it.
