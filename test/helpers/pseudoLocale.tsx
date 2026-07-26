// The pseudo-locale harness — the only check that can prove an i18n migration batch CORRECT.
//
// WHY THIS EXISTS. Migrating a string is observationally a no-op: English before, English after. So
// `pnpm gate`, a clean diff review and a dev-server screenshot are all *guaranteed* to pass on a batch
// that silently dropped a string on the floor, wired a call site to the wrong key, or left a label
// hardcoded. Every one of those has happened in this migration. The gate cannot see them because there
// is nothing to see — until you make the catalogue say something different from the source.
//
// That is what this does. `registerMessages` merges and LATER REGISTRATIONS WIN (see i18n/registry.ts),
// so overlaying the live catalogue with a marked-up copy is enough — no second locale, no build change,
// no production code touched.
//
//   MARKER mode  — every message becomes ⟦…⟧. Any user-visible text WITHOUT the marker is a string the
//                  app did not get from the catalogue: unmigrated, or hardcoded, or lost.
//   ECHO mode    — every message becomes its own KEY. This is the only way to tell a correct reuse from
//                  a plausible wrong one: it renders `toolbar.layout`, so the assertion names the exact
//                  key the call site read, not merely that it read something.
//
// The overlay is GLOBAL MUTABLE STATE. Always pair it with `restoreCatalogues()` in an afterEach, or
// the next test file to touch i18n inherits a marked-up catalogue and fails somewhere unrelated.
import type { Catalogue, Message } from "../../src/i18n";
import { registerMessages } from "../../src/i18n";
import { CORE_EN } from "../../src/i18n/core";
import { CANVAS_EN } from "../../src/mindmap/flow/messages";

export const MARK_OPEN = "⟦";
export const MARK_CLOSE = "⟧";

const CATALOGUES: Catalogue[] = [CORE_EN as Catalogue, CANVAS_EN as Catalogue];

const mapMessage = (message: Message, f: (s: string) => string): Message =>
  typeof message === "string"
    ? f(message)
    : Object.fromEntries(Object.entries(message).map(([cat, form]) => [cat, f(form as string)]));

const transform = (catalogue: Catalogue, f: (s: string) => string): Catalogue =>
  Object.fromEntries(Object.entries(catalogue).map(([k, v]) => [k, mapMessage(v, f)]));

/** Wrap every message in markers. Placeholders survive, so interpolation still works. */
export function applyMarkerLocale(): void {
  for (const c of CATALOGUES)
    registerMessages(
      "en",
      transform(c, (s) => `${MARK_OPEN}${s}${MARK_CLOSE}`),
    );
}

/** Replace every message with its own key, so a rendered string names the key that produced it. */
export function applyEchoLocale(): void {
  for (const c of CATALOGUES)
    registerMessages(
      "en",
      Object.fromEntries(
        Object.entries(c).map(([k, v]) => [k, mapMessage(v, () => k)]),
      ) as Catalogue,
    );
}

/** Put the real English back. MUST run after every test that applied an overlay. */
export function restoreCatalogues(): void {
  for (const c of CATALOGUES) registerMessages("en", c);
}

/** Attributes a user or a screen reader actually reads. */
const USER_FACING_ATTRS = ["title", "aria-label", "placeholder", "alt"];

/**
 * Every user-visible string in `root` that did NOT come from the catalogue.
 *
 * `ignore` is for text that is legitimately not a message: fixture-supplied user DATA (topic titles,
 * map names), physical key names, and decorative glyphs. Keep it short and give each entry a reason —
 * it is the same trap as the guard's allowlist, and a long ignore list means this harness is lying too.
 */
export function unmarkedStrings(root: HTMLElement, ignore: readonly string[] = []): string[] {
  const skip = (text: string) => {
    const t = text.trim();
    if (!t) return true;
    if (t.includes(MARK_OPEN)) return true; // came from the catalogue
    if (!/\p{Letter}/u.test(t)) return true; // glyphs, digits, punctuation
    return ignore.some((allowed) => t.includes(allowed));
  };

  const found = new Set<string>();

  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    for (const attr of USER_FACING_ATTRS) {
      const value = el.getAttribute(attr);
      if (value && !skip(value)) found.add(`${attr}="${value.trim()}"`);
    }
  }

  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent ?? "";
    if (!skip(text)) found.add(`text: ${text.trim()}`);
    node = walker.nextNode();
  }

  return [...found].sort();
}
