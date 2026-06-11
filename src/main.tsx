import { createRoot } from "react-dom/client";
import { App } from "./App";

// StrictMode intentionally omitted for the Phase 0 spike: its double-invoked
// effects re-init the mind-elixir instance, which muddies the screenshot.
// biome-ignore lint/style/noNonNullAssertion: #root is guaranteed by index.html
createRoot(document.getElementById("root")!).render(<App />);
