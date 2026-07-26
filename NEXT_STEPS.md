# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

MindMap Studio is **feature-complete for its scope** (local-first, offline, single-user, free) and
**live** at <https://mindmap-studio.struktureretsundfornuft.dk/> (GitHub Pages, custom domain,
redeployed on every push to `main`). Canvas engine is **@xyflow/react**.

**Docs coverage:** the user manual covers **100%** of the feature catalogue. `book` coverage is
**editorial by design** — the remaining `book:false` catalogue entries are deliberate exclusions (UI
chrome/affordances that don't belong in a technique-first book; the user guide is the 100% reference),
**not a backlog**.

Every remediation programme is shipped, including the 2026-07-02 MindManager review (all 33 items,
Tiers 1–5). Per-item detail lives in `CHANGELOG.md`. Three of that review's candidates were rejected as
**already shipped** — user-savable map parts, instant task filters, active-filter indicator —
**don't re-propose them**. Anything deliberately **not** built is recorded under *Deferred / blocked*
or *Out of scope*, so the decisions don't get re-litigated. Known-thin areas that are neither open work
nor decided sit in [`docs/KNOWN_ROUGH_EDGES.md`](docs/KNOWN_ROUGH_EDGES.md).

## Open — localisation (i18n), in progress since 2026-07-26

The **locale layer is built and English runs on it**; `src/i18n/` holds the registry, the typed English
catalogue and the `Intl`-based plural/collation helpers, and `SettingsDialog` + the preferences-file
handlers plus the whole keyboard cheat sheet, the ⌘K command registry, the **entire editor toolbar** and
the **entire canvas** (`TopicNode` + `FlowMindMap`) are migrated (**423 catalogue entries** so far — 334
eager + 89 in the lazy canvas chunk), behind a lint guard that fails on any new hardcoded user-facing
string in a migrated file. English is the only locale and is expected to stay that way for now — adding
one means adding a JSON catalogue, not changing the app.

**Trust the guard's list, not its tick — re-verify a file when the guard gains a detector.** On
2026-07-26 it was green over five files while 46 user-facing strings were still hardcoded in three of
them; three more detectors later that day found **51 more** in files already ticked. It now has seven
detectors and its own self-test pins each one. The failure mode is structural, not a one-off: every
detector so far was added *after* a file it should have covered was ticked. So the rule when you add
one: prove it clean on every file already on the allowlist FIRST — if it fires there, those are real
misses and fixing them is part of the same commit.

Two recurring traps, both of which cost real bugs:

- **A local named `t` shadowing the imported `t()`** — five existed. In that scope `t("…")` is
  uncallable, so a migration pass skips the strings *silently* and leaves no trace. Worse, a scripted
  pass that rewrites INTO such a scope produces code that compiles and throws "t is not a function" at
  runtime; one nearly shipped from `insertableTemplates.map((t) => …)`.
- **Duplicate text across catalogues.** A test now fails when a canvas message repeats an eager one
  word for word — it caught four on the first run, one of which was demonstrably shipping the same
  sentence in both chunks. Reuse the existing key (a lazy chunk can reference an eager one for free);
  keep both only for a genuine homonym, and then add it to that test's documented exception list.

**Bundle strategy — decided 2026-07-26.** Measured on the first 43 catalogue entries: the layer itself
is a ~1 kB gz one-off, and the marginal cost per migrated string is the **key**, not the text (the
English text was already in the bundle, inline). At ~25 bytes of key per entry, the remaining ~1,400
chrome strings are **roughly +12 kB gz** — more than the current ceiling allows.

**That +12 kB is an upper bound, and the toolbar came in far under it — remeasure before bumping the
ceiling.** Finishing `Toolbar.tsx` (93 strings) cost **+0.5 kB gz**, 170.1 → 170.6 against a 171 kB
ceiling, no bump. The reason generalises: 31 of those labels are word-for-word ⌘K commands, so they
**reuse the existing `cmd.*` key** instead of adding a message — which deletes a duplicate copy of the
English text and substitutes a shorter key, netting out near zero. The projection assumed every string
is new text. Wherever the chrome repeats itself, it doesn't. So: migrate, measure, and only then decide
whether the ceiling needs moving.

**The approach: chunk-locality first, then raise the ceiling for what's left. Keep `t()` synchronous.**

Put every string that *can* be chunk-local into a lazy catalogue beside its callers, so the eager
catalogue carries only genuinely-eager chrome — `FlowMindMap` alone is a ~100 kB lazy chunk holding ~175
strings. Then bump the ceiling to cover the eager remainder, documenting the reason in
`size-budget.mjs` as every prior bump has.

**Deliberately NOT doing yet: fetching English as a JSON asset.** It looks like the scalable answer and
it is — later. With one locale it saves nothing: the ~12 kB doesn't disappear, it becomes a second
request, and since the UI can't render its own labels until that request lands it's on the critical path
regardless. What you'd actually buy is a `t()` that can be called before messages exist (precisely the
bug that bit this layer on day one), a gate on first paint or a flash of raw keys, and every consumer
having to tolerate "not loaded yet". For scale: the service worker already precaches **43 entries,
1,690 KiB** — 12 kB is **0.7%** of what ships and caches today, once per release.

Fetching becomes correct at **N locales**, where inline costs N × 12 kB (everyone downloads every
language) and fetched costs 12 kB (everyone downloads one). At two it's a wash; at three or more
fetching clearly wins. The architecture already supports it — `registerMessages()` is per-locale and
later registrations overlay earlier ones, which is exactly the hook a fetched translation needs — so
build it in the commit that adds the second language, where it earns its complexity, not before.

Also still open from the plan: the remaining chrome strings. Get the worklist from the scanner rather
than from a number written down here — `node scripts/i18n-scan.mjs <file>` runs the guard's own
detectors over any file, so you see what it will hold you to *before* joining the allowlist:

```sh
node scripts/i18n-scan.mjs src/Panels.tsx src/App.tsx --count
```

As of 2026-07-26 that reports **233 `Panels.tsx` + 83 `App.tsx` = 316**, and those two are what's left
of the chrome. **`App.tsx` was missing from this plan entirely** until the scanner was pointed at it.
Both are eager, so unlike the canvas their strings land in the entry chunk — measure after, and expect
`Panels.tsx` to be the one that finally forces the ceiling decision.

The counts move whenever a detector is added (they went 301 → 374 → 316 in a day: two new detectors
found more, then migrating the canvas removed a file). That is why the command above is the source of
truth and the number here is a snapshot. Expect hand-work beyond it too — the guard's documented
limitations are listed below. The rest of
the `Intl` adoption: `timeAgo` and all 12 collation sites are
**done**; still open are `taskDate.ts`'s English `MONTHS` + `parseNaturalDate` grammar (logic, not
translation) and the ~103 locale-unsafe `toLowerCase` sites. Then the exporters taking the locale (`lang`
attributes, PPTX `lang="en-US"` + its empty `<a:ea>`/`<a:cs>`, XLSX's Calibri-only font) and the PWA
manifest strings.

`editorCommands.ts`, `Toolbar.tsx`, `TopicNode.tsx` and `FlowMindMap.tsx` are **done** — don't re-plan
them. The design once recorded here
for `editorCommands.ts` (drop the label argument and derive the key from the command id inside `add()`)
was **rejected on implementation and should not be revived**: a template-literal key cannot be verified
by `tsc`, and compile-time key checking is the property the typed catalogue exists for. Each call site
passes an explicit key literal instead.

Documented guard limitations, so nobody assumes coverage that isn't there: the positional check needs a
capitalised MULTI-WORD literal, so a single-word label (`"Present"`, `"+ New…"`) still slips through —
widening it would collide with ids and `kind` values. Object properties with prose values are exempt on
purpose (`shortcuts.ts` keeps physical key names literal), which also means a genuinely user-facing
`title:` inside an object literal is invisible.

Correction to the earlier analysis, found on implementation: **"Danish `å` sorts wrong today" was
overstated.** Collation follows the *active* locale, so with English active `Å` correctly collates as
`A`. The default `.sort()` is still wrong for both English and Danish (codepoint order strands å/æ past
z), so `compareText` is a real fix — but Danish's å-after-z order only arrives with a Danish locale.

## Blocked on owner access

- **Manual MindManager open-test of a Studio-exported `.mmap`.** The writer is Studio-faithful but has
  never been opened in real MindManager; the `.mmap`/`.smmx` *importers* are both owner-validated
  (2026-06-19) and guarded by env-gated integration tests (`MMAP_FILE` / `SMMX_FILE`). Awaits Dann's
  next MindManager access. Value rose once the writer began emitting tags, task metadata and embedded
  images, so re-test against that.

## Deferred / blocked (off the active list)

- **Saved *filter* presets stay app-wide in localStorage — decided 2026-07-26, don't re-raise as
  written.** Backlog item 33 asked for saved views *and* filters to move into doc meta; the views half
  shipped, the filter half was declined on recon. `FilterCriteria` is entirely generic (text / markers /
  tags / due / priority / completion / relationship direction + type) with **no map-specific ids**, and
  `filter.ts` documents the presets as "persisted app-wide, reusable across maps". Scoping them to a
  document would *remove* that reuse — a preset saved on one map would stop appearing on the next —
  turning a working feature into a per-map one. The real gap — getting them to a second machine — was
  closed instead by the preferences export/import in Settings (2026-07-26).

- **RTL — deferred (2026-07-25), lower value than it looks and gated on a spike.** ~113 physical
  left/right CSS and inline-style sites in the chrome, 0 logical properties. Scope note that makes it
  cheaper than it first appears: the **39 canvas `flow/*` sites must NOT be mirrored** — a node's
  `side` is persisted *geometry* the user authored, not text direction — and arrow-key semantics need
  only a ~5-line mirror at the `keyIntent.ts` boundary, because `ops.nextSelectionId` is already purely
  topological (left = parent) rather than spatial, with the freeform `nudge` deliberately excluded.
  Unverified risk to spike first: whether `dir="rtl"` on the chrome can be cleanly isolated from the
  React Flow viewport's own transform maths. Note Arabic/Hebrew *content* already renders correctly
  inside nodes via the Unicode bidi algorithm — what's LTR-only is the chrome.
- **AI assist** — **decided against (2026-06-15).** The biggest category-wide gap, but the only fit
  for a no-backend, local-first app is a keyless copy-prompt → paste-result bridge (or BYO-key),
  which isn't worth building. The manual path already exists: paste an outline / Markdown → map.
- **Theme-only `.mmap` styling + summary brackets** — a topic with no explicit colour inherits the
  MindManager `StyleGroup` theme (we don't resolve it), and summary spans are positional/implicit in
  the schema; both are low-ROI, left lossy by design.
- **LaTeX / math** — deferred by decision (heavy KaTeX + ~1 MB offline fonts; not native to MindManager).
- **True simultaneous multi-map / split view** — the multi-doc tab strip already covers tabbed
  switching; side-by-side comparison is a large change (selection/notes/style all assume one active
  `docRef`), deferred unless needed.

## Out of scope (by decision — won't build)

Recorded so the decisions don't get re-litigated (folded in from the retired MindManager gap doc): the
**project-management engine** (Gantt, resources, dependencies, cost, formulas / roll-up dashboards,
topic properties), **real-time collaboration / publishing / enterprise** (co-editing, comments,
access control, cloud/Teams hosting), **capture** (Snap-style web/mobile clippers), and a **separate
native mobile app** (the PWA is responsive — a native app is a different product). Also out by
design (2026-06-16): a **networked / multi-parent graph** — the model is a single-parent, **acyclic
tree**; cross-node links live in the relationship-arrow layer, and a TheBrain-style graph would
re-architect the product (cyclic *connectors* already ship as relationships). A local-first,
no-backend PWA can't and shouldn't chase these.
