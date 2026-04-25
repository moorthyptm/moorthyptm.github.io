/// <reference types="vite/client" />

// Build-time injected via `define` in vite.config.ts. Resolves to the short git
// SHA (or a dev fallback). Used as a query-string cache-buster on JSON data
// fetches and on the matching preload hints in index.html.
declare const __BUILD_HASH__: string;
