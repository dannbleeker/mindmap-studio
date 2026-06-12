// MindManager-flavoured theme for mind-elixir.
//
// `palette` is the important bit: mind-elixir colours each main branch (and its
// descendants) by cycling this palette from the root outward — which is exactly
// the MindManager "coloured branch" identity. The cssVar block rounds the topic
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
