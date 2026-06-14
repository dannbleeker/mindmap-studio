// MindManager-flavoured canvas theme.
//
// `palette` is the important bit: the canvas colours each main branch (and its
// descendants) by cycling this palette from the root outward — exactly the
// MindManager "coloured branch" identity. The cssVar block rounds the topic
// shapes and fattens the connectors to push the look closer to MindManager.
export const mindManagerTheme = {
  name: "MindManager-ish",
  type: "light" as const,
  palette: ["#E8593C", "#3B8BD4", "#27500A", "#BA7517", "#72243E", "#0C447C", "#993C1D"],
  cssVar: {
    "--main-color": "#2c2c2a",
    "--main-bgcolor": "#faf9f5",
    "--color": "#2c2c2a",
    "--bgcolor": "#ffffff",
    "--selected": "#7f77dd",
    "--root-color": "#ffffff",
    "--root-bgcolor": "#26215c",
    "--root-radius": "26px",
    "--main-radius": "16px",
    "--topic-padding": "8px",
    "--line-width": "3px",
    "--main-line-width": "4px",
    "--line-color": "#b4b2a9",
  },
};

// Dark canvas variant — same per-branch palette (the MindManager identity), dark
// surfaces and dimmed connectors. Useful for on-screen presentation, and image
// exports inherit it. Topic shapes/sizing stay identical to the light theme.
export const mindManagerDarkTheme = {
  name: "MindManager-ish dark",
  type: "dark" as const,
  palette: mindManagerTheme.palette,
  cssVar: {
    ...mindManagerTheme.cssVar,
    "--main-color": "#e8e6df",
    "--main-bgcolor": "#1d1c22",
    "--color": "#e8e6df",
    "--bgcolor": "#2a2930",
    "--selected": "#9c95f0",
    "--root-color": "#ffffff",
    "--root-bgcolor": "#4a437f",
    "--line-color": "#56545e",
  },
};

// Ocean — cool blue/teal branch palette on a light surface.
export const oceanTheme = {
  name: "Ocean",
  type: "light" as const,
  palette: ["#0C6291", "#1B998B", "#2E86AB", "#3D5A80", "#5F7A61", "#2A9D8F", "#264653"],
  cssVar: {
    ...mindManagerTheme.cssVar,
    "--main-bgcolor": "#f4f8fb",
    "--root-bgcolor": "#0b3954",
    "--line-color": "#a9c2cf",
    "--selected": "#1b998b",
  },
};

// Sunset — warm red/orange/amber branch palette on a light surface.
export const sunsetTheme = {
  name: "Sunset",
  type: "light" as const,
  palette: ["#C1121F", "#E36414", "#9A031E", "#BC6C25", "#A4243B", "#D8572A", "#6A040F"],
  cssVar: {
    ...mindManagerTheme.cssVar,
    "--main-bgcolor": "#fbf6f1",
    "--root-bgcolor": "#6a040f",
    "--line-color": "#d8c3b3",
    "--selected": "#e36414",
  },
};

/** The shape of a canvas theme: a per-branch palette + CSS custom properties. */
export interface MindMapTheme {
  name: string;
  type: "light" | "dark";
  palette: string[];
  cssVar: Record<string, string>;
}

export interface CanvasTheme {
  id: string;
  name: string;
  theme: MindMapTheme;
}

// The canvas style gallery, in pick order. id is persisted in localStorage.
export const canvasThemes: CanvasTheme[] = [
  { id: "light", name: "Light", theme: mindManagerTheme },
  { id: "dark", name: "Dark", theme: mindManagerDarkTheme },
  { id: "ocean", name: "Ocean", theme: oceanTheme },
  { id: "sunset", name: "Sunset", theme: sunsetTheme },
];

export function themeById(id: string): CanvasTheme {
  return canvasThemes.find((t) => t.id === id) ?? canvasThemes[0];
}
