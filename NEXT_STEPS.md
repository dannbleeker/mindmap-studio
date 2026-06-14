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
- [ ] **Interop — remaining formats.** Both-ways already: `.mmap` (in), OPML, Markdown, `.json`,
      FreeMind/Freeplane `.mm`, Mermaid, XMind (modern `content.json`), SimpleMind `.smmx`.
      Remaining thin adapters to/from the canonical model: **older `.xmind`** (`content.xml`),
      **MindMup** (JSON), **iThoughts** (`.itmz`, ZIP), **Markmap**. Lower priority — `.mm`/OPML/
      Markdown already bridge most tools both ways. Prioritise by format openness + adoption.

## Reference

- **MindManager gap analysis** — [`docs/mindmanager-gap-analysis.md`](docs/mindmanager-gap-analysis.md)
  is the live backlog signal: every MM capability mapped to shipped / partial / renderer-ceiling /
  out-of-scope, with a prioritised list of buildable gaps. The headline quick wins (marker/tag
  index, auto-numbering, Power Filter, in-map jump links) all shipped 2026-06-14 — re-run it for
  the next tranche.
- **Book worked examples** — every feature is booked (`book` 100%); `bookExample` is ~66%. The
  features still lacking a worked example in the book (mostly import / styling / markers) are where
  to keep growing it.
