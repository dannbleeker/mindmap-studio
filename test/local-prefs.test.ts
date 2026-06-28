// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { LOCAL_PREF_KEYS, clearAllLocalPreferences } from "../src/store/localPrefs";

afterEach(() => localStorage.clear());

describe("clearAllLocalPreferences", () => {
  it("removes every known app preference key, leaving others untouched", () => {
    for (const k of LOCAL_PREF_KEYS) localStorage.setItem(k, "x");
    localStorage.setItem("unrelated-key", "keep");
    clearAllLocalPreferences();
    for (const k of LOCAL_PREF_KEYS) expect(localStorage.getItem(k)).toBeNull();
    expect(localStorage.getItem("unrelated-key")).toBe("keep");
  });

  it("is a no-op when nothing is stored (never throws)", () => {
    expect(() => clearAllLocalPreferences()).not.toThrow();
  });
});
