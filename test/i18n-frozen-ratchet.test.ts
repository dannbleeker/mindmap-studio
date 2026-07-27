// The frozen-`t()` RATCHET. A per-file budget of module-scope `t()` calls that may only shrink.
//
// test/i18n-frozen-constants.test.ts proves WHY these are a trap: a `t()` at module scope is evaluated
// once, at import, so its string cannot follow a later `setLocale`. This file makes sure the count
// cannot quietly grow while the rest of the migration continues — the shape is easy to reach for
// (a module-level `const LAYOUTS = [{ label: t("…") }]` reads perfectly naturally) and there are 194
// existing examples to copy from, so "don't do that" is not a strategy that survives contact.
//
// The budget doubles as the worklist. Fixing a file means giving it getters or making it a function,
// then lowering its number here; the entry disappears when it reaches zero. Adding a file is not
// possible without editing this list, which is the point — it forces the decision to be deliberate.
import { describe, expect, it } from "vitest";
import { frozenByFile } from "../scripts/lib/i18nFrozen.mjs";

// Measured 2026-07-26 on branch i18n/complete-migration. Sorted by count so the expensive files —
// the ones worth fixing first — sit at the top.
const BUDGET: ReadonlyArray<readonly [string, number]> = [
  ["src/panelLabels.ts", 26],
  ["src/components/EdgeInspector.tsx", 15],
  ["src/components/start/sections/Layouts.tsx", 15],
  ["src/components/start/sections/Learn.tsx", 12],
  ["src/components/editorCommands.ts", 11],
  ["src/components/start/StartSidebar.tsx", 10],
  ["src/components/BranchExportDialog.tsx", 7],
  ["src/components/start/AppTips.tsx", 7],
  ["src/components/start/CaptureCard.tsx", 7],
  ["src/Panels.tsx", 6],
  ["src/components/Toolbar.tsx", 6],
  ["src/components/start/MapCard.tsx", 6],
  ["src/components/start/sections/About.tsx", 6],
  ["src/mindmap/flow/ShapeLayer.tsx", 6],
  ["src/components/ThemeDesignerDialog.tsx", 4],
  ["src/mindmap/theme.ts", 4],
  ["src/components/MapPanel.tsx", 3],
  ["src/mindmap/flow/CanvasOverlays.tsx", 3],
  ["src/Kanban.tsx", 2],
  ["src/mapParts.ts", 1],
];
// Cleared 2026-07-27: stickers.ts (25) and mindmap/flow/slashCommands.ts (9) converted to getters —
// both had zero consumers outside their own module, so it cost no call site anything. Recent.tsx (3)
// went too, but as a side effect of fixing a data-loss bug rather than as a freeze fix: it keyed its
// date buckets on the rendered label, so a translated label stopped matching and whole sections of
// maps disappeared. See test/start-library-sections.test.tsx.
//
// WHAT THIS NUMBER DOES NOT MEAN. Driving it to 0 would not finish the job, and chasing it is a trap:
//   - The detector counts `t(` calls, so a module-scope DERIVATION that materialises its inputs is
//     invisible. `MapPanel.tsx:112`, `Kanban.tsx:27` and `icons.ts:116` each read a table once at
//     import; convert their sources to getters and they silently re-freeze while this reports 0.
//   - The layout names, marker-group names and sticker categories those tables carry are raw English
//     literals — not `t()` calls — so they score 0 here and 0 in the scanner while being untranslated.
// A sweep that empties this table while the layout picker still reads "Radial / hub" in Danish is the
// "green tick that measured nothing" pattern this codebase keeps rediscovering.

const TOTAL = BUDGET.reduce((sum, [, n]) => sum + n, 0);

describe("frozen module-level t() budget", () => {
  const actual = frozenByFile("src");

  it("no file exceeds its budget", () => {
    const over = [...actual]
      .filter(([file, n]) => n > (BUDGET.find(([f]) => f === file)?.[1] ?? 0))
      .map(([file, n]) => `${file}: ${n} > ${BUDGET.find(([f]) => f === file)?.[1] ?? 0}`);

    expect(
      over,
      "A module-scope t() call is frozen at import and cannot follow setLocale.\n" +
        "Move it inside the render/function, or give the constant a getter.\n" +
        "See test/i18n-frozen-constants.test.ts for the proof.",
    ).toEqual([]);
  });

  it("no NEW file introduces frozen calls", () => {
    const budgeted = new Set(BUDGET.map(([f]) => f));
    expect([...actual.keys()].filter((f) => !budgeted.has(f))).toEqual([]);
  });

  it("the total only goes down — lower the budget when a file is fixed", () => {
    const total = [...actual.values()].reduce((sum, n) => sum + n, 0);
    expect(total).toBeLessThanOrEqual(TOTAL);
    // Not `toBe`: a fix that lands without updating BUDGET should pass, not fail. The stale entry is
    // then visible as slack rather than as a broken build.
  });
});
