// The detectors behind the hardcoded-user-facing-string guard, in ONE place.
//
// Both `test/i18n-no-hardcoded-strings.test.ts` (which enforces them over the migrated allowlist) and
// `scripts/i18n-scan.mjs` (which reports them for any file, so the next migration can see its worklist)
// import from here. They were briefly two copies of the same regexes; a copy silently lost a `\\s` and
// reported zero `label=` hits on a file that had sixty, which is precisely the kind of quiet wrong
// answer this guard exists to prevent. One source of truth for a cross-cutting rule.
//
// Each detector is narrow on purpose and tuned for NO false positives: a noisy guard gets switched off,
// which is worse than a narrow one. When one fires, the fix is to move the string into a catalogue — not
// to widen the exceptions. If a genuinely non-user-facing string trips it, narrow the check.

/** Props whose value is read by a user or a screen reader. `label` covers both the menu components in
 *  `Toolbar.tsx` (`<MenuItem label="Fit map to screen">`) and the DOM's own `<optgroup label>`; leaving
 *  it out hid 60 menu labels in a file the allowlist already called migrated. */
export const USER_FACING_PROPS = ["title", "aria-label", "placeholder", "alt", "label"];

/** Values that are legitimately literal: DOM/ARIA plumbing rather than prose. */
export const ALLOWED_LITERALS = new Set([
  "true",
  "false",
  "none",
  "off",
  "on",
  "polite",
  "assertive",
]);

const isComment = (line) => /^\s*(\/\/|\/\*|\*)/.test(line);

/** A literal in a user-facing prop — `title="Save"` instead of `title={t("…")}`. */
export function propViolations(src) {
  const out = [];
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
 *  alone on its own line because prettier wrapped the call), or in a ternary arm.
 *  Deliberately NOT triggered by an object property — `keys: "Ctrl/⌘ + Z"` in shortcuts.ts is literal on
 *  purpose, because it names a physical key — which is why the preceding character matters. */
export function argumentViolations(src) {
  const out = [];
  src.split("\n").forEach((line, i) => {
    // Comments are prose on purpose, INCLUDING `/** … */` doc comments — those quote UI text to explain
    // a prop ("…a new standalone library map (\"New map from topic\")"), and flagging them would push the
    // migration into rewriting commentary, which is exactly the mistake the Toolbar pass made once.
    if (isComment(line)) return;
    // The rules below overlap on purpose — a wrapped `? "…"` arm is both an argument position and a
    // ternary arm — so a literal is reported once per line, not once per rule that noticed it.
    const seen = new Set();
    const push = (value) => {
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
    // missed ``showHint(ok ? `Inserted the ${p.name}…` : "Select a topic first.")`` — a template in the
    // `then` arm hid a hardcoded `else`, twice in Toolbar.tsx.
    if (line.includes("?"))
      for (const m of line.matchAll(/\s:\s*"([A-Z][^"]*\s[^"]*)"/g)) push(m[1]);
  });
  return out;
}

/** Prose inside a TEMPLATE literal — `` `Delete view ${v.name}` ``. Interpolation is exactly where a
 *  hardcoded string hides best: the value is dynamic, so it reads as computed rather than authored, and
 *  every other detector here only looks at double quotes. This found 12 live strings across four files
 *  the allowlist already called migrated, which is the failure mode this guard exists to prevent.
 *
 *  Rule: strip the `${…}` holes, then look for a capitalised word followed by a lowercase word. That
 *  shape is prose; the templates that legitimately stay literal — CSS values, SVG paths, `data:` URLs,
 *  class names — are lowercase throughout or single tokens, so they don't match. */
export function templateViolations(src) {
  const out = [];
  src.split("\n").forEach((line, i) => {
    if (isComment(line)) return;
    for (const m of line.matchAll(/`([^`]*)`/g)) {
      const text = m[1].replace(/\$\{[^}]*\}/g, " ");
      if (!/[A-Z][a-z]+\s+[a-z]+/.test(text)) continue;
      out.push({ line: i + 1, text: `\`${m[1]}\``, why: "prose in a template literal" });
    }
  });
  return out;
}

/** A parenthesised lowercase placeholder — `"(untitled)"`, the fallback shown when a topic or map has no
 *  title. It's user-facing text that appeared at 20 call sites, and no other detector sees it: it opens
 *  with `(` so it isn't "capitalised", and it's one word so it isn't "multi-word". Narrow by design —
 *  letters and spaces only inside the parens, which no regex, format string or selector matches. */
export function placeholderViolations(src) {
  const out = [];
  src.split("\n").forEach((line, i) => {
    if (isComment(line)) return;
    for (const m of line.matchAll(/"(\([a-z][a-z ]*\))"/g))
      out.push({ line: i + 1, text: `"${m[1]}"`, why: "user-facing placeholder literal" });
  });
  return out;
}

/** A line that is bare prose — how the multi-line paragraphs inside JSX look in source.
 *
 *  Tuned for NO false positives, accepting that it therefore misses some shapes. In particular a prose
 *  line containing `:` or `?` is skipped, because `background: style?.fillImage` and friends are
 *  indistinguishable from prose without a parser. Those shapes are still caught when they sit in a prop,
 *  which is the common case. */
export function proseViolations(src) {
  const out = [];
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

/** Every detector, over one file's source. */
export function scanSource(src) {
  return [
    ...propViolations(src),
    ...argumentViolations(src),
    ...templateViolations(src),
    ...placeholderViolations(src),
    ...proseViolations(src),
  ];
}
