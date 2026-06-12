# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Blocking / decisions

- [ ] **GitHub Pages deploy** — the repo is live and CI is green; the actual
      Pages publish (build + deploy workflow) isn't set up yet.

**Phase 1 (Brainstorming MVP) is complete**, and a broad slice of Phase 2 is done too
(see `CHANGELOG.md`). Only the Pages deploy remains for Phase 1:

- [ ] Deploy to GitHub Pages — **needs Dann**: enable Pages in repo settings +
      confirm a public live deploy (outward-facing, so skipped during the loop).

## Phase 2 — remaining

- [ ] Render node **images** on the canvas — needs image *import* from the `.mmap`
      binary blobs first (no image source today).
- [ ] Make the floating-topics branch fully editable (currently display-only — edits to
      it aren't captured back into `floatingTopics`).
- [ ] Validate the `.mmap` importer's notes / hyperlinks / relationships /
      boundaries / floating-topic paths against a real map that *uses* them — the
      current impl is XSD-authoritative + synthetic-tested, but Dann's sample
      exercised none of them.
- [ ] Custom tapered-branch renderer (only if pixel-exact organic branches are
      ever wanted; mind-elixir's default is already close).
