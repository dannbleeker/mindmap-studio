import { type ReactElement, Suspense, lazy } from "react";
import type { MindMapProps } from "./contract";

// Canvas engine entry point. The app imports the canvas component + its contract from
// here, never from a specific engine file, so the rendering engine can be swapped behind
// this one seam during the mind-elixir → React Flow migration.
export * from "./contract";

// React Flow is the default engine (cutover landed). mind-elixir stays available as a
// fallback for the soak — set VITE_CANVAS_ENGINE="elixir" to ship it (the rollback), or use
// the dev-only runtime override (?engine=flow|elixir or localStorage["mindmap-engine"]) to
// A/B both engines on the same map.
function pickEngine(): "flow" | "elixir" {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("engine");
    const v = q || localStorage.getItem("mindmap-engine");
    if (v === "flow" || v === "elixir") return v;
  }
  return import.meta.env.VITE_CANVAS_ENGINE === "elixir" ? "elixir" : "flow";
}

// Both engines are code-split: whichever is chosen loads as its own chunk, so the heavy
// canvas (mind-elixir OR React Flow) never sits in the entry bundle (size-budget gates the
// entry only). The chooser runs once — React.lazy memoizes the resolved component.
const Canvas = lazy(() =>
  pickEngine() === "flow"
    ? import("./FlowMindMap").then((m) => ({ default: m.FlowMindMap }))
    : import("./MindMap").then((m) => ({ default: m.MindMap })),
);

export function MindMap(props: MindMapProps): ReactElement {
  return (
    <Suspense fallback={null}>
      <Canvas {...props} />
    </Suspense>
  );
}
