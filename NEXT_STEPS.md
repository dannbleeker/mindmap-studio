# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Blocking / decisions

- [ ] **GitHub Pages deploy** — the repo is live and CI is green; the actual
      Pages publish (build + deploy workflow) isn't set up yet.

## Phase 1 — Brainstorming MVP

Done: keyboard editing (mind-elixir), `.mmap` + Markdown import, Markdown export,
edit-capture (canvas edits → canonical model), autosave + reload (IndexedDB), a
multi-map library (list / switch / new / delete), PNG / SVG export, an installable
offline PWA, the mind-elixir 5 upgrade, the node editing UI (node-menu —
icons / tags / font style / link / memo↔note), and node search (find / focus by
topic, with cycling). **Phase 1 is complete** except:

- [ ] Deploy to GitHub Pages — **needs Dann**: enable Pages in repo settings +
      confirm a public live deploy (outward-facing, so skipped during the loop).

## Later

- [ ] Phase 2 — robust `.mmap` batch import, images + boundaries rendering on the
      canvas. (Presentation mode, self-contained HTML export, print-to-PDF, node
      search, lazy-load, and relationship arrows are done.)
- [ ] Validate the `.mmap` importer's notes / hyperlinks / relationships /
      boundaries / floating-topic paths against a real map that *uses* them — the
      current impl is XSD-authoritative + synthetic-tested, but Dann's sample
      exercised none of them.
- [ ] Custom tapered-branch renderer (only if pixel-exact organic branches are
      ever wanted; mind-elixir's default is already close).
- [ ] Bump Vite 6 → 8 to match TP Studio.
