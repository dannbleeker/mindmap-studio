// Canvas engine entry point. The app imports the canvas component + its contract from
// here, never from a specific engine file, so the rendering engine can be swapped behind
// this one seam. Phase A adds a build-time `VITE_CANVAS_ENGINE` flag + a lazy React Flow
// alternative; today it resolves to the mind-elixir canvas.
export * from "./contract";
export { MindMap } from "./MindMap";
