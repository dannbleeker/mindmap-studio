// @vitest-environment jsdom
//
// The localisation layer. English is the only shipped locale, so these assert the machinery rather than
// any translation: key typing, plural selection via Intl.PluralRules, locale resolution, the document
// lang/dir wiring, and locale-aware collation.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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
import { CANVAS_EN } from "../src/mindmap/flow/messages";

// EVERY catalogue in the app, in load order (eager first). The duplicate checks below iterate this
// rather than naming a pair, because the migration is adding more of them: a hardcoded CORE-vs-CANVAS
// check would stay green while catalogue #3 repeated either one. Add a catalogue here when you create
// it — `lazy-chunk modules import the registry directly` will also start covering its file.
const CATALOGUES = [
  { name: "CORE_EN", catalogue: CORE_EN as Catalogue },
  { name: "CANVAS_EN", catalogue: CANVAS_EN as Catalogue },
] as const;

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

  it("holds characters, not HTML entities", () => {
    // JSX may write `&amp;` and React decodes it; a CATALOGUE may not, because `t()` returns a plain
    // JS string that React renders verbatim — so an entity would ship to the user as "Markers &amp;
    // tags". The Panels extraction captured exactly that from the JSX source, and an existing panel
    // test caught it. Extraction is scripted, so this checks the whole catalogue rather than trusting
    // the next script.
    const entity = /&(?:amp|lt|gt|quot|apos|nbsp|mdash|ndash|hellip|#\d+|#x[0-9a-f]+);/i;
    const offenders = [...Object.entries(CORE_EN), ...Object.entries(CANVAS_EN)]
      .flatMap(([key, message]) =>
        (typeof message === "string" ? [message] : Object.values(message)).map(
          (form) => [key, form] as const,
        ),
      )
      .filter(([, form]) => form && entity.test(form))
      .map(([key, form]) => `${key}: ${form}`);
    expect(offenders).toEqual([]);
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

  it("never says the same thing twice WITHIN a catalogue", () => {
    // The sibling check below compares canvas-vs-core and so was blind to core repeating ITSELF — it
    // did, 21 times, almost all `toolbar.*` twins of a `cmd.*` message left by the toolbar pass, which
    // slugged its keys from English text without checking whether that text already had a key.
    // `toolbar.bothSides` == `cmd.layout.side`, `toolbar.alignLeft` == `cmd.align.left`, and so on.
    //
    // Same rule as across catalogues: collapse onto the key that names the CONCEPT rather than the
    // surface it was slugged from, and move it to `common.` when neither surface owns it.
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const { name, catalogue } of CATALOGUES) {
      seen.clear();
      for (const [key, message] of Object.entries(catalogue)) {
        if (typeof message !== "string") continue;
        const first = seen.get(message);
        if (first) dupes.push(`${name}: ${key} duplicates ${first} — both say "${message}"`);
        else seen.set(message, key);
      }
    }
    expect(dupes).toEqual([]);
  });

  it("has no dead keys — every catalogue entry is referenced by the app", () => {
    // The mirror of the hardcoded-string guard. That one fails when the app has a string the catalogue
    // doesn't; this fails when the catalogue has a string the app doesn't. Dead keys are not harmless:
    // they ship bytes in the entry chunk and they hand a translator work that renders nowhere, which is
    // worse than untranslated because it looks done.
    //
    // The exception list below is a SHRINKING one, not a parking space. Every entry is a key added in
    // anticipation of a caller that never arrived; either wire it up or delete it. Do not add to this
    // list to make a build pass — a key nothing calls should simply be removed.
    const UNREFERENCED = new Set([
      "settings.language", // the locale picker's label — SettingsDialog renders the control without it
      // A `count.*` family built for call sites that ended up using bespoke plural messages instead.
      "count.topics",
      "count.nodes",
      "count.maps",
      "count.folders",
      "count.commands",
      "count.matches",
      "count.attachments",
      "count.subTopics",
      "count.rollUps",
      "count.otherMaps",
      "count.notes",
      "count.branchesCopied",
    ]);

    const sources: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts"))
          sources.push(readFileSync(join(process.cwd(), rel), "utf8"));
      }
    };
    walk("src");
    // The catalogues quote their own keys; a key is only "referenced" if some OTHER file names it.
    const appCode = sources.filter((src) => !src.includes("satisfies Catalogue")).join("\n");

    const dead = CATALOGUES.flatMap(({ name, catalogue }) =>
      Object.keys(catalogue)
        .filter((key) => !UNREFERENCED.has(key) && !appCode.includes(`"${key}"`))
        .map((key) => `${name}.${key}`),
    );
    expect(dead).toEqual([]);
  });

  it("never says the same thing twice across catalogues", () => {
    // One source of truth for a user-facing string. Two catalogues holding identical English is how a
    // translation drifts: a translator sees the sentence twice, renders it two ways, and the same
    // control reads differently depending on which surface you reached it from. It also duplicates the
    // text across two chunks.
    //
    // The rule when this fires: delete the newer key and reference the existing one — a lazy chunk can
    // reference an eager key for free, because the core catalogue always loads before the canvas does.
    // Keep both only if they genuinely mean different things and their English merely coincides, and
    // then give one wording that reflects the difference.
    //
    // This caught a real duplicate on the FlowMindMap migration: `canvas.menu.rollUp` repeated
    // `toolbar.rollUpMirrorAnotherMap` word for word, and the build showed that sentence landing in
    // the entry chunk AND the lazy canvas chunk.
    // Homonyms: two messages that genuinely mean different things and whose ENGLISH merely coincides.
    // Listed explicitly, one line of reasoning each, so the decision is made once and consciously
    // rather than by widening the check. A locale that distinguishes the two senses translates them
    // apart, which is exactly why they must not be collapsed into one key.
    const HOMONYMS = new Set([
      // The optgroup heading names the radial FAMILY of layouts (both-sides, right, left, radial/hub);
      // the branch-layout option names the radial layout itself. English spells both "Radial".
      "canvas.branchLayout.radial",
    ]);

    // Pairwise over every catalogue, not CORE-vs-CANVAS: three more catalogues are coming, and a
    // hardcoded pair would go on passing while catalogue #3 duplicated either of the first two.
    const dupes: string[] = [];
    for (let i = 0; i < CATALOGUES.length; i++) {
      const byText = new Map<string, string>();
      for (const [key, message] of Object.entries(CATALOGUES[i].catalogue))
        if (typeof message === "string" && !byText.has(message)) byText.set(message, key);

      for (let j = i + 1; j < CATALOGUES.length; j++) {
        for (const [key, message] of Object.entries(CATALOGUES[j].catalogue)) {
          if (typeof message !== "string" || HOMONYMS.has(key)) continue;
          const existing = byText.get(message);
          if (existing)
            dupes.push(
              `${CATALOGUES[j].name}.${key} duplicates ${CATALOGUES[i].name}.${existing} — both say "${message}"`,
            );
        }
      }
    }
    expect(dupes).toEqual([]);
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

describe("bundle locality", () => {
  // The load-bearing arrangement: a lazy chunk's catalogue must reach registerMessages/t through
  // i18n/registry, NEVER through the i18n barrel — the barrel side-effect-imports the EAGER core
  // catalogue, so one wrong import path silently drags every chrome string into that chunk. Confirmed by
  // build measurement (canvas strings land in FlowMindMap-*.js, chrome strings in index-*.js); this is
  // the cheap regression net for it.
  // DERIVED, not listed. A hardcoded array covers exactly the files someone remembered to add, which is
  // the failure this whole programme keeps repeating — so instead: every module that registers a
  // catalogue, plus every module that imports one. The floor stops an empty or broken glob from passing
  // as "all clear"; raise it when a catalogue is added.
  const LAZY_FILES = (() => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
          const src = readFileSync(join(process.cwd(), rel), "utf8");
          // The catalogue itself, or a module that pulls one in — both must avoid the barrel.
          // `src/i18n/` is the layer itself — core.ts is the EAGER catalogue and registry.ts owns
          // registerMessages. Neither is a lazy chunk, and core.ts deliberately has no i18n import to
          // find (it imports ./registry relatively), so including them fails the barrel check on a
          // file the check was never about.
          if (rel.startsWith("src/i18n/")) continue;
          const registers = src.includes("registerMessages(");
          const importsOne = /import "\.[^"]*messages";/.test(src);
          if (registers || importsOne) found.push(rel);
        }
      }
    };
    walk("src");
    return found;
  })();

  it("finds the lazy catalogues rather than trusting a list", () => {
    // A floor, so a glob that silently matches nothing can't report success.
    expect(LAZY_FILES.length).toBeGreaterThanOrEqual(2);
    expect(LAZY_FILES).toContain("src/mindmap/flow/messages.ts");
  });

  const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

  it("lazy-chunk modules import the registry directly, not the barrel", () => {
    for (const rel of LAZY_FILES) {
      const importLines = read(rel)
        .split("\n")
        .filter((l) => l.startsWith("import") && l.includes("i18n"));
      expect(importLines.length, `${rel} should import i18n`).toBeGreaterThan(0);
      for (const line of importLines) {
        // A barrel import ends `.../i18n";` — the registry one ends `.../i18n/registry";`.
        expect(line.endsWith('/i18n";'), `${rel}: must not import the i18n barrel — ${line}`).toBe(
          false,
        );
      }
      expect(read(rel)).toContain('i18n/registry"');
    }
  });

  it("the canvas catalogue registers itself on import, not from main.tsx", () => {
    // The same failure mode that broke the first cut of this layer: registration belongs to the module,
    // so any entry point rendering the canvas gets its messages.
    expect(read("src/mindmap/flow/messages.ts")).toContain('registerMessages("en", CANVAS_EN)');
    expect(read("src/mindmap/flow/TopicNode.tsx")).toContain('import "./messages"');
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
