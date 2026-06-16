// editorThemeVars — the theme-reactive `--ed-*` custom properties the redesigned editor chrome
// consumes. Pure function of the active canvas theme; tests pin the emerald accent (fixed across
// themes), the light surfaces, and the dark-branch overrides so Light/Dark/Ocean/Sunset stay legible.

import { describe, expect, it } from "vitest";
import {
  EDITOR_ACCENT,
  EDITOR_ACCENT_HOVER,
  EDITOR_FONT_MONO,
  EDITOR_FONT_SANS,
  editorThemeVars,
} from "../src/design/tokens";
import { themeById } from "../src/mindmap/theme";

type Vars = Record<string, string>;

describe("editorThemeVars", () => {
  it("derives light-theme surfaces + ink from the canvas theme", () => {
    const v = editorThemeVars(themeById("light")) as Vars;
    expect(v["--ed-page"]).toBe("#faf9f5");
    expect(v["--ed-card"]).toBe("#ffffff");
    expect(v["--ed-ink"]).toBe("#23211c");
    expect(v["--ed-sidebar"]).toBe("#f4f2ec");
    expect(v["--ed-border"]).toBe("#e7e4dc");
  });

  it("uses dark overrides for a dark theme (chrome-only tokens branch on theme type)", () => {
    const v = editorThemeVars(themeById("dark")) as Vars;
    expect(v["--ed-sidebar"]).toBe("#16151d");
    expect(v["--ed-ink2"]).toBe("#bdb8ad");
    expect(v["--ed-border"]).toBe("rgba(255,255,255,0.11)");
    // surfaces still track the dark canvas theme's own cssVars
    expect(v["--ed-page"]).toBe(themeById("dark").theme.cssVar["--main-bgcolor"]);
  });

  it("keeps the emerald accent fixed across every theme", () => {
    for (const id of ["light", "dark", "ocean", "sunset"]) {
      const v = editorThemeVars(themeById(id)) as Vars;
      expect(v["--ed-accent"], id).toBe(EDITOR_ACCENT);
      expect(v["--ed-accent-hover"], id).toBe(EDITOR_ACCENT_HOVER);
    }
    expect(EDITOR_ACCENT).toBe("#1b8a5e");
  });

  it("threads the font stacks through (no web fonts — offline-first)", () => {
    const v = editorThemeVars(themeById("light")) as Vars;
    expect(v["--ed-font-sans"]).toBe(EDITOR_FONT_SANS);
    expect(v["--ed-font-mono"]).toBe(EDITOR_FONT_MONO);
    expect(EDITOR_FONT_MONO).toContain("JetBrains Mono");
    expect(EDITOR_FONT_SANS).not.toMatch(/http|googleapis/); // never loads a CDN font
  });

  it("emits the full --ed-* contract (shadows, rings, danger)", () => {
    const v = editorThemeVars(themeById("light")) as Vars;
    for (const key of [
      "--ed-muted",
      "--ed-faint",
      "--ed-accent-tint",
      "--ed-accent-ring",
      "--ed-danger",
      "--ed-shadow",
      "--ed-shadow-pop",
    ]) {
      expect(v[key], key).toBeTruthy();
    }
  });
});
