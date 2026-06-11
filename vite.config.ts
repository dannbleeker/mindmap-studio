import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// base "./" keeps the build host-agnostic (local preview + a GitHub Pages
// project/custom-domain deploy without path juggling). Vitest config lives in
// vitest.config.ts to avoid a dual-vite type clash.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    // Installable, offline-capable PWA: precaches the app shell so it works
    // with no network and can be installed to the home screen / desktop.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "MindMap Studio",
        short_name: "MindMap",
        description: "Local-first mind mapping — a self-hosted MindManager replacement.",
        theme_color: "#26215c",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg}"],
      },
    }),
  ],
});
