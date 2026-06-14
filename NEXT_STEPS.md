# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

**Phase 1 (Brainstorming MVP) is complete**, a broad slice of Phase 2 is done, and the app
is **deployed** — a `deploy.yml` workflow publishes to GitHub Pages on every push to `main`,
live at <https://mindmap-studio.struktureretsundfornuft.dk/> (custom domain, HTTPS). See
`CHANGELOG.md`.

## 🚧 In progress: canvas engine migration (mind-elixir → React Flow)

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
verified by headless screenshot under `?engine=flow`. **Next:** Phase D (keyboard editing UX —
the hard one: `flow/ops.ts` + `useMindmapKeys` + inline contenteditable), then E–I per the plan.

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

Remaining items are renderer-constrained or Dann-dependent:

- [ ] **Arrow / boundary text labels are dropped from image & document exports, and a
      boundary exports as a bracket, not the on-canvas box.** The geometry exports (the
      relationship arrow curve, and the boundary as mind-elixir's bracket `<path>`), but
      `exportSvg` omits their *text* labels (verified: the raw export contains neither the
      arrow label nor the boundary label) and doesn't know about our filled-box overlay — so
      a boundary that shows as a shaded box on-canvas still exports as a bracket. A fix would
      read the labels' + boxes' positions from the live DOM and inject `<text>`/`<rect>` into
      the export at mapped coordinates — finicky DOM→export coordinate work, hence deferred.
      Topics (incl. multi-line), marker icons, and node images all export correctly.
- [ ] **Renderer-constrained (mind-elixir):** alternate layouts (org-chart / timeline /
      fishbone), organic/tapered branches, callouts, rich-text *topics*. These need a custom
      SVG renderer or a different engine — a multi-day rebuild. (Filled boundary enclosures
      are now shipped — a custom overlay draws the MindManager-style shaded box, so they're
      no longer renderer-blocked; see `CHANGELOG.md`.)
- [ ] Import embedded **images from `.mmap`** binary blobs (in-app images work; MM import
      is the gap — needs the XSD image-ref scheme or a real image-bearing sample).
- [ ] Validate the `.mmap` importer's rich paths against a *real* feature-rich map
      (XSD-authoritative + integration-tested, but only `MMAP_FILE` fully closes it).

## Backlog — feature candidates

- [ ] **Tab-based multi-map open (reviewed 2026-06-13).** *Today:* one active map at a time —
      `App` holds a single `doc`/`liveDoc`, swapped by `switchMap()` via a `<select>` dropdown;
      one mind-elixir instance (`MindMap`); persistence remembers a single `meta.lastOpened`.
      The data layer already holds many maps (IndexedDB library), so "many available" exists;
      "many *open* in tabs" is a UI/state change. **Two routes:** (a) **tab bar over one canvas**
      — replace the dropdown with a tab strip, persist `{openIds[], activeId}` instead of one
      `lastOpened`, reuse `switchMap()`; only the active map renders. *Low effort/risk* and
      covers the real "files open in tabs" UX. (b) **true simultaneous instances / split view**
      — multiple live mind-elixir instances; *high effort/risk* because selection, notes,
      markers, style panels and `sync` are all written around a single `meRef`/active map.
      **Recommendation:** do (a) if wanted; defer (b) unless side-by-side comparison is needed.
- [ ] **More layout orientations — vertical (down / up) + remember orientation.** *Today:* the
      Layout control offers **both / right / left** only — all *horizontal* — and the choice is
      remembered globally (`localStorage["mindmap-layout"]`, applied via `applyDirection` →
      mind-elixir `initSide`/`initRight`/`initLeft`). The ask: also **build down** (top-down
      org-chart tree) and **up** (bottom-up), and possibly the **radial/hub** shown in the
      reference, with the orientation remembered (consider per-map, not just global). **Feasibility
      (verified):** mind-elixir has **only** `initLeft`/`initRight`/`initSide` — *no* vertical or
      radial mode — so down/up/radial are **renderer-ceiling** (need a custom SVG renderer or an
      engine that supports vertical/org-chart layouts; tie-in with the existing renderer-ceiling
      item). The "remember orientation" + a richer layout picker (the 3-icon control) are doable
      now; the new *orientations themselves* are the renderer-ceiling part.
- [ ] **Import/export interop with other mind-mapping tools — remaining formats.** *Shipped
      (2026-06-14):* FreeMind/Freeplane `.mm` (import + export), Mermaid `mindmap` (import +
      export), and XMind `.xmind` import — on top of the existing `.mmap`/OPML/Markdown/`.json`
      and the image/Office/deck exporters. *Remaining targets* (each a thin adapter to/from the
      canonical model): **XMind export** (zip `content.json` + manifest — the import side is
      done) and **older `.xmind`** (`content.xml`); **MindMup** (JSON), **iThoughts** (`.itmz`,
      ZIP), **SimpleMind** (`.smmx`), and **Markmap**. Lower priority — `.mm`/OPML/Markdown
      already bridge most of these tools both ways. Add by format openness + how many tools
      accept it.
- [x] **Deep research: MindManager features vs MindMap Studio gaps** — done (2026-06-14).
      The full audit lives in [`docs/mindmanager-gap-analysis.md`](docs/mindmanager-gap-analysis.md):
      every MindManager capability mapped to shipped / partial / renderer-ceiling / out-of-scope,
      with a **prioritized list of buildable gaps**. Treat that doc's "Prioritized buildable gaps"
      section as the live signal behind this backlog. Headline quick wins it surfaced (not yet
      built): **auto-numbering**, a **marker/tag index view**, a **read-only Power Filter**, and
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
