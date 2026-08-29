import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative base so artifacts resolve inside Capacitor's WebView (file:// or localhost)
  base: "./",
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
