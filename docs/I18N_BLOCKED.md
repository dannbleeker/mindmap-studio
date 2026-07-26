# i18n — blocked on an owner decision

Items the migration reached and deliberately did **not** decide. Each changes visible copy, changes
behaviour, or asks a question the migration has no standing to answer on its own. They are recorded
here rather than guessed at, and rather than left as a silent gap.

Everything here is **known and bounded** — the file it lives in simply does not join the guard's
allowlist until the item is resolved, so it cannot be mistaken for finished work.

---

## 1. The empty-canvas coachmark interleaves a sentence with `<kbd>` markup

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
