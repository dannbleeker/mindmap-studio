import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type Violation,
  argumentViolations,
  jsxTextViolations,
  placeholderViolations,
  propViolations,
  proseViolations,
  scanSource,
  templateViolations,
} from "../scripts/lib/i18nDetectors.mjs";

// The guard that stops the localisation work rotting.
//
// Once a file is migrated, nothing prevents the next person adding a button with a hardcoded label —
// and the failure is silent: the UI looks right in English and simply never translates. tsc can't see
// it (a plain string is valid), and no behavioural test notices, because English IS the fallback.
//
// So this scans the files that have been migrated and fails on user-facing string literals. It is
// deliberately an ALLOWLIST rather than a whole-tree scan: a file joins the list when it's migrated, so
// the guard grows with the work instead of blocking every file that hasn't been touched yet.
//
// It checks six shapes, chosen because they're where user-facing text actually lives and because they
// can be detected without false positives on CSS values, class names and DOM plumbing:
//   1. a literal in a user-facing prop  — title="Save" rather than title={t("…")}
//   2. prose in a positional argument   — add("open-file", "Open file…", …), or a tuple member
//   3. prose in a template literal      — title={`Delete view ${v.name}`}
//   4. a user-facing placeholder        — "(untitled)"
//   5. JSX text between its tags        — <MenuLabel>Arrowheads</MenuLabel>
//   6. a line of bare prose             — the multi-line paragraphs inside <p>…</p>
//
// Each detector past the first exists because the ones before it were demonstrably blind. (2) was added
// after putting `editorCommands.ts` on the list made it PASS with ~50 labels still hardcoded — an
// unnamed argument is neither a prop nor a bare prose line. (3) and (4) were added the same way: with
// four files on the list and a green tick, an interpolated `` `Inserted the ${p.name} map part.` `` and
// a bare `"(untitled)"` were still shipping untranslated, 12 strings in all. A green tick that claims
// coverage it doesn't have is worse than no tick, so when this list grows, re-verify the files already
// on it rather than assuming the tick covered them.
//
// Remaining limitation, stated so nobody assumes otherwise: (2) needs a capitalised MULTI-WORD literal,
// so a single-word label — `add("present", "Present", …)` — still slips through. Widening it to single
// words would collide with ids, `kind` values and technical tokens, and a noisy guard gets switched off.
// (5) is what makes single words safe in the ONE place they can be told apart — between JSX tags,
// where `>Type</` is unambiguously rendered content rather than an id or a discriminator.
//
// When this fires, the fix is to move the string into a catalogue — not to add the file to an ignore
// list. If a genuinely non-user-facing string trips it, narrow the check rather than widening the
// exceptions.
//
// The detectors themselves live in `scripts/lib/i18nDetectors.mjs`, shared with
// `scripts/i18n-scan.mjs` — which runs them over ANY file, so the next migration can see its worklist
// without joining this allowlist and going red. This file owns the allowlist and the self-test; that
// file owns the rules. They were briefly two copies, and the copy silently lost a `\s` and reported
// zero `label=` hits on a file that had sixty.

/** Files whose user-facing strings have been moved into a catalogue. Add a file when you migrate it. */
const MIGRATED = [
  "src/components/SettingsDialog.tsx",
  "src/mindmap/flow/TopicNode.tsx",
  "src/shortcuts.ts",
  "src/components/editorCommands.ts",
  "src/components/Toolbar.tsx",
];

const scan = (rel: string): Violation[] =>
  scanSource(readFileSync(join(process.cwd(), rel), "utf8"));

const report = (rel: string, v: Violation[]) => {
  const lines = v.map((x) => `  ${rel}:${x.line}  ${x.why}\n    ${x.text}`).join("\n");
  return `${rel} has ${v.length} hardcoded user-facing string(s) — move them into a catalogue:\n${lines}`;
};

describe("migrated files carry no hardcoded user-facing strings", () => {
  for (const rel of MIGRATED) {
    it(rel, () => {
      const violations = scan(rel);
      expect(violations, report(rel, violations)).toEqual([]);
    });
  }

  it("actually detects all six shapes it claims to", () => {
    // A guard that can't fail is worse than none — pin that each detector fires on its own shape.
    expect(propViolations('        title="Save the map"')).toHaveLength(1);
    expect(propViolations('        title={t("map.save")}')).toHaveLength(0);
    expect(propViolations('        <MenuItem label="Fit map to screen" />')).toHaveLength(1);
    expect(propViolations('        <optgroup label="Templates">')).toHaveLength(1);
    // (2) the positional-argument shape, and the things it must not mistake for prose.
    expect(
      argumentViolations('  add("open-file", "Open file…", "map", () => io.openFile());'),
    ).toHaveLength(1);
    expect(
      argumentViolations('  add("open-file", t("cmd.open-file"), "map", () => io.openFile());'),
    ).toHaveLength(0);
    expect(argumentViolations('  ["json", ".json (lossless)", io.exportJson],')).toHaveLength(0); // lowercase start
    expect(argumentViolations('  ["json", "JSON (lossless)", io.exportJson],')).toHaveLength(1);
    // An object property is NOT an argument: shortcuts.ts keeps key names literal on purpose.
    expect(argumentViolations('      { keys: "Ctrl/⌘ + Z", action: t("x") },')).toHaveLength(0);
    // A doc comment quoting UI text must NOT be flagged — the Toolbar migration rewrote exactly this
    // shape once, turning commentary into a t() call mid-sentence.
    expect(
      argumentViolations('  /** Copy the branch into a new library map ("New map from topic"). */'),
    ).toHaveLength(0);
    // An argument wrapped onto its own line, and a ternary's two branches.
    expect(argumentViolations('    "Priority: clear on selected topic",')).toHaveLength(1);
    expect(argumentViolations('    t("cmd.node-priority-clear"),')).toHaveLength(0);
    expect(
      argumentViolations('    sel ? "Copy link to this topic" : "Copy link to this map",'),
    ).toHaveLength(2);
    // …including the arms prettier wraps onto their own lines, where only the `?` half used to be seen.
    expect(argumentViolations('                  ? "Couldn\'t save"')).toHaveLength(1);
    expect(argumentViolations('                  : "Saved locally"}')).toHaveLength(1);
    // A template in the `then` arm must not hide a hardcoded `else` arm.
    expect(
      argumentViolations(
        '  showHint(ok ? `Inserted the ${p.name} map part.` : "Select a topic first.");',
      ),
    ).toHaveLength(1);
    // …but a plain object property with a prose value stays exempt, as before — no space before its
    // colon, and no `?` on the line either.
    expect(argumentViolations('      { keys: "Ctrl/⌘ + Z" },')).toHaveLength(0);
    expect(
      argumentViolations('      { keys: cond ? a : b, action: "Undo The Thing" },'),
    ).toHaveLength(0);
    expect(argumentViolations('  const label = "Saved locally";')).toHaveLength(0);
    // Documented limitation: a single-word label isn't caught.
    expect(argumentViolations('  add("present", "Present", "map", run);')).toHaveLength(0);
    // (3) template literals — prose survives the `${…}` holes; machine values don't look like prose.
    expect(templateViolations("  title={`Delete view ${v.name}`}")).toHaveLength(1);
    expect(templateViolations("  showHint(`Inserted the ${p.name} map part.`)")).toHaveLength(1);
    expect(templateViolations('  title={t("view.delete", { name: v.name })}')).toHaveLength(0);
    // Machine-facing templates that must NOT trip it — all real shapes from the canvas and exporters.
    expect(templateViolations("  transform: `translate(${x}px, ${y}px) scale(${s})`")).toHaveLength(
      0,
    );
    expect(templateViolations("  const d = `M ${x} ${y} L ${a} ${b}`")).toHaveLength(0);
    expect(templateViolations("  const src = `data:image/png;base64,${b64}`")).toHaveLength(0);
    expect(
      templateViolations("  className={`node ${selected ? 'is-selected' : ''}`}"),
    ).toHaveLength(0);
    // (4) the placeholder, and the things shaped like it that aren't prose.
    expect(placeholderViolations('  {mm.title || "(untitled)"}')).toHaveLength(1);
    expect(placeholderViolations('  {mm.title || t("common.untitled")}')).toHaveLength(0);
    expect(placeholderViolations('  const re = /"(a|b)"/')).toHaveLength(0);
    // (5) JSX text between its tags — the one place a SINGLE word is safe to flag.
    expect(jsxTextViolations("        <MenuLabel>Arrowheads</MenuLabel>")).toHaveLength(1);
    expect(jsxTextViolations('        <option value="left">Left side</option>')).toHaveLength(1);
    expect(jsxTextViolations('        <option value="org-down">Org chart ↓</option>')).toHaveLength(
      1,
    );
    // Interpolated content is already migrated — it must not fire.
    expect(
      jsxTextViolations('        <MenuLabel>{t("canvas.menu.type")}</MenuLabel>'),
    ).toHaveLength(0);
    expect(jsxTextViolations("        <span>{count} selected</span>")).toHaveLength(0);
    // A lone glyph or initial is not a label.
    expect(jsxTextViolations("        <kbd>K</kbd>")).toHaveLength(0);
    // Lowercase content is a technical token, not a label.
    expect(jsxTextViolations("        <code>npm run dev</code>")).toHaveLength(0);
    expect(
      proseViolations("          Preferences live in this browser and stop there"),
    ).toHaveLength(1);
    expect(proseViolations('          {t("settings.prefsFile.body")}')).toHaveLength(0);
    // Things that must NOT trip it — every one of these was a real false positive on the first run.
    expect(proseViolations("  const settingsFileRef = useRef(null)")).toHaveLength(0);
    expect(
      proseViolations("  // Read the local storage estimate when the dialog opens"),
    ).toHaveLength(0);
    expect(propViolations('  <div aria-hidden="true" />')).toHaveLength(0);
    expect(proseViolations("      void navigator.storage")).toHaveLength(0);
    expect(proseViolations("          background: style?.fillImage")).toHaveLength(0);
    expect(proseViolations("            style?.background ??")).toHaveLength(0);
    expect(proseViolations("        boxShadow: dropTarget")).toHaveLength(0);
  });

  it("does not mistake a multi-line block comment's continuation lines for prose", () => {
    // The one false positive this guard produced in anger: a JSX block comment whose opener is on the
    // first line, so the CONTINUATION lines start with prose rather than a star and looked like copy.
    const jsxComment = [
      "        {/* Move project item 14 shifts every task date in this branch by a preset,",
      "            preserving relative offsets. Shown only when the branch actually has dated",
      "            tasks, so this stays honest */}",
      "        Branch layout follows",
    ].join("\n");
    const hits = proseViolations(jsxComment);
    // Only the real JSX copy on the last line survives — all three comment lines are skipped.
    expect(hits.map((h) => h.line)).toEqual([4]);

    // An opener INSIDE a string must not start a phantom block that swallows everything after it.
    const notAComment = [
      '        const glob = "src/**/*.tsx";',
      "        Real copy lives here",
    ].join("\n");
    expect(proseViolations(notAComment)).toHaveLength(1);
  });
});
