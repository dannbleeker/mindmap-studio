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
// It checks five shapes, chosen because they're where user-facing text actually lives and because they
// can be detected without false positives on CSS values, class names and DOM plumbing:
//   1. a literal in a user-facing prop  — title="Save" rather than title={t("…")}
//   2. prose in a positional argument   — add("open-file", "Open file…", …), or a tuple member
//   3. prose in a template literal      — title={`Delete view ${v.name}`}
//   4. a user-facing placeholder        — "(untitled)"
//   5. a line of bare prose             — the multi-line paragraphs inside <p>…</p>
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
//
// When this fires, the fix is to move the string into a catalogue — not to add the file to an ignore
// list. If a genuinely non-user-facing string trips it, narrow the check rather than widening the
// exceptions.

/** Files whose user-facing strings have been moved into a catalogue. Add a file when you migrate it. */
const MIGRATED = [
  "src/components/SettingsDialog.tsx",
  "src/mindmap/flow/TopicNode.tsx",
  "src/shortcuts.ts",
  "src/components/editorCommands.ts",
  "src/components/Toolbar.tsx",
];

/** Props whose value is read by a user or a screen reader. `label` covers both the menu components in
 *  `Toolbar.tsx` (`<MenuItem label="Fit map to screen">`) and the DOM's own `<optgroup label>`; leaving
 *  it out hid 60 menu labels in a file the list below already called migrated. */
const USER_FACING_PROPS = ["title", "aria-label", "placeholder", "alt", "label"];

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
 *  Rule: a capitalised multi-word literal sitting in an argument position (preceded by `(` or `,`, or
 *  alone on its own line because prettier wrapped the call), or in a ternary branch.
 *  Deliberately NOT triggered by an object property — `keys: "Ctrl/⌘ + Z"` in shortcuts.ts is literal on
 *  purpose, because it names a physical key — which is why the preceding character matters. The one
 *  exception is the `:` of a ternary, recognised only when the same line also has a `? "…"`. */
function argumentViolations(src: string): Violation[] {
  const out: Violation[] = [];
  src.split("\n").forEach((line, i) => {
    // Comments are prose on purpose, INCLUDING `/** … */` doc comments — those quote UI text to explain
    // a prop ("…a new standalone library map (\"New map from topic\")"), and flagging them would push the
    // migration into rewriting commentary, which is exactly the mistake the Toolbar pass made once.
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
    // The rules below overlap on purpose — a wrapped `? "…"` arm is both an argument position and a
    // ternary arm — so a literal is reported once per line, not once per rule that noticed it.
    const seen = new Set<string>();
    const push = (value: string) => {
      if (ALLOWED_LITERALS.has(value.toLowerCase()) || seen.has(value)) return;
      seen.add(value);
      out.push({ line: i + 1, text: `"${value}"`, why: "prose in a positional argument" });
    };
    for (const m of line.matchAll(/[(,?]\s*"([A-Z][^"]*\s[^"]*)"/g)) push(m[1]);
    // An argument long enough to be wrapped onto its own line has no punctuation in front of it, so the
    // rule above is blind to it. `"Priority: clear on selected topic",` in editorCommands.ts sat there
    // through two passes of this guard.
    const wrapped = /^\s*"([A-Z][^"]*\s[^"]*)",?$/.exec(line);
    if (wrapped) push(wrapped[1]);
    // A ternary arm that prettier put on its own line — `? "Saving…"` / `: "Saved locally"`. A leading
    // `:` here is unambiguous: an object property would have its key in front of the colon. Without
    // this, only the `?` half of a wrapped ternary is seen and the `else` string ships untranslated.
    const arm = /^\s*[?:]\s*"([A-Z][^"]*\s[^"]*)"[,})\]]*$/.exec(line);
    if (arm) push(arm[1]);
    // The `else` half of a same-line ternary. The discriminator against an object property is the SPACE
    // BEFORE the colon: prettier writes a ternary as `cond ? a : b` and a property as `key: value`, and
    // it formats every file here. Gating on a `?` somewhere on the line keeps `keys: "Ctrl/⌘ + Z"`
    // exempt twice over. An earlier version required the `?` arm to be a double-quoted string too, which
    // missed `showHint(ok ? `Inserted the ${p.name}…` : "Select a topic first.")` — a template in the
    // `then` arm hid a hardcoded `else`, twice in Toolbar.tsx.
    if (line.includes("?"))
      for (const m of line.matchAll(/\s:\s*"([A-Z][^"]*\s[^"]*)"/g)) push(m[1]);
  });
  return out;
}

/** Prose inside a TEMPLATE literal — `` `Delete view ${v.name}` ``. Interpolation is exactly where a
 *  hardcoded string hides best: the value is dynamic, so it reads as computed rather than authored, and
 *  every other detector here only looks at double quotes. This found 12 live strings across four files
 *  the allowlist already called migrated, which is the failure mode the header warns about.
 *
 *  Rule: strip the `${…}` holes, then look for a capitalised word followed by a lowercase word. That
 *  shape is prose; the templates that legitimately stay literal — CSS values, SVG paths, `data:` URLs,
 *  class names — are lowercase throughout or single tokens, so they don't match. */
function templateViolations(src: string): Violation[] {
  const out: Violation[] = [];
  src.split("\n").forEach((line, i) => {
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
    for (const m of line.matchAll(/`([^`]*)`/g)) {
      const text = m[1].replace(/\$\{[^}]*\}/g, " ");
      if (!/[A-Z][a-z]+\s+[a-z]+/.test(text)) continue;
      out.push({ line: i + 1, text: `\`${m[1]}\``, why: "prose in a template literal" });
    }
  });
  return out;
}

/** A parenthesised lowercase placeholder — `"(untitled)"`, the fallback shown when a topic or map has no
 *  title. It's user-facing text that appears at 20 call sites, and no other detector sees it: it opens
 *  with `(` so it isn't "capitalised", and it's one word so it isn't "multi-word". Narrow by design —
 *  letters and spaces only inside the parens, which no regex, format string or selector matches. */
function placeholderViolations(src: string): Violation[] {
  const out: Violation[] = [];
  src.split("\n").forEach((line, i) => {
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
    for (const m of line.matchAll(/"(\([a-z][a-z ]*\))"/g))
      out.push({ line: i + 1, text: `"${m[1]}"`, why: "user-facing placeholder literal" });
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
  return [
    ...propViolations(src),
    ...argumentViolations(src),
    ...templateViolations(src),
    ...placeholderViolations(src),
    ...proseViolations(src),
  ];
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

  it("actually detects all five shapes it claims to", () => {
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
