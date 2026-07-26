import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
// It checks three shapes, chosen because they're where user-facing text actually lives and because they
// can be detected without false positives on CSS values, class names and DOM plumbing:
//   1. a literal in a user-facing prop  — title="Save" rather than title={t("…")}
//   2. prose in a positional argument   — add("open-file", "Open file…", …), or a tuple member
//   3. a line of bare prose             — the multi-line paragraphs inside <p>…</p>
//
// (2) was added after (1) and (3) turned out to be blind to it: putting `editorCommands.ts` on the list
// below made it PASS with ~50 labels still hardcoded, because an unnamed argument is neither a prop nor a
// bare prose line. A green tick that claims coverage it doesn't have is worse than no tick.
//
// Remaining limitation, stated so nobody assumes otherwise: (2) needs a capitalised MULTI-WORD literal,
// so a single-word label — `add("present", "Present", …)` — still slips through. Widening it to single
// words would collide with ids, `kind` values and technical tokens, and a noisy guard gets switched off.
//
// When this fires, the fix is to move the string into a catalogue — not to add the file to an ignore
// list. If a genuinely non-user-facing string trips it, narrow the check rather than widening the
// exceptions.

/** Files whose user-facing strings have been moved into a catalogue. Add a file when you migrate it. */
const MIGRATED = [
  "src/components/SettingsDialog.tsx",
  "src/mindmap/flow/TopicNode.tsx",
  "src/shortcuts.ts",
];

/** Props whose value is read by a user or a screen reader. */
const USER_FACING_PROPS = ["title", "aria-label", "placeholder", "alt"];

/** Values that are legitimately literal: DOM/ARIA plumbing rather than prose. */
const ALLOWED_LITERALS = new Set(["true", "false", "none", "off", "on", "polite", "assertive"]);

interface Violation {
  line: number;
  text: string;
  why: string;
}

/** A literal in a user-facing prop — `title="Save"` instead of `title={t("…")}`. */
function propViolations(src: string): Violation[] {
  const out: Violation[] = [];
  src.split("\n").forEach((line, i) => {
    for (const prop of USER_FACING_PROPS) {
      // Only a double-quoted literal: the `{t(...)}` form has a brace, not a quote, after the `=`.
      const m = new RegExp(`(?:^|\\s)${prop}="([^"]{2,})"`).exec(line);
      if (!m) continue;
      const value = m[1];
      if (ALLOWED_LITERALS.has(value.toLowerCase())) continue;
      out.push({ line: i + 1, text: `${prop}="${value}"`, why: "user-facing prop is a literal" });
    }
  });
  return out;
}

/** A prose string passed as a positional ARGUMENT — `add("open-file", "Open file…", "map", run)`, or a
 *  tuple member like `["json", ".json (lossless)", fn]`. Nothing names these, so the prop detector can't
 *  see them and the prose detector skips the line for having code punctuation. This was a real blind
 *  spot: adding `editorCommands.ts` to the allowlist made it PASS with ~85 labels still hardcoded.
 *
 *  Rule: a capitalised multi-word literal sitting in an argument position (preceded by `(` or `,`).
 *  Deliberately NOT triggered by an object property — `keys: "Ctrl/⌘ + Z"` in shortcuts.ts is literal on
 *  purpose, because it names a physical key — which is why the preceding character matters. */
function argumentViolations(src: string): Violation[] {
  const out: Violation[] = [];
  src.split("\n").forEach((line, i) => {
    if (/^\s*(\/\/|\*)/.test(line)) return;
    for (const m of line.matchAll(/[(,]\s*"([A-Z][^"]*\s[^"]*)"/g)) {
      const value = m[1];
      if (ALLOWED_LITERALS.has(value.toLowerCase())) continue;
      out.push({ line: i + 1, text: `"${value}"`, why: "prose in a positional argument" });
    }
  });
  return out;
}

/** A line that is bare prose — how the multi-line paragraphs inside JSX look in source.
 *
 *  Tuned for NO false positives, accepting that it therefore misses some shapes: a noisy guard gets
 *  switched off, which is worse than a narrow one. In particular a prose line containing `:` or `?`
 *  is skipped, because `background: style?.fillImage` and friends are indistinguishable from prose
 *  without a parser. Those shapes are still caught when they sit in a prop, which is the common case. */
function proseViolations(src: string): Violation[] {
  const out: Violation[] = [];
  src.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.length < 12) return;
    // Comments are prose on purpose.
    if (/^(\/\/|\/\*|\*)/.test(trimmed)) return;
    // Code punctuation — includes `:` and `?`, which object literals and optional chaining use.
    if (/[<>{}=`"';(),[\]?:]/.test(trimmed)) return;
    // Property access (`navigator.storage`) reads as two words once the dot is allowed; a full stop in
    // prose is followed by a space or end-of-line, never immediately by a letter.
    if (/\.\w/.test(trimmed)) return;
    // Needs at least two letter-words to be prose rather than an identifier.
    if (!/^[A-Za-z][A-Za-z'’À-ſ.,!—–-]*(\s+[A-Za-z'’À-ſ.,!—–-]+){1,}$/.test(trimmed)) return;
    out.push({ line: i + 1, text: trimmed, why: "bare prose in JSX" });
  });
  return out;
}

function scan(rel: string): Violation[] {
  const src = readFileSync(join(process.cwd(), rel), "utf8");
  return [...propViolations(src), ...argumentViolations(src), ...proseViolations(src)];
}

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

  it("actually detects all three shapes it claims to", () => {
    // A guard that can't fail is worse than none — pin that each detector fires on its own shape.
    expect(propViolations('        title="Save the map"')).toHaveLength(1);
    expect(propViolations('        title={t("map.save")}')).toHaveLength(0);
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
    // Documented limitation: a single-word label isn't caught.
    expect(argumentViolations('  add("present", "Present", "map", run);')).toHaveLength(0);
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
});
