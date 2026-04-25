import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
// Vite 8: `build.rollupOptions` was renamed to `build.rolldownOptions`.
// `root: "src"` makes index.html resolve at `/` (no `/src/` prefix).
export default defineConfig({
  root: "src",
  base: "/",
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    open: true,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false,
    target: "es2022",
  },
});
