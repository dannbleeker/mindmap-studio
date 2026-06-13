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

**2026-06-13:** shipped the full Office export trio — **Word `.docx`**, **PowerPoint `.pptx`**,
**Excel `.xlsx`** (each verified by opening the output with a real consumer — python-pptx /
openpyxl — or structural XML checks) — plus an HTML **slide deck**, **Copy outline** to the
clipboard, **editable floating topics**, **library-wide search** (🔎 All maps), the
mind-elixir core-CSS fix + a bundle guard, a shared-OOXML refactor, the Pages-actions
node24 bump, and the **native-SVG-`<text>` image export** (`.svg`/`.png`/`.html`/`.pdf` now
render everywhere, not only inline in a browser). See `CHANGELOG.md`.

Remaining items are renderer-constrained or Dann-dependent:

- [ ] **Multi-line topic labels in exports collapse to one line.** `src/io/svgText.ts`
      reuses each foreignObject's correct x/y (so labels land in their boxes) but emits a
      single `<text>` per label. A topic with an explicit line break renders on one line.
      Fix: split on the break and emit per-line `<tspan>`s, distributing over the box height.
      Low severity (single-line is exact); the built-in `exportSvg(true)` is *not* the fix —
      it mispositions every label (verified).
- [ ] **Renderer-constrained (mind-elixir):** alternate layouts (org-chart / timeline /
      fishbone), organic/tapered branches, callouts, filled boundary enclosures, rich-text
      *topics*. These need a custom SVG renderer or a different engine — a multi-day rebuild.
- [ ] Import embedded **images from `.mmap`** binary blobs (in-app images work; MM import
      is the gap — needs the XSD image-ref scheme or a real image-bearing sample).
- [ ] Validate the `.mmap` importer's rich paths against a *real* feature-rich map
      (XSD-authoritative + integration-tested, but only `MMAP_FILE` fully closes it).

## Shippable product artifacts (parity with TP Studio, 2026-06-12)

All four "ships-with-the-product" artifacts (parity with the sibling project) are now
**shipped and wired into CI** — see `CHANGELOG.md`:

1. Project dashboard + stats pipeline + feature catalogue.
2. Dual licensing (Apache-2.0 / CC BY-NC 4.0) + in-app About dialog.
3. User manual rendered to `/user-guide.html`.
4. The book — _Thinking in Maps_ — built to EPUB + PDF, with a Rebuild-book workflow.

Open follow-ups: grow the book (`book` at 96%, `bookExample` at 36% — more worked examples
would help); un-booked features are `panel-persistence` and `copy-outline`.
