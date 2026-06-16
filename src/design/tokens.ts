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

/** Semantic colours for the chrome. Grouped by role; the swatch arrays are the styling pickers. */
export const colors = {
  /** Primary ink — topic/panel text, control labels. */
  text: "#26215c",
  /** Muted label text (section sub-labels, inline field labels). */
  muted: "#73726c",
  /** Fainter secondary text (counts, hints, empty-state copy). */
  faint: "#8a8780",
  /** Placeholder / disabled-ish copy in the notes editor empty states. */
  placeholder: "#999",

  /** Divider / border between panel regions and below the marker/style bars. */
  border: "#e2e0d8",
  /** Control border (buttons, inputs, chips, swatch frames). */
  controlBorder: "#cecbf6",

  /** Panel aside background. */
  surface: "#fbfbf9",
  /** Marker/Style bar background (a faint lilac strip inside the Info panel). */
  surfaceBar: "#f4f3fb",
  /** Plain white surface (inputs, swatch buttons, the "off" chip). */
  white: "#fff",

  /** Control fill (the toolbar button look). */
  controlBg: "#eeedfe",
  /** Accent — active chip background + border, the lit toggle state. */
  accent: "#6c63d6",
  /** Accent used as the history-timeline range slider tint (kept distinct: it was authored a
   *  shade off the chip accent and we preserve the exact pixel). */
  accentSlider: "#6c63d8",
  /** Active marker chip background (a soft accent tint, distinct from the solid accent fill). */
  accentTint: "#e7e4fb",

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
