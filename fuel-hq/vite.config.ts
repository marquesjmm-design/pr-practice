import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

// Versão mostrada na app: a do CI (HQ_VERSION_NAME) ou a do package.json.
const appVersion = process.env.HQ_VERSION_NAME || pkg.version;

// base "./" para que os assets funcionem dentro do WebView do Capacitor (Android).
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
