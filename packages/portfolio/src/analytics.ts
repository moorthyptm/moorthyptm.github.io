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
  if (window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]): void {
    window.dataLayer!.push(args);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_ID, {
    send_page_view: true,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = GA_SRC;
  document.head.appendChild(script);
})();

export {};
