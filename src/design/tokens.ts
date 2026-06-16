// Design tokens for the editor chrome (toolbar, side panels, context menu).
//
// This is a *rename/extraction*, not a restyle: every value here is a literal lifted from the
// existing inline styles in src/ui.ts, src/Panels.tsx, src/mindmap/FlowMindMap.tsx and the App
// toolbar/toast strip — so consuming these tokens reproduces today's pixels exactly. The point is
// to give the chrome a single named palette + scales the upcoming UX redesign can build on.
//
// Note on scope: the *canvas* (topic nodes, edges, theme cssVars) has its own theme system in
// src/mindmap/theme.ts, and the start screen has src/components/start/tokens.ts. Those are
// deliberately separate palettes — this file is only the surrounding chrome.
//
// ── Editor redesign (warm-cream + emerald, theme-reactive) ───────────────────
// The static `colors` object below is the *legacy* chrome palette (cool lilac). The redesigned
// editor chrome (icon rail, two-row top bar, inspector) instead consumes the `--ed-*` custom
// properties emitted by `editorThemeVars()` — the exact same pattern the shipped start screen uses
// (`startThemeVars` → `--st-*`), so Light / Dark / Ocean / Sunset all stay legible from one source.
// The emerald brand accent is fixed across themes to match the start screen.

import type { CSSProperties } from "react";
import type { CanvasTheme } from "../mindmap/theme";

/** Emerald brand accent — fixed across all canvas themes (matches the start screen). */
export const EDITOR_ACCENT = "#1b8a5e";
export const EDITOR_ACCENT_HOVER = "#15714d";

/** UI font stacks — system sans (matches index.html) + a mono stack that prefers JetBrains Mono if
 *  the user has it installed but never loads a web font (the product is offline-first). Mirrors the
 *  start screen's stacks so the editor and start screen read as one product. */
export const EDITOR_FONT_SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
export const EDITOR_FONT_MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

/** Build the `--ed-*` custom properties for the `.mm-editor` root from the active canvas theme.
 *  Surfaces + ink track the theme's cssVars (so dark themes stay legible); chrome-only tokens branch
 *  on the theme's light/dark type; the emerald accent is constant. Consumed by editor.css + the
 *  redesigned chrome components. */
export function editorThemeVars(theme: CanvasTheme): CSSProperties {
  const v = theme.theme.cssVar;
  const dark = theme.theme.type === "dark";
  const page = v["--main-bgcolor"] ?? (dark ? "#1d1c22" : "#faf9f5");
  const card = v["--bgcolor"] ?? (dark ? "#2a2930" : "#ffffff");
  const ink = v["--main-color"] ?? (dark ? "#e8e6df" : "#23211c");
  return {
    "--ed-page": page,
    "--ed-card": card,
    "--ed-sidebar": dark ? "#16151d" : "#f4f2ec",
    "--ed-border": dark ? "rgba(255,255,255,0.11)" : "#e7e4dc",
    "--ed-divider": dark ? "rgba(255,255,255,0.06)" : "#efece4",
    "--ed-ink": ink,
    "--ed-ink2": dark ? "#bdb8ad" : "#5c574e",
    "--ed-muted": dark ? "#8f8a80" : "#938d81",
    "--ed-faint": dark ? "#6d695f" : "#b6b0a4",
    "--ed-accent": EDITOR_ACCENT,
    "--ed-accent-hover": EDITOR_ACCENT_HOVER,
    "--ed-accent-tint": dark ? "rgba(27,138,94,0.18)" : "rgba(27,138,94,0.10)",
    "--ed-accent-ring": "rgba(27,138,94,0.30)",
    "--ed-danger": "#b23b3a",
    "--ed-shadow": dark ? "0 6px 22px rgba(0,0,0,0.38)" : "0 6px 22px rgba(40,30,16,0.08)",
    "--ed-shadow-pop": dark ? "0 12px 32px rgba(0,0,0,0.5)" : "0 12px 32px rgba(40,30,16,0.18)",
    "--ed-font-sans": EDITOR_FONT_SANS,
    "--ed-font-mono": EDITOR_FONT_MONO,
  } as CSSProperties;
}

/** Semantic colours for the side panels (Outline / Filter / Styles / History / Index / Info).
 *  Retuned to the warm-cream + emerald language of the redesign so the panels harmonise with the new
 *  chrome. These are static light values (the panels were never dark-adaptive); the theme-reactive
 *  chrome uses the `--ed-*` tokens above. Grouped by role; the swatch arrays are the styling pickers. */
export const colors = {
  /** Primary ink — topic/panel text, control labels. */
  text: "#23211c",
  /** Muted label text (section sub-labels, inline field labels). */
  muted: "#5c574e",
  /** Fainter secondary text (counts, hints, empty-state copy). */
  faint: "#938d81",
  /** Placeholder / disabled-ish copy in the notes editor empty states. */
  placeholder: "#b6b0a4",

  /** Divider / border between panel regions and below the marker/style bars. */
  border: "#e7e4dc",
  /** Control border (buttons, inputs, chips, swatch frames). */
  controlBorder: "#e7e4dc",

  /** Panel aside background. */
  surface: "#ffffff",
  /** Marker/Style bar background (a faint warm strip inside the Info panel). */
  surfaceBar: "#f4f2ec",
  /** Plain white surface (inputs, swatch buttons, the "off" chip). */
  white: "#fff",

  /** Control fill (the toolbar button look). */
  controlBg: "#f4f2ec",
  /** Accent — active chip background + border, the lit toggle state (emerald). */
  accent: "#1b8a5e",
  /** Accent used as the history-timeline range slider tint. */
  accentSlider: "#1b8a5e",
  /** Active marker chip background (a soft emerald tint, distinct from the solid accent fill). */
  accentTint: "#e3f1ea",

  /** Context-menu chrome (FlowMindMap right-click menu + linking banner). */
  menu: {
    border: "#cfcfe0",
    separator: "#eceafb",
    /** Themed fallbacks for the menu surface when no theme cssVar is present. */
    fallbackBg: "#fff",
    fallbackColor: "#222",
    /** Linking-banner fallbacks (mirror the root node theme vars). */
    linkBg: "#26215c",
    linkColor: "#fff",
  },

  /** Floating playback bar border (a cool lilac-grey). */
  playbackBorder: "#d9d7ea",

  /** Import/notification strips along the top of the editor. */
  toast: {
    successBg: "#eafaf0",
    infoBg: "#eef2fc",
    /** Success/info share the control border below the strip. */
    infoBorder: "#cecbf6",
    errorBg: "#fcebeb",
    errorText: "#791f1f",
    errorBorder: "#f7c1c1",
    warnBg: "#faeeda",
    warnText: "#633806",
    warnBorder: "#fac775",
  },

  /** Per-topic fill swatches (StyleBar + StylesPanel conditional-formatting picker). */
  fillSwatches: ["#fde2e2", "#e2ecfd", "#e2fbe8", "#fdf3e2", "#efe2fd", "#ececec"],
  /** Per-topic border swatches (paired 1:1 with the fills above). */
  borderSwatches: ["#e23b3b", "#3b8bd4", "#27852f", "#d98a17", "#7a3fb0", "#555555"],
} as const;

/** Spacing scale (px) — the paddings/gaps the chrome actually uses. Names are t-shirt sizes; the
 *  values are the recurring ones (2/3/4/6/8/10/12/16) seen across the panels and toolbar. */
export const space = {
  xxs: 2,
  xs: 3,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  xxl: 12,
  xxxl: 16,
} as const;

/** Corner-radius scale (px). 4 = swatch, 6 = chip/small button, 8 = control/input, 12 = floating bar. */
export const radius = {
  xs: 4,
  sm: 5,
  md: 6,
  lg: 8,
  xl: 12,
} as const;

/** Font-size scale (px) — the type sizes used by the chrome controls + labels. */
export const fontSize = {
  /** Section sub-labels, counts, hints. */
  xs: 11,
  /** Inline field labels, secondary copy, small buttons. */
  sm: 12,
  /** Default control + list-row text. */
  md: 13,
  /** Shape-picker glyph buttons. */
  lg: 14,
  /** Marker glyph buttons. */
  xl: 16,
} as const;

/** Font weights used by the chrome. */
export const fontWeight = {
  normal: 400,
  semibold: 600,
  bold: 700,
} as const;
