// @vitest-environment jsdom
//
// The localisation layer. English is the only shipped locale, so these assert the machinery rather than
// any translation: key typing, plural selection via Intl.PluralRules, locale resolution, the document
// lang/dir wiring, and locale-aware collation.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Catalogue } from "../src/i18n";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_PREF_KEY,
  applyDocumentLocale,
  compareText,
  directionOf,
  getLocale,
  initLocale,
  registerMessages,
  resolveLocale,
  setLocale,
  t,
} from "../src/i18n";
import { CORE_EN } from "../src/i18n/core";

beforeEach(() => {
  localStorage.clear();
  // core.ts registers on import, but a prior test may have swapped the active locale.
  registerMessages("en", CORE_EN);
  setLocale("en");
});
afterEach(() => localStorage.clear());

describe("catalogue", () => {
  it("resolves every key it declares", () => {
    // The guard that the catalogue and the key union can't drift apart: every declared key must look up.
    for (const key of Object.keys(CORE_EN)) {
      const out = t(key as keyof typeof CORE_EN, { n: 1, count: "1 thing" });
      expect(typeof out).toBe("string");
      expect(out.length).toBeGreaterThan(0);
    }
  });

  it("returns the English text for a plain key", () => {
    expect(t("settings.title")).toBe("Settings");
  });

  it("interpolates named placeholders", () => {
    expect(t("settings.prefsFile.exported", { count: "3 preferences" })).toBe(
      "Exported 3 preferences.",
    );
  });

  it("leaves an unknown placeholder alone rather than emitting undefined", () => {
    expect(t("settings.prefsFile.exported", {})).toContain("{count}");
  });

  it("throws on a missing key in dev, so it can't ship as a blank label", () => {
    // import.meta.env.DEV is true under vitest.
    expect(() => t("nope.not.a.key" as keyof typeof CORE_EN)).toThrow(/no message for key/);
  });
});

describe("plurals", () => {
  it("selects the English one/other forms", () => {
    expect(t("count.topics", { n: 1 })).toBe("1 topic");
    expect(t("count.topics", { n: 2 })).toBe("2 topics");
  });

  it("uses the plural form for zero, as English does", () => {
    // The old `n === 1 ? "" : "s"` ternaries got this right; Intl.PluralRules makes it explicit rather
    // than incidental, and lets a locale that treats 0 specially say so.
    expect(t("count.topics", { n: 0 })).toBe("0 topics");
  });

  it("only uses plural categories Intl actually reports for English", () => {
    // Ties the catalogue to Intl rather than to an assumption: authoring `two:` or `few:` for English
    // would silently never be selected, and this catches it. (Spying on Intl.PluralRules to prove it's
    // called doesn't work — the spy isn't newable, so it breaks the code under test.)
    const supported = new Set(new Intl.PluralRules("en").resolvedOptions().pluralCategories);
    const used = new Set(
      Object.values(CORE_EN as Catalogue)
        .filter((m) => typeof m === "object")
        .flatMap((m) => Object.keys(m as object)),
    );
    expect(used.size).toBeGreaterThan(0);
    for (const c of used) expect(supported).toContain(c);
  });

  it("handles a message whose forms differ beyond a suffix", () => {
    expect(t("count.branchesCopied", { n: 1 })).toBe("Branch copied — paste with Ctrl/⌘+Shift+V.");
    expect(t("count.branchesCopied", { n: 4 })).toBe(
      "4 branches copied — paste with Ctrl/⌘+Shift+V.",
    );
  });

  it("throws in dev when a count message is called without n", () => {
    // Otherwise a literal "{n} topics" reaches the user — the same class of failure as a missing key,
    // so it gets the same loud-in-dev treatment.
    expect(() => t("count.topics")).toThrow(/needs a count/);
  });
});

describe("locale resolution", () => {
  it("prefers an explicitly stored locale", () => {
    localStorage.setItem(LOCALE_PREF_KEY, "en");
    expect(resolveLocale()).toBe("en");
  });

  it("ignores a stored locale the app doesn't ship", () => {
    localStorage.setItem(LOCALE_PREF_KEY, "kl");
    expect(resolveLocale()).toBe(DEFAULT_LOCALE);
  });

  it("matches the browser's language on its base tag, so en-GB resolves to en", () => {
    const spy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-GB", "da"]);
    expect(resolveLocale()).toBe("en");
    spy.mockRestore();
  });

  it("falls back to the default when the browser asks for a locale we don't have", () => {
    const spy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["da-DK", "de"]);
    expect(resolveLocale()).toBe(DEFAULT_LOCALE);
    spy.mockRestore();
  });

  it("ships exactly one locale for now, and it is the default", () => {
    expect(LOCALES).toEqual(["en"]);
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });
});

describe("document wiring", () => {
  it("sets lang and dir on <html> from the locale", () => {
    document.documentElement.lang = "";
    document.documentElement.dir = "";
    applyDocumentLocale("en");
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("initLocale resolves, applies and reports the active locale", () => {
    expect(initLocale()).toBe("en");
    expect(getLocale()).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("setLocale persists the choice", () => {
    setLocale("en");
    expect(localStorage.getItem(LOCALE_PREF_KEY)).toBe("en");
  });

  it("every shipped locale has a direction", () => {
    for (const l of LOCALES) expect(["ltr", "rtl"]).toContain(directionOf(l));
  });
});

describe("collation", () => {
  it("places accented letters correctly for the ACTIVE locale, unlike a default sort", () => {
    // Worth being precise about what this fixes, because the original analysis overstated it: with
    // English active, `Å` collates as `A` — so it sorts FIRST, not after `Z`. Danish's å-after-z order
    // arrives only when a Danish catalogue ships and `da` is the active locale (see the next test).
    // Either way the default `.sort()` is wrong for both: codepoint order strands å/æ past z.
    const words = ["Ærø", "Zoo", "Åben", "Bil"];
    expect([...words].sort(compareText)).toEqual(["Åben", "Ærø", "Bil", "Zoo"]);
    // Codepoint order — the bug being fixed. (Å is U+00C5 and Æ is U+00C6, so even their relative
    // order differs from every alphabet's.)
    expect([...words].sort()).toEqual(["Bil", "Zoo", "Åben", "Ærø"]);
  });

  it("derives its order from the active locale, so a Danish catalogue changes it", () => {
    // The mechanism, pinned without pretending a Danish locale ships: collation is locale-driven, and
    // Danish genuinely orders å after z. When `da` is added, compareText follows automatically.
    expect(new Intl.Collator("da", { sensitivity: "base" }).compare("å", "z")).toBeGreaterThan(0);
    expect(new Intl.Collator("en", { sensitivity: "base" }).compare("å", "z")).toBeLessThan(0);
  });

  it("treats German ö as o rather than sorting it past z", () => {
    const sorted = ["Zebra", "Öl", "Apfel"].sort(compareText);
    expect(sorted).toEqual(["Apfel", "Öl", "Zebra"]);
  });

  it("orders embedded numbers naturally, so Item 2 precedes Item 10", () => {
    expect(["Item 10", "Item 2"].sort(compareText)).toEqual(["Item 2", "Item 10"]);
    // A plain sort gets this wrong, which is why `numeric` is set.
    expect(["Item 10", "Item 2"].sort()).toEqual(["Item 10", "Item 2"]);
  });

  it("is case-insensitive for display order", () => {
    expect(["banana", "Apple"].sort(compareText)).toEqual(["Apple", "banana"]);
  });
});
