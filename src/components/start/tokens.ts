import type { CSSProperties } from "react";
import type { CanvasTheme } from "../../mindmap/theme";

// Start-screen design tokens. The emerald brand accent is fixed across themes; surfaces + text come
// from the current canvas theme's cssVar, and chrome-only tokens (sidebar, borders, muted text)
// branch on the theme's light/dark type — so Light / Dark / Ocean / Sunset all stay legible. The
// tokens are emitted as `--st-*` CSS custom properties on the .start root; start.css consumes them.

export const ACCENT = "#1b8a5e";
export const ACCENT_HOVER = "#15714d";

/** Build the `--st-*` custom properties for the .start root from the active canvas theme. */
export function startThemeVars(theme: CanvasTheme): CSSProperties {
  const v = theme.theme.cssVar;
  const dark = theme.theme.type === "dark";
  const page = v["--main-bgcolor"] ?? (dark ? "#1d1c22" : "#faf9f5");
  const card = v["--bgcolor"] ?? (dark ? "#2a2930" : "#ffffff");
  const ink = v["--main-color"] ?? (dark ? "#e8e6df" : "#23211c");
  return {
    "--st-page": page,
    "--st-card": card,
    "--st-sidebar": dark ? "#16151d" : "#f4f2ec",
    "--st-border": dark ? "rgba(255,255,255,0.11)" : "#e7e4dc",
    "--st-divider": dark ? "rgba(255,255,255,0.06)" : "#efece4",
    "--st-ink": ink,
    "--st-ink2": dark ? "#bdb8ad" : "#5c574e",
    "--st-muted": dark ? "#8f8a80" : "#938d81",
    "--st-faint": dark ? "#6d695f" : "#b6b0a4",
    "--st-accent": ACCENT,
    "--st-accent-hover": ACCENT_HOVER,
    "--st-accent-tint": dark ? "rgba(27,138,94,0.18)" : "rgba(27,138,94,0.10)",
    "--st-accent-ring": "rgba(27,138,94,0.30)",
    "--st-shadow": dark ? "0 6px 22px rgba(0,0,0,0.38)" : "0 6px 22px rgba(40,30,16,0.08)",
  } as CSSProperties;
}
