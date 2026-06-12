# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

**Phase 1 (Brainstorming MVP) is complete**, a broad slice of Phase 2 is done, and the app
is **deployed** — a `deploy.yml` workflow publishes to GitHub Pages on every push to `main`,
live at <https://mindmap-studio.struktureretsundfornuft.dk/> (custom domain, HTTPS). See
`CHANGELOG.md`.

## MindManager UI-parity work (2026-06-12)

Worked the UI-comparison gap groups (1–8) plus deeper items. **Built:** Notes editor +
**Markdown preview**, Outline view + filter, theme gallery (Light/Dark/Ocean/Sunset),
layout direction, collapse/expand-all, marker palette + imported-icon→emoji, **per-topic
styling (shape/fill/border/bold)**, Find & Replace + `/`, new-map templates, **duplicate
map**, OPML import/export, **whole-library backup/restore**, **cross-map links**, an
enriched sample, a panels/hooks refactor, and a toolbar-wrap + a11y pass.

Remaining items are genuinely renderer-constrained or Dann-dependent:

- [ ] **Renderer-constrained (mind-elixir):** alternate layouts (org-chart / timeline /
      fishbone), organic/tapered branches, callouts, filled boundary enclosures, rich-text
      *topics*. These need a custom SVG renderer or a different engine — a multi-day rebuild,
      not a tweak.
- [ ] Import embedded **images from `.mmap`** binary blobs (in-app images work; MM import
      is the gap — needs the XSD image-ref scheme or a real image-bearing sample).
- [ ] Make the floating-topics branch fully editable (currently display-only).
- [ ] Validate the `.mmap` importer's rich paths against a *real* feature-rich map
      (XSD-authoritative + integration-tested, but only `MMAP_FILE` fully closes it).
- [ ] Word / PowerPoint / Project / Excel export (heavy generators; `.html`/`.pdf`/`.png`/
      `.svg`/`.opml`/`.md`/`.json` cover sharing + interchange today).

## Shippable product artifacts (parity with TP Studio, 2026-06-12)

Four "ships-with-the-product" artifacts to match the sibling project, each wired into CI to
stay current. **#1 (project dashboard + stats pipeline + feature catalogue) shipped** — see
`CHANGELOG.md`. Remaining:

- [ ] **Dual licensing** — `LICENSE` (Apache-2.0, for the code) + `LICENSE-BOOK`
      (CC BY-NC 4.0, for the prose); a README `## License` section; and an in-app About
      dialog surfacing copyright + a third-party-notices link (`NOTICE.md` → `/notices.html`).
- [ ] **User manual** — render the existing `USER_GUIDE.md` to `user-guide.html` at build
      time and link it in-app (Help/About). The catalogue's `manual` flag already tracks
      coverage (41/44 today).
- [ ] **Book** — a longer-form teach-the-domain book under `docs/guide/`, built to **both**
      PDF and EPUB from one markdown source, with a "Rebuild book" workflow (rebuild only when
      book inputs change) and an opt-in "send to Kindle". The catalogue's `book` /
      `bookExample` flags (0/44 today) track coverage; the dashboard already renders the gap.
