// The entry-chunk size budget — SINGLE SOURCE OF TRUTH, imported by both the gate
// (scripts/size-budget.mjs, which fails the build) and the dashboard
// (scripts/build-stats.mjs, which reports it in public/stats.json).
//
// It lives in its own module because those two drifted: build-stats.mjs carried a hand-copied
// `budgetKb = 150` with a "mirrors size-budget.mjs" comment and was never updated through the ten
// bumps below, so the dashboard reported a 150 kB ceiling — and a false `withinBudget: false` — while
// the gate enforced 171. Importing it makes that drift impossible rather than merely fixed once.
//
// Raise/lower this deliberately (in the same commit as the change that moves it),
// never silently. The entry chunk is the JS that loads on first visit.
// 150 → 153: the search & nav pack adds editor-core code (broadened Find +
// operator/scoped search parser + back/forward navigation history) that can't be
// meaningfully lazy-loaded, nudging the entry from 149.9 to ~152 kB gz.
// 153 → 158: the knowledge-linking / capture / accessibility packs (cross-map +
// in-note links, slash-capture, keyboard + SR a11y) add more editor-core UI that
// likewise can't be lazy-loaded. Headroom for the whole multi-pack effort.
// 158 → 159: typed relationships (B3) + export-this-branch (B4). The branch-export
// picker itself is lazy, but its editor-core orchestration (relationship types in
// the projection / EdgeInspector / rules / filter, the branch-export command +
// context-menu wiring) lands in the entry and can't be lazy-loaded.
// 159 → 160: custom theme designer (C3). The designer UI is lazy, but useTheme must
// resolve a persisted custom theme synchronously on first paint (else the canvas
// flashes the wrong theme), so the store read + luminance-derived cssVar mapping
// (getCustomThemes / customToCanvasTheme) land in the entry and can't be lazy-loaded.
// 160 → 163: the 2026-07-02 Tier 3 batch (MindManager review) — the MenuSub fly-out
// submenu primitive (used by the always-mounted Insert menu + Map panel), the visual
// Layout gallery (layoutPreview.ts + its SVG renderer, replacing a native <select> in
// the always-mounted Map panel), the Design gallery's move from the lazy Canvas menu
// into the always-mounted Map panel, and the AND/NOT rules + full 1-9 priority
// expansions. All of it is core editor-chrome/canvas code the Map panel or canvas
// keydown handler needs synchronously, so none of it can be meaningfully lazy-loaded.
// 163 → 165: the 2026-07-02 Tier 1/2 batch — most of it (boards, exports, .mmap writer,
// #tag/paste/date ops) is lazy or self-contained, but the live-map-slides deck renderer
// (useMapExports' renderDeckSvgs/renderDeckImages + the resolveSlides/slideKey imports)
// rides in the eagerly-imported export hook, nudging the entry ~0.2 kB over the old
// razor-thin 163 ceiling. The 2 kB headroom also stops the near-flush margin from
// flaking the gate under concurrent CI/Deploy/Stats runners.
// 165 → 167: the 2026-07-26 Tier 5 batch. Two eager additions, both unavoidable:
// richTextCommands (item 25) replaces document.execCommand and is reached from the
// always-mounted Notes panel, and saved views (item 33) moved onto the doc schema. The
// XMind marker vocabulary from item 34 is deliberately NOT here — it was placed in
// io/xmind.ts rather than the eager icons.ts precisely so the format adapters stay lazy,
// which held the entry flat. This left 0.3 kB of headroom at 165; 167 restores a working
// margin without loosening the ceiling enough to hide real bloat.
// 167 → 169: the i18n layer (2026-07-26). The registry + Intl plumbing is a ~1 kB one-off; after that
// the marginal cost of migrating a string is the KEY, not the text, because the English text was
// already in the bundle inline. Measured: 43 catalogue entries ≈ 25 bytes of key each. That makes the
// FULL ~1,440-string extraction roughly +12 kB gz of keys, which this ceiling cannot absorb — see the
// open decision in NEXT_STEPS before the bulk migration. This bump covers the layer plus the first
// migrated surface; it is not headroom for the rest.
// 169 → 171: the editorCommands / ⌘K registry batch (2026-07-26). ~50 more catalogue keys at the
// measured ~17 bytes gz each. Tracking the strategy note in NEXT_STEPS: chunk-locality first, then bump
// for the eager remainder. This is the eager chrome registry, so it has to sit in the entry chunk.
// 171 → 175: forward headroom for the rest of the i18n migration (2026-07-26), by owner decision.
// Unlike every bump above, this one is a PROJECTION, not a measurement of landed work — recorded as
// such so the next reader doesn't mistake it for evidence. Measured so far: the App.tsx `hint.*` batch
// is +1.2 kB gz for ~124 new keys (~10 bytes each), taking the entry to 171.8. Almost none of those keys
// reuse an existing message the way Toolbar.tsx's 31 shared `cmd.*` keys did, which is why this batch
// costs what Toolbar's 93 strings did not. Panels.tsx's remaining 233 strings project to ~+2.3 kB at
// that rate, landing near 174; 175 covers the finished eager migration in one move rather than a bump
// per batch.
// What that buys and what it costs: no repeat bumps mid-migration, but ~4 kB of slack sits unguarded
// until the migration lands, so unrelated bloat can ride in unnoticed — the precise risk the 167 → 169
// note warned about. It also front-runs the "chunk-locality first, then raise the ceiling" ordering in
// NEXT_STEPS, which is recorded there as superseded by this decision.
// TIGHTEN THIS BACK when Panels.tsx lands: re-measure the real entry and set the ceiling just above it.
export const BUDGET_KB = 175;
