import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// base "./" para que os assets funcionem dentro do WebView do Capacitor (Android).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
