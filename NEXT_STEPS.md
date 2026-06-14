# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

**Phase 1 (Brainstorming MVP) complete**, a broad slice of Phase 2 done, the canvas-engine
migration to **@xyflow/react** complete (React Flow is the only engine), and the app **deployed**
to GitHub Pages on every push to `main` — live at
<https://mindmap-studio.struktureretsundfornuft.dk/>. See `CHANGELOG.md` for all shipped work.

## Open items

- [ ] **Import embedded images from `.mmap` binary blobs.** In-app images work; MindManager
      import is the gap — needs the XSD image-ref scheme or a real image-bearing sample.
- [ ] **Validate importers against *real* feature-rich files.** The `.mmap` importer is
      XSD-authoritative + integration-tested, but only a real `MMAP_FILE` fully closes it; the
      `.smmx` importer carries the same caveat (verify against a real SimpleMind export).
- [ ] **Tab-based multi-map open.** Today one active map at a time (`App` holds a single
      `doc`/`liveDoc`, swapped via the map `<select>`; one canvas keyed by `doc.id`). Route (a):
      a tab strip over one canvas, persisting `{openIds[], activeId}` and reusing `switchMap()` —
      *low effort/risk*, covers the real "files in tabs" UX. Route (b): true simultaneous
      instances / split view — *high effort/risk* (selection, notes, markers, style all assume one
      active map via `docRef`). Recommendation: do (a) if wanted; defer (b) unless side-by-side
      comparison is needed.
- [ ] **Interop — remaining formats.** Read support is now broad: `.mmap`, OPML, Markdown (incl.
      multi-level headings), `.json`, FreeMind/Freeplane `.mm`, Mermaid, XMind (modern **and** legacy
      `content.xml`, + export), SimpleMind `.smmx`, iThoughts `.itmz`, MindMeister `.mind`, **MindMup
      `.mup`**, **Markmap**, Word `.docx`, Excel `.xlsx`. Remaining: a **`.mmap` writer** +
      **image-bearing `.mmap`** import (blocked on a real sample). Lower priority — open formats
      already bridge most tools.

## Competitive gap clusters (backlog candidates, 2026-06-14)

From the cross-tool survey of 19 mind-mapping tools —
[`docs/competitive-feature-matrix.md`](docs/competitive-feature-matrix.md). Excludes the
out-of-scope PM + collaboration/cloud pillars. Pick from these to form a concrete build list:

- [ ] **A — AI assist** (biggest category gap). Only a **keyless copy-prompt → paste-result
      bridge** (or optional BYO-key) fits the no-backend identity; paste-to-tree is half-built via
      OPML/Markdown import. Prompt→map, expand-branch, doc/URL→map, summarise.
- [ ] **B — More structures** — flowchart, true concept map, matrix/grid, brace map, multiple
      sheets per file.
- [x] **C — Content depth** — task progress + roll-up, start/due dates (overdue + filter), file
      attachments, conditional formatting, the styles organizer, and **task priority** (High/Med/Low
      + priority filter) all **shipped 2026-06-14**. Only **LaTeX/math** remains, deferred by decision
      (heavy KaTeX + ~1 MB offline fonts; not native to MindManager).
- [x] **D — Capture UX (cheap wins)** — paste-text → map, **Quick add** box, **drop-link-as-topic**,
      and a **brainstorm timer** all **shipped 2026-06-14**.
- [x] **E — Navigation polish (cheap wins)** — focus / isolate-branch, saved Power-Filter presets,
      and typo-tolerant Find all **shipped 2026-06-14**.
- [x] **F — Durability** — persistent per-map version history (IndexedDB snapshots) **shipped
      2026-06-14** (🕔 History panel: auto + on-demand snapshots, restore-in-place, capped at 30).
- [x] **G — Interop fills** — iThoughts (`.itmz`), MindMeister (`.mind`), legacy XMind
      `content.xml`, **MindMup (`.mup`)**, and **Markmap** all **shipped 2026-06-14**; remaining:
      image-bearing `.mmap` (blocked on a real sample) and a `.mmap` writer (high-risk).

Shipped 2026-06-14 from the quick-win clusters: **①/④** (background + focus), **③** (info panel +
tag editing), **⑦** (Word/Excel import), **G** (interop importers), **F** (version history), **E**
(saved filters + fuzzy Find), the first slice of **D** (paste text → map), and a good chunk of
**C** (task progress + roll-up, then start/due dates with overdue + a due-date filter).
Remaining bets: **A** (keyless AI bridge) and the rest of **B** (more diagram types: flowchart /
concept map / matrix / Venn / funnel, free-form whiteboard, per-branch layout, richer node shapes).
Shipped 2026-06-14 from **B**: **Kanban board** + **summary topics** + **node shapes** (flowchart
vocabulary: diamond / oval / parallelogram / hexagon / cylinder) + **directional relationships**
(arrowhead at the target) — together the enablers for flowchart & concept maps. (LaTeX is the only
deferred C item — heavy KaTeX + offline fonts.)

## Reference

- **Competitive feature matrix** — [`docs/competitive-feature-matrix.md`](docs/competitive-feature-matrix.md):
  the whole-category survey (19 tools) mapped to MindMap Studio, grouped into 11 areas, with the
  A–G gap clusters above.
- **MindManager gap analysis** — [`docs/mindmanager-gap-analysis.md`](docs/mindmanager-gap-analysis.md)
  is the MindManager-specific deep audit. The four headline quick wins (marker/tag index,
  auto-numbering, Power Filter, in-map jump links) **and** the whole renderer-ceiling cluster
  (alternate layouts / callouts / rich-text / organic branches) all shipped 2026-06-14; its
  refreshed "Next — remaining buildable gaps" list is the MindManager-side roadmap.
- **Book worked examples** — every feature is booked (`book` 100%); `bookExample` is ~66%. The
  features still lacking a worked example in the book (mostly import / styling / markers) are where
  to keep growing it.
