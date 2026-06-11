# Changelog

Notable changes to MindMap Studio. Loosely follows Keep a Changelog; pre-1.0 and
phase-based. Open work lives in `NEXT_STEPS.md`, not here.

## [Unreleased]

### Added

- **Phase 0 scaffold** — local-first mind-map PWA on React 19 + Vite 6 + TS,
  built on the mind-elixir core (MIT) with a format-agnostic canonical model
  (`src/model/types.ts`) as the single source of truth.
- **MindManager-style render** — theme with a per-branch colour palette,
  two-sided radial layout, and rounded topics (`src/mindmap/`).
- **One-way `.mmap` importer** (`src/import/mmap.ts`) — recovers the topic tree +
  notes and warns on unmapped features. Validated against a synthetic fixture;
  pending a real `.mmap` to harden field mapping.
- **The "green before done" gate** — `pnpm gate` runs typecheck → lint/format
  (Biome) → dead-code (knip) → tests (vitest) → build (vite) → bundle-size
  budget, fail-fast. Mirrored in GitHub Actions CI (`.github/workflows/ci.yml`).
- **Working agreement** captured in `CLAUDE.md`.
