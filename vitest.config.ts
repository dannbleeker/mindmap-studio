// Kept separate from vite.config.ts on purpose: vitest resolves its own vite
// copy, so importing its defineConfig here — with NO plugins — keeps the `test`
// field typed without dragging vite's plugin types across mismatched versions.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const HERE = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // The PWA virtual module can't be resolved by the test runner; alias it to a
  // stub that lets tests fire the SW callbacks deterministically. Test-only file,
  // so the alias is unconditional.
  resolve: {
    alias: {
      "virtual:pwa-register": resolve(HERE, "test/stubs/virtual-pwa-register.ts"),
    },
  },
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
