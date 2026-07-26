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
