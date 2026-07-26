// FROZEN MODULE-LEVEL t() — a real trap, armed for the day a locale picker ships.
//
// `t()` reads the ACTIVE locale at call time. A call inside a render function therefore follows a later
// `setLocale`; a call at module scope runs ONCE, when the module is first imported, and the string it
// returned is frozen into a `const` forever.
//
// Today nothing calls `setLocale` outside tests, so the frozen strings happen to be right: the registry
// resolves the stored locale before any catalogue-consuming module loads. The moment a language picker
// lands, ~194 strings across 23 files stop following it and the UI half-translates — panel tabs, slash
// commands, edge presets and the Start sidebar staying English inside an otherwise Danish app.
//
// This file PINS the mechanism in both directions so the trap cannot be rediscovered by a user. It is
// deliberately not a fix: converting 194 constants to getters is a behaviour-neutral refactor with real
// call-site churn, and it is listed in docs/I18N_BLOCKED.md for the owner.
import { afterEach, describe, expect, it } from "vitest";
import { type Locale, getLocale, registerMessages, setLocale, t } from "../src/i18n";

// A second locale, registered only for this file. `LOCALES` ships `["en"]`, so the cast is how a test
// exercises the multi-locale path before a second catalogue exists — the same shape export-locale.test
// and taskDate.test already use.
const DA = "da" as Locale;

afterEach(() => setLocale("en"));

describe("module-level t() freezes the string at import time", () => {
  it("an in-render t() call follows setLocale, a module-level one cannot", () => {
    registerMessages(DA, { "common.grid": "Gitter" });

    // Module scope: evaluated once, right now, under `en`.
    const FROZEN = { label: t("common.grid") };
    // Render scope: evaluated per call.
    const live = () => t("common.grid");

    expect(FROZEN.label).toBe("Grid");
    expect(live()).toBe("Grid");

    setLocale(DA);
    expect(getLocale()).toBe(DA);

    // The live call follows the locale...
    expect(live()).toBe("Gitter");
    // ...and the frozen one is stuck on the locale that was active at import.
    expect(FROZEN.label).toBe("Grid");
  });

  it("PANEL_LABELS is one of the frozen constants — its tabs would stay English", async () => {
    registerMessages(DA, { "panel.outline": "Disposition" });

    // Import AFTER `en` is active, exactly as the app does at boot.
    const { PANEL_LABELS } = await import("../src/panelLabels");
    expect(PANEL_LABELS.outline.tab).toBe("Outline");

    setLocale(DA);

    // A live lookup of the same key is translated...
    expect(t("panel.outline")).toBe("Disposition");
    // ...but the dock tab reads from the frozen constant and is not.
    expect(PANEL_LABELS.outline.tab).toBe("Outline");
  });

  it("a getter-shaped constant does follow the locale — the fix, pinned", () => {
    registerMessages(DA, { "common.grid": "Gitter" });

    // The shape the 194 sites would need: evaluation deferred to property access.
    const LIVE = {
      get label() {
        return t("common.grid");
      },
    };

    expect(LIVE.label).toBe("Grid");
    setLocale(DA);
    expect(LIVE.label).toBe("Gitter");
  });
});
