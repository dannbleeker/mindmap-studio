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

// Which lines sit inside a comment, tracked ACROSS lines.
//
// `isComment` above is per-line, and that is not enough for the multi-line JSX block comments this
// codebase is full of: the opener is a brace-slash-star, but the CONTINUATION lines open with prose
// rather than with a star. The bare-prose detector read those continuations as JSX copy and reported a
// false positive in FlowMindMap.tsx. A false positive is the one failure this guard cannot afford — it
// trains people to ignore the output — so the fix is to narrow the check, not to except the file.
//
// A block only OPENS on a block-comment opener that STARTS its line (optionally behind the JSX brace).
// Requiring that keeps an opener sitting inside a string literal — a URL, a regex — from starting a
// phantom block that would silently swallow every line until the next closer and hide real strings.
//
// (Written with line comments rather than a doc comment on purpose: the delimiters it has to talk
// about cannot be quoted inside a block comment without ending it.)
function commentLineSet(src) {
  const inComment = new Set();
  let inBlock = false;
  src.split("\n").forEach((line, i) => {
    if (inBlock) {
      inComment.add(i);
      if (line.includes("*/")) inBlock = false;
      return;
    }
    if (/^\s*\{?\s*\/\*/.test(line)) {
      inComment.add(i);
      // A single-line `/* … */` opens and closes on the same line; only a dangling opener continues.
      if (!line.includes("*/")) inBlock = true;
      return;
    }
    if (isComment(line)) inComment.add(i);
  });
  return inComment;
}

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
  const inComment = commentLineSet(src);
  src.split("\n").forEach((line, i) => {
    // Comments are prose on purpose, INCLUDING `/** … */` doc comments — those quote UI text to explain
    // a prop ("…a new standalone library map (\"New map from topic\")"), and flagging them would push the
    // migration into rewriting commentary, which is exactly the mistake the Toolbar pass made once.
    if (inComment.has(i)) return;
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
  const inComment = commentLineSet(src);
  src.split("\n").forEach((line, i) => {
    if (inComment.has(i)) return;
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
  const inComment = commentLineSet(src);
  src.split("\n").forEach((line, i) => {
    if (inComment.has(i)) return;
    for (const m of line.matchAll(/"(\([a-z][a-z ]*\))"/g))
      out.push({ line: i + 1, text: `"${m[1]}"`, why: "user-facing placeholder literal" });
  });
  return out;
}

/** A label/action TUPLE — `["Copy image to clipboard", () => io.copyPng()]`, `[".svg (vector)",
 *  io.exportSvg]`. Menus built from data rather than from JSX use this shape, and nothing else sees it:
 *  the first member is preceded by `[`, which the argument rule excludes, and many of these labels open
 *  with a `.` so they aren't "capitalised" either. 23 export labels sat behind that in `Toolbar.tsx`
 *  after it was declared migrated, and 13 context-menu items in `FlowMindMap.tsx`.
 *
 *  The second member must LOOK like a function — an arrow, or a dotted/bare identifier closing the
 *  array. That is what separates a label/action pair from a plain data array of strings such as
 *  `(["relates-to", "depends-on"] as const)`, whose members are ids and must not be flagged. Because
 *  the shape itself proves the string is a label, this detector needs no capitalisation or word-count
 *  rule, so it catches the short ones the others give up on (`"Rename"`, `"+1d"`). */
export function tupleLabelViolations(src) {
  const out = [];
  const inComment = commentLineSet(src);
  src.split("\n").forEach((line, i) => {
    if (inComment.has(i)) return;
    // Second member: an arrow / call, a dotted-or-bare identifier closing the array, or a NUMBER
    // closing it. The number case is the label/value pair — `["−1w", -7]` in the date-shift presets,
    // where the other four entries of the same array were already migrated and these two were not,
    // leaving one control half-translated.
    const tuple = /\[\s*"([^"]{2,})"\s*,\s*(?:\(|(?:\w+\.)*\w+\s*\]|-?\d+(?:\.\d+)?\s*\])/g;
    for (const m of line.matchAll(tuple)) {
      if (ALLOWED_LITERALS.has(m[1].toLowerCase())) continue;
      out.push({ line: i + 1, text: `"${m[1]}"`, why: "label in a label/action tuple" });
    }
  });
  return out;
}

/** JSX text content sitting on ONE line between its tags — `<MenuLabel>Arrowheads</MenuLabel>`,
 *  `<option value="left">Left side</option>`, `<span>Double-tap to edit</span>`.
 *
 *  This is where the SHORT labels live, and short is exactly what the other detectors give up on: the
 *  argument rule needs a capitalised multi-word literal and the bare-prose rule needs a line with no
 *  code punctuation, so a one-word section heading satisfies neither. Anchoring on the tags instead of
 *  on the text is what makes single words safe here — `>Type</` is unambiguously rendered content,
 *  whereas a bare `"Type"` could be an id, a `kind` or a discriminator.
 *
 *  Content containing `{` is skipped, so `<span>{t("…")}</span>` and any other interpolation passes.
 *  Verified against every file on the allowlist before being added: all clean, while it found three
 *  live hardcoded coach hints in `TopicNode.tsx` and 26 menu labels in `FlowMindMap.tsx`. */
export function jsxTextViolations(src) {
  const out = [];
  const inComment = commentLineSet(src);
  src.split("\n").forEach((line, i) => {
    if (inComment.has(i)) return;
    for (const m of line.matchAll(/>([A-Z][^<>{}]*)<\//g)) {
      const text = m[1].trim();
      // A single character is a glyph or an initial, not a label — `<kbd>K</kbd>`.
      if (text.length < 2) continue;
      if (ALLOWED_LITERALS.has(text.toLowerCase())) continue;
      out.push({ line: i + 1, text: `>${text}<`, why: "user-facing JSX text" });
    }
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
  const inComment = commentLineSet(src);
  src.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    // The length floor keeps short CODE lines out — `return null`, `const x`, `break` all satisfy every
    // other rule below. Between 6 and 11 characters a capital first letter is what separates the two:
    // JS keywords are lowercase, UI copy is sentence-cased. That distinction is worth having, because
    // the floor alone was hiding `Map side` — a real label in the branch menu, 8 characters long.
    if (trimmed.length < 6) return;
    if (trimmed.length < 12 && !/^[A-Z]/.test(trimmed)) return;
    // Comments are prose on purpose — including the CONTINUATION lines of a multi-line block comment,
    // which open with prose rather than with a star. That was this detector's one false-positive shape.
    if (inComment.has(i)) return;
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
    ...tupleLabelViolations(src),
    ...jsxTextViolations(src),
    ...proseViolations(src),
  ];
}
