import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// base "./" keeps the build host-agnostic (local preview + a GitHub Pages
// project/custom-domain deploy without path juggling). Vitest config lives in
// vitest.config.ts to avoid a dual-vite type clash.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
