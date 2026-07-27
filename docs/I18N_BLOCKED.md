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

One item inside this decision is a *correctness* defect rather than a translation gap, and is worth
revisiting separately if a second locale ships: a handful of example notes give UI-referential
instructions ("open Notes", "use the Markers panel"). Once the chrome is translated those sentences name
controls that no longer exist under those names — they become wrong, not merely untranslated.

---

## 3. The bundle gate measures a subset of first-load JS

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

**This is not broken today, and that is exactly what makes it worth writing down.** Nothing outside
tests calls `setLocale`, and the registry resolves the stored locale before any catalogue-consuming
module loads — so the frozen strings are currently correct. They stop being correct the moment a
language picker ships, and they fail *quietly*: the app switches to Danish and the panel tabs, slash
commands, edge presets, Start sidebar and theme names stay English. A half-translated UI reads as a
broken translation, not as a code defect, so it would be reported late and diagnosed slowly.

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
