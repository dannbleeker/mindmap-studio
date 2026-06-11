// Kept separate from vite.config.ts on purpose: vitest resolves its own vite
// copy, so importing its defineConfig here — with NO plugins — keeps the `test`
// field typed without dragging vite's plugin types across mismatched versions.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
