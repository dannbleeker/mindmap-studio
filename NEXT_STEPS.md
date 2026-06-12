# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Blocking / decisions

- [ ] **GitHub Pages deploy** — the repo is live and CI is green; the actual
      Pages publish (build + deploy workflow) isn't set up yet.

**Phase 1 (Brainstorming MVP) is complete**, and a broad slice of Phase 2 is done too
(see `CHANGELOG.md`). Only the Pages deploy remains for Phase 1:

- [ ] Deploy to GitHub Pages — **needs Dann**: enable Pages in repo settings +
      confirm a public live deploy (outward-facing, so skipped during the loop).

## MindManager UI-parity pass (2026-06-12)

Worked the gap groups from the UI comparison in order. **Built:** Notes editor,
Outline view + filter, theme gallery (Light/Dark/Ocean/Sunset), layout direction
(both/right/left), collapse/expand-all, marker palette + imported-icon→emoji, Find &
Replace + `/` shortcut, new-map templates, OPML import/export, an enriched sample, and a
panels/hooks refactor. Remaining items are renderer-constrained or Dann-dependent:

- [ ] **Renderer-constrained (mind-elixir):** alternate layouts (org-chart / timeline /
      fishbone), per-topic shapes / borders / branch styles, callouts, filled boundary
      enclosures, rich-text topics/notes. Would need a custom renderer or a different engine.
- [ ] Import embedded **images from `.mmap`** binary blobs (in-app images work; MM import
      is the gap — needs the XSD image-ref scheme or a real image-bearing sample).
- [ ] Make the floating-topics branch fully editable (currently display-only).
- [ ] Validate the `.mmap` importer's rich paths against a *real* feature-rich map
      (XSD-authoritative + now integration-tested, but only `MMAP_FILE` fully closes it).
- [ ] Word / PowerPoint / Project / Excel export (heavy generators; `.html`/`.pdf`/`.png`/
      `.svg`/`.opml` cover sharing today).
