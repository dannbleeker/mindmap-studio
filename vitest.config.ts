// Kept separate from vite.config.ts on purpose: vitest resolves its own vite
// copy, so importing its defineConfig here — with NO plugins — keeps the `test`
// field typed without dragging vite's plugin types across mismatched versions.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Cover all app source; the canvas/React UI is verified in-browser rather
      // than unit-tested, so it shows up (honestly) as low coverage — which is
      // exactly what the dashboard's "risk map" is meant to surface.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/main.tsx", "src/vite-env.d.ts"],
      reporter: ["text-summary"],
    },
  },
});
