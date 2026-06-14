import { createRoot } from "react-dom/client";
import { App } from "./App";

// StrictMode intentionally omitted: its double-invoked effects re-init the canvas
// engine instance, which muddies headless screenshots used for verification.
// biome-ignore lint/style/noNonNullAssertion: #root is guaranteed by index.html
createRoot(document.getElementById("root")!).render(<App />);
