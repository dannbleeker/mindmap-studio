# i18n — blocked on an owner decision

Items the migration reached and deliberately did **not** decide. Each changes visible copy, changes
behaviour, or asks a question the migration has no standing to answer on its own. They are recorded
here rather than guessed at, and rather than left as a silent gap.

Everything here is **known and bounded** — the file it lives in simply does not join the guard's
allowlist until the item is resolved, so it cannot be mistaken for finished work.

---

## 1. ✅ RESOLVED (2026-07-27) — markup interleaved with prose

**Decision: build the node interpolator.** Keep the `<kbd>`/`<strong>` styling *and* make each sentence
one reorderable message. Shipped as `tNodes` in `src/i18n/nodes.tsx`.

The scope turned out to be **three files, not one**. Grepping `<kbd>` found the same shape in
`FirstRunCard.tsx` (five list items, `<strong>` as well as `<kbd>`) and `CaptureCard.tsx`, both of which
this file had counted under "blocked" without naming. All three are migrated and now on the guard's
allowlist.

Two things worth keeping, because they are the reason this was not as done as it looked:

- **The scanner cannot see this shape at all.** No detector matches a sentence that a JSX element has
  cut in half, so after the `<kbd>` exemption landed all three files reported *zero hardcoded strings*
  while their prose was still hardcoded. `test/i18n-pseudo-render.test.tsx` renders them instead, and
  that is what actually holds them — the allowlist entry is bookkeeping.
- **The harness had the same blind spot, from the other side.** `tNodes` splits a message into sibling
  text nodes, so wrapping a whole message in `⟦…⟧` left every interior run unmarked and reported as
  hardcoded. `applyMarkerLocale` now marks each *segment*. Found by pointing the harness at the real
  component, not by review.

Also fixed in passing, both invisible to every detector: `DropLabel` shadowed the imported `t` with a
local variable (so its label could not be migrated without a silent runtime error), and
`"3 things to try"` escaped the JSX-text rule because the rule requires a leading `[A-Z]` and `3` is
not one.

<details>
<summary>Original write-up, kept for the rationale</summary>

`src/mindmap/flow/CanvasOverlays.tsx:41,45`

```tsx
Press <kbd>Tab</kbd> for a child · <kbd>Enter</kbd> for a sibling · double-click to rename
<kbd>Shift</kbd>-drag the canvas to select several topics
```

**Two rules collide here.**

*Physical key names stay literal.* `Tab`, `Enter` and `Shift` denote keys on a keyboard, not words; a
locale does not rename them. This is already policy — `src/i18n/core.ts` documents it for the keyboard
cheat sheet, and `test/i18n-no-hardcoded-strings.test.ts` pins `keys: "Ctrl/⌘ + Z"` as a must-not-fire
case.

*A sentence must be one message.* The prose around those keys is split into fragments by the `<kbd>`
elements, so a translator can never reorder it — and most languages will need to. "Press X for a child"
does not survive being cut into "Press", X, "for a child" in, say, German or Japanese.

**Why this isn't just done:** `t()` returns a string, so the obvious fix — one message with `{child}`
and `{sibling}` placeholders — cannot carry the `<kbd>` elements. Resolving it means one of:

- **Drop the `<kbd>` styling** and make the whole line one message with the key names inline. Simplest,
  fully translatable, and a **visible design change** (the keys stop looking like keys).
- **Render the message through a small interpolator** that maps placeholders to React nodes, so
  `t("canvas.coach.editKeys")` returns `Press {child} for a child …` and the component substitutes
  `<kbd>Tab</kbd>`. Keeps the styling and the word order; adds a helper the codebase does not have.
- **Leave it English.** Honest, and the coach is a first-run affordance, but it is the first thing a new
  user reads.

Until then `CanvasOverlays.tsx` stays off the allowlist. Everything else in it is migrated; the file
reports exactly these three key names.

</details>

---

## 2. Map content — declined, recorded so it is not re-litigated

`src/exampleBuilders.ts` (~169), `src/templates.ts` (~30), `src/model/sampleMap.ts` (~14)

Owner decision, 2026-07-26: **do not migrate examples, patterns or templates.** Their bodies AND their
names stay English.

The accepted consequence, stated plainly: those names render in the "+ New…" dropdown and the Insert ▸
Map parts menu, so **those menu entries will read English inside an otherwise translated menu**.

**The correctness defect inside this decision is ✅ FIXED (2026-07-27), by owner decision.** A handful
of example notes gave UI-referential instructions ("Open the Outline panel", "📝 Notes or 🏷 Markers
from the toolbar"). Those name controls that will not be called that in a translated UI, so the
sentence stops being untranslated and starts being *wrong* — and wrong in example content reads as the
app lying to a new user.

Six strings reworded: `exampleBuilders.ts` (5) and `sampleMap.ts` (1). **The copy is still English —
the decline stands.** This was a correctness fix, not a migration; nothing moved into a catalogue.

The rule, now recorded at the top of `exampleBuilders.ts`: describe the *action* and keep the **glyph**
as the finding aid. 🔗, 🧲, 📝, 🏷 and ↓ are not translated, so they point at the right control in
every locale — "use 🔗 to point this topic at your Strategy map" survives, "🔗 Link" does not.

Audited all three content files, not just the ones already known. `templates.ts` has **zero** —
every string there describes map content. Deliberately left alone: "switch the layout to right-only"
(describes the result; the label is "Right") and the four "Link me to your … map" topic texts (ordinary
verb, not a quoted label). A brittle "(Chapter 5)" cross-reference went at the same time.

---

## 3. ✅ RESOLVED (2026-07-27) — the bundle gate measured a subset of first-load JS

**Decision: gate on true first load, re-based to 182 kB**, recorded as a metric correction rather than
an allowance. Measured at the switch: 157.9 entry + 22.4 preloaded = **180.3 kB**.

**182, not the ~185 first sketched.** 185 would leave ~4.7 kB of unguarded slack, which is precisely
what the `171 → 175` note in `bundle-budget.mjs` warned about and then demonstrated — "unrelated bloat
can ride in unnoticed". The usual argument for a fat margin does not apply: this figure is
deterministic, so unlike the coverage floor it cannot flake under concurrent CI/Deploy/Stats runners.
That is the same reasoning that accepted 0.9 kB of headroom at 175. 182 leaves 1.7 kB.

Two things came out of doing it that were not in the original write-up:

- **The dashboard would have drifted from the gate.** `build-stats.mjs` computed its own `withinBudget`
  from `index-*.js`, so after the flip it would have reported green against a ceiling it was measuring
  differently — the same failure `bundle-budget.mjs` exists to prevent, one level up from the constant.
  The measurement now lives in `scripts/lib/firstLoad.mjs` and both import it.
- **It is guarded by a test, not just by having been done once.** `test/first-load-budget.test.ts`
  pins that a modulepreloaded chunk counts and a dynamically-imported one does not. Mutation-checked:
  reverting the rule to entry-only fails two of its three cases. Verified end-to-end too — with the
  ceiling temporarily at 179 (above the entry, below true first load) the gate fails, where the old
  metric would have passed.

<details>
<summary>Original write-up, kept for the rationale</summary>

`scripts/size-budget.mjs`, `scripts/bundle-budget.mjs`

The gate weighs `index-*.js` and calls it "the initial bundle". Rollup also splits code shared by
several eagerly-imported modules into its own chunk, and Vite emits a `<link rel="modulepreload">` for
it — so the browser fetches it on first paint exactly like the entry. The gate filed those under "lazy"
and stopped counting.

**Measured:**

| | entry | preloaded | true first load |
| --- | --- | --- | --- |
| at this branch's start | 168.1 | 8.4 | **176.5** |
| after the eager-inspector batch | 158.0 | 20.6 | **178.6** |

Two things follow, and they point in opposite directions:

- **The true figure has been above the 175 ceiling since before this work started.** Not a regression
  introduced here — verified by building the branch point.
- **The gate can report an improvement for a change that made things worse.** Migrating the eager
  inspectors moved ~16.6 kB into `primitives-*.js`; the gate reported 168.5 → 158.0, a 10.5 kB "win",
  for a change that added 141 catalogue keys. Real first load went *up* ~2 kB.

`size-budget.mjs` now **computes and prints** the true figure, and flags it when it exceeds the ceiling.
It still **gates on the old metric**, deliberately — switching it changes what a guard-rail means, and
because the true number was already over, flipping it silently would either read as a regression this
work caused or invite raising the ceiling to hide it.

**The decision:** gate on true first load and re-base `BUDGET_KB` to the measured figure plus a margin
(recording it as a metric correction, not an allowance) — or keep the entry-only metric and document
that it is a proxy. The one option to avoid is leaving a gate that can be satisfied by moving weight
sideways.

Worth noting either way: `primitives-*.js` at 16.6 kB is the UI-primitive layer, pulled in eagerly. If
first-load size matters, that chunk — not the catalogue — is where the weight actually is.

</details>

---

## 4. 194 strings are frozen at import and will not follow a language picker

`test/i18n-frozen-ratchet.test.ts` holds the per-file list; `test/i18n-frozen-constants.test.ts` proves
the mechanism.

`t()` reads the **active** locale at call time. A call inside a render function therefore follows a
later `setLocale`. A call at **module scope** runs once, when the module is first imported, and freezes
its result into a `const`:

```ts
// src/panelLabels.ts — evaluated at import, forever English
export const PANEL_LABELS = {
  outline: { tab: t("panel.outline"), menu: t("panel.outline") },
  …
```

**⚠️ CORRECTED 2026-07-27 — the original write-up below got the trigger wrong, in the dangerous
direction.** It said the frozen strings were "currently correct" because "the registry resolves the
stored locale before any catalogue-consuming module loads", and that they arm "the moment a language
picker ships". Both were false, and the second is the sentence on which "just require a reload" rested.

Measured: `main.tsx` called `initLocale()` in its body, *below* `import { App }`. ES imports are hoisted
and evaluated depth-first, so the entire eager graph had already run its module-scope `t()` calls
against `DEFAULT_LOCALE` — **99 of the 194 froze before resolution ever ran.** That is fixed (the call
now lives in the `src/i18n` barrel body, pinned by `test/i18n-init-order.test.ts`), but it means the
"currently correct" reassurance was luck, not design: it held only because `LOCALES` has one entry.

And the trigger is **`LOCALES` gaining a second entry, not a picker.** `resolveLocale()` already reads
`navigator.languages`, so the day a second catalogue ships, a Danish browser gets a half-English first
paint — panel tabs, slash commands, edge presets, Start sidebar and theme names in English — **with no
user action and no UI involved**. A half-translated UI reads as a broken translation rather than a code
defect, so it would be reported late and diagnosed slowly.

**A related blind spot, recorded so it is not rediscovered:** the ratchet counts `t(` calls, so it
cannot see a module-scope *derivation* that materialises its inputs — `MapPanel.tsx:112`,
`Kanban.tsx:27` and `icons.ts:116` each read a table once at import. Migrate their sources to getters
and they silently re-freeze while the detector reports 0. Their contents (layout names, marker-group
names) are also raw English literals today, so they score 0 on every existing check.

**Checked and clear:** module-scope *collation* was suspected as a second family of the same bug. An
independent AST scan found zero — `collator()` builds a fresh `Intl.Collator(active, …)` per call, and
`taskDate.ts` re-keys its `DateTimeFormat` on `getLocale()`. Do not re-litigate.

**Measured spread** — 194 calls in 23 files, concentrated in the ones that build label tables:
`panelLabels.ts` (26), `stickers.ts` (25), `EdgeInspector.tsx` (15), `start/sections/Layouts.tsx` (15),
`start/sections/Learn.tsx` (12), `editorCommands.ts` (11), then a tail.

**Why it isn't just fixed here:** the fix is mechanical but not free. Each site becomes either a getter
or a function call, and the second form changes every consumer — `PANEL_LABELS.outline.tab` becomes
`panelLabels().outline.tab` in `App.tsx` and `Toolbar.tsx`. Across 194 sites that is a wide,
behaviour-neutral diff touching files this branch has otherwise finished with, landed at the end of a
long migration, and impossible to verify by eye. It wants its own change with its own review.

**The options:**

- **Getters** (`get tab() { return t("panel.outline"); }`) — no call-site churn at all, since property
  access already looks like property access. Pinned as working in the third test. Slight cost: the
  object is no longer a plain frozen literal, and `as const satisfies` typing needs a look.
- **Functions** (`panelLabels()`) — the most explicit about the cost, and the most churn.
- **Accept it and drop `setLocale`'s dynamism** — decide the locale is fixed for a session and require
  a reload to change it. Legitimate, much smaller, and needs saying out loud rather than emerging by
  accident. If this is the choice, `setLocale` should reload the page so the contract is honest.

Until then the ratchet holds the line: the count cannot grow, no new file can join, and the budget
table is the worklist.
