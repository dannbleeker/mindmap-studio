# MindMap Studio — working agreement

A local-first, offline mind-mapping PWA replacing Corel/Mindjet MindManager.
React 19 + Vite 6 + TypeScript, built on the **mind-elixir** core (MIT). Sibling
to TP Studio and MECE Studio. These habits override default behavior — hold both
of us to them.

## The ship loop — "green before done"

The full local gate is **one** command, fail-fast, in this order:

```sh
pnpm gate
# tsc --noEmit  →  biome check .  →  knip  →  vitest run  →  vite build  →  size budget
```

- Run `pnpm gate` before every push. Nothing is "done" until the gate is green
  **and** CI is green.
- After pushing, watch CI (`.github/workflows/ci.yml`). If it goes red,
  goal-seek from the **actual** failure logs (`gh run view --log-failed`), not
  guesses, and re-push until green. Then say what landed.
- Never report success over failing checks. If a test fails, show the output.
  When something is verified, say so plainly — lead with the evidence.

## Plan before big changes

- **L-effort** (3+ files, a new module, a schema/data migration, or real design
  ambiguity): pause and give a short plan first — files to touch, the approach,
  alternatives rejected, how it'll be verified. Small, clear changes: just do it.
- Risky or cross-cutting: land a behavior-preserving **PREP** commit first (pin
  current behavior with a test + extract the seam the change needs), then build
  the change on top. Keep prep and feature as separate commits.

## Verify your own work

- Anything observable (the canvas, an import result, CLI output): run it and
  verify before handing back. For visual/canvas changes, render it and confirm
  it looks right (dev-server screenshot via the `mindmap-dev` preview), and back
  it with a deterministic test where possible.
- Lead with evidence (run output / screenshot / passing test), not "should work".

## Commit & docs hygiene

- Small, focused commits. **Conventional Commits** (feat / fix / refactor /
  chore / docs). The message explains WHY. Don't bundle a refactor into a feature.
- Before pushing a feature, take a maintainability pass (naming, dead code,
  simpler shape), then re-run the gate.
- Update docs in the **same session** as the code: `README.md`, `CHANGELOG.md`,
  any user guide. When a fact changes, grep for the old reality and fix every
  stale mention. `NEXT_STEPS.md` holds **OPEN items only** — shipped work lives
  in `CHANGELOG.md`.

## Code quality bars

- Keep a **framework-free core** that's pure and unit-tested. The canonical model
  (`src/model/`) and the import/export adapters (`src/import/`, later
  `src/export/`) are deterministic with no DOM coupling. mind-elixir is wrapped
  behind a thin adapter (`src/mindmap/`) so the engine stays replaceable.
- **One source of truth** for any cross-cutting rule: the canonical model
  (`src/model/types.ts`), the bundle budget (`scripts/size-budget.mjs`),
  validation — no drift between call sites.
- New capabilities **additive and opt-in / off-by-default**. Prefer an optional
  field over a data migration.

## Fix what's broken — honestly

- Spot something stale / wrong / dead → fix it this session (don't defer); chase
  the root cause but stay bounded to the fix + its siblings. Respect "leave it".
- Don't paper over warnings to hit zero. A real issue gets fixed; a false
  positive gets a **documented suppression** (a `biome-ignore` with a reason, a
  knip `@public` tag / config entry). The warning list should mean something.

## Work efficiently

- When a question spans 2+ areas of the code, fan out parallel exploration
  sub-agents instead of serial grepping; use the cheapest model that's enough.

## Stack notes / gotchas (this machine)

- Package manager is **pnpm** (npm's PowerShell shim is CLM-blocked). pnpm 11
  build approvals live in `pnpm-workspace.yaml` (`allowBuilds`), **not**
  package.json. Drive pnpm/node directly.
- `C:\devtools` is AppLocker-allowlisted, so `node_modules` binaries run there.
- Dev server is registered for preview as **`mindmap-dev`** on port **5175**.
- Engine: mind-elixir (`src/mindmap/`). Canonical model: `src/model/types.ts`.
  Importers: `src/import/`. The `.mmap` importer is **one-way + lossy by design**.
- Scope: **brainstorming/knowledge + presentations/sharing**. The task / Gantt /
  SmartRules / resource PM layer is **out of scope** unless we decide otherwise.
