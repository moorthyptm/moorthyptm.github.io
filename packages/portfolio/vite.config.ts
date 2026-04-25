import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";

// Cache-busting build hash. Prefer the short git SHA so the same source produces
// the same URLs (no needless cache invalidation on rebuilds-without-changes).
// Falls back to a millisecond timestamp if git isn't available (e.g., release tarball).
function resolveBuildHash(): string {
  try {
    return execSync("git rev-parse --short=8 HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return `dev-${Date.now().toString(36).slice(-6)}`;
  }
}
const BUILD_HASH = resolveBuildHash();

// https://vite.dev/config/
// Vite 8: `build.rollupOptions` was renamed to `build.rolldownOptions`.
// `root: "src"` makes index.html resolve at `/` (no `/src/` prefix).
export default defineConfig({
  root: "src",
  base: "/",
  plugins: [
    tailwindcss(),
    {
      // Inject the build hash into <link rel="preload"> hrefs in index.html so
      // they match the JSON URLs that experience.ts / community.ts will fetch.
      // The TS code reads __BUILD_HASH__ via the `define` block below.
      name: "inject-build-hash",
      transformIndexHtml(html) {
        return html.replace(/__BUILD_HASH__/g, BUILD_HASH);
      },
    },
  ],
  define: {
    __BUILD_HASH__: JSON.stringify(BUILD_HASH),
  },
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
