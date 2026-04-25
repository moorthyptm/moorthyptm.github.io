// Entry point. The HTML loads only this file; everything else is dynamically
// imported in tiers so the initial paint isn't blocked by decorative effects.
//
// Tier 1 (critical, queued via microtask): nav + content hydration + clock.
//        Without these the page shows "Loading…" placeholders.
// Tier 2 (deferred): magic-mode toggle + cursor + spotlight + scratch-reveal
//        + chat. None of these are needed for first paint and most are pointer-
//        only so they should never block mobile interactivity.
//
// Tier 2 fires on whichever comes first:
//   - requestIdleCallback (with 1.8s timeout fallback to setTimeout)
//   - first user interaction (pointerdown / mousemove / touchstart / keydown / scroll)
//
// ES modules are cache-safe: repeat dynamic imports return the same module
// instance, so each module's init IIFE runs exactly once.

// ── Tier 1 ─────────────────────────────────────────────────────────────────
queueMicrotask(() => {
  void import("./script");
  void import("./experience");
  void import("./community");
  void import("./clock");
});

// Render a spinner placeholder for the magic-mode toggle so the user sees an
// affordance immediately. magic-toggle.ts (tier 2) will remove this and mount
// the real button when it finishes loading.
function mountTogglePlaceholder(): void {
  if (document.getElementById("magic-toggle-placeholder")) return;
  const NS = "http://www.w3.org/2000/svg";

  const placeholderStyle = document.createElement("style");
  placeholderStyle.id = "magic-toggle-placeholder-style";
  placeholderStyle.textContent = `
    #magic-toggle-placeholder {
      position: fixed;
      bottom: 24px;
      left: 24px;
      width: 44px;
      height: 44px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,0.12);
      background: var(--paper, #f4f1ea);
      color: var(--ink, #141619);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
      z-index: 10000;
      pointer-events: none;
    }
    #magic-toggle-placeholder svg {
      width: 22px;
      height: 22px;
      animation: magic-spin 900ms linear infinite;
    }
    @keyframes magic-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(placeholderStyle);

  const el = document.createElement("div");
  el.id = "magic-toggle-placeholder";
  el.setAttribute("aria-hidden", "true");
  el.title = "Loading magic mode…";

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");

  // dashed circle = spinning loader
  const arc = document.createElementNS(NS, "circle");
  arc.setAttribute("cx", "12");
  arc.setAttribute("cy", "12");
  arc.setAttribute("r", "8");
  arc.setAttribute("stroke-dasharray", "12 28");
  arc.setAttribute("opacity", "0.85");
  svg.appendChild(arc);

  el.appendChild(svg);
  document.body.appendChild(el);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountTogglePlaceholder);
} else {
  mountTogglePlaceholder();
}

// ── Tier 2 ─────────────────────────────────────────────────────────────────
let deferredLoaded = false;

function loadDeferred(): void {
  if (deferredLoaded) return;
  deferredLoaded = true;
  void import("./magic-toggle");
  void import("./cursor");
  void import("./spotlight");
  void import("./scratch-reveal");
  void import("./chat");
  void import("./analytics");
}

if (typeof (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback === "function") {
  (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout?: number }) => void })
    .requestIdleCallback(loadDeferred, { timeout: 1800 });
} else {
  setTimeout(loadDeferred, 1000);
}

// First user interaction — load immediately so widgets feel responsive
const earlyTriggers = ["pointerdown", "mousemove", "touchstart", "keydown", "scroll"] as const;
function onEarly(): void {
  for (const t of earlyTriggers) {
    window.removeEventListener(t, onEarly);
  }
  loadDeferred();
}
for (const t of earlyTriggers) {
  window.addEventListener(t, onEarly, { passive: true });
}
