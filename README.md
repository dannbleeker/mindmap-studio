# MindMap Studio

A local-first, offline mind-mapping PWA — a self-hosted replacement for Corel/Mindjet
MindManager. Sibling to TP Studio and MECE Studio: same stack (React 19 + Vite + TypeScript),
same deploy target (GitHub Pages), no telemetry, your data stays on disk.

## Status: Phase 0 (de-risking spikes)

| Spike | Question it answers | Where |
| --- | --- | --- |
| **Look** | Can the [mind-elixir](https://github.com/SSShooter/mind-elixir-core) core (MIT) render close enough to MindManager? | `src/mindmap/` + `src/model/sampleMap.ts` |
| **Format** | Can we import existing `.mmap` files? | `src/import/mmap.ts` + `test/mmap.test.ts` |

The engine decision is **build on mind-elixir**, keeping a format-agnostic canonical model
(`src/model/types.ts`) as the single source of truth so the renderer and file formats stay
replaceable.

### Known caveat — the `.mmap` importer

`.mmap` is a ZIP of `Document.xml` (Mindjet's proprietary, partly-binary schema). The importer
is **one-way and lossy by design**: it recovers the topic tree + notes and *warns* about
markers/relationships/styling it can't yet map. It is currently validated against a **synthetic
fixture** modelled on the documented schema — it must be run against a **real `.mmap` export** to
tune the field mapping. Drop a sample map in and run the test to see what survives.

## Commands

```sh
pnpm install
pnpm dev         # look spike — dev server
pnpm test        # format spike — importer tests
pnpm build       # production build
pnpm typecheck   # tsc --noEmit
```

## Roadmap (abridged)

- **Phase 1 — Brainstorming MVP:** keyboard-first capture, icons/tags, notes, themes, autosave +
  multi-map library, Markdown import/export, PNG/SVG export, PWA offline, deploy.
- **Phase 2 — Migrate + present:** robust `.mmap` batch import, Walk-Through presentation mode,
  share/export (PDF, self-contained HTML), images + boundaries.
- **Phase 3 — Optional tail:** relationships/cross-links, `.mm`/`.xmind` interop, SmartRules-lite,
  templates.
- **Skipped:** task/Gantt/resource PM layer (not a target use case).
