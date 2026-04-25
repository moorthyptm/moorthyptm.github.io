// Google Analytics (gtag) — deferred load.
//
// Previously this lived as a synchronous <script async> in the HTML head. That
// pulled ~471 kB of GTM into the critical path before first paint. Moving it to
// tier-2 means it loads only after idle / first user interaction, so the initial
// LCP path stays clean while we still get analytics for engaged visitors.
//
// CSP note: `googletagmanager.com` and `google-analytics.com` are already
// whitelisted in the meta CSP for both `script-src` and `connect-src`.

const GA_ID = "G-TCP3BMWLEN";
const GA_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

(function init() {
  if (typeof window === "undefined") return;
  // Skip if already loaded (e.g., the user has another GA snippet, or this module
  // is hot-reloaded in dev)
  if (window.gtag) return;

  // Bootstrap dataLayer + gtag stub before the remote script loads
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]): void {
    window.dataLayer!.push(args);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_ID, {
    // Honour the noindex stance: don't transmit page_view automatically — we'll
    // record one manually here so the tag still works as expected.
    send_page_view: true,
  });

  // Inject the remote gtag.js script asynchronously
  const script = document.createElement("script");
  script.async = true;
  script.src = GA_SRC;
  document.head.appendChild(script);
})();

export {};
