const RADIUS_PX = 220;
const RADIUS_PULSE_PX = 300;
const PULSE_MS = 420;
const SOFT_PCT = 35;
const DIM_LEVEL = 0.75;
const Z_INDEX = 60;

(function init() {
  if (typeof window === "undefined") return;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (prefersReduced || !finePointer) return;

  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("data-spotlight-overlay", "");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "pointer-events:none",
    `z-index:${Z_INDEX}`,
    "transition:opacity 200ms ease-out",
    "opacity:0",
    "will-change:background",
  ].join(";");
  document.body.appendChild(overlay);

  function buildGradient(x: number, y: number, radius: number): string {
    const dim = `rgba(8, 10, 12, ${DIM_LEVEL})`;
    return [
      `radial-gradient(`,
      `circle ${radius}px at ${x}px ${y}px,`,
      `transparent 0%,`,
      `transparent ${SOFT_PCT}%,`,
      `${dim} 100%`,
      `)`,
    ].join(" ");
  }

  let mx = -9999;
  let my = -9999;
  let frame: number | null = null;
  let pulseStart = -Infinity;

  function currentRadius(now: number): number {
    const elapsed = now - pulseStart;
    if (elapsed >= PULSE_MS || elapsed < 0) return RADIUS_PX;
    const t = elapsed / PULSE_MS;
    const eased = 1 - Math.pow(t, 2);
    return RADIUS_PX + (RADIUS_PULSE_PX - RADIUS_PX) * eased;
  }

  function tick() {
    frame = null;
    const r = currentRadius(performance.now());
    overlay.style.background = buildGradient(mx, my, r);
    if (performance.now() - pulseStart < PULSE_MS) {
      frame = requestAnimationFrame(tick);
    }
  }

  function schedule() {
    if (frame === null) frame = requestAnimationFrame(tick);
  }

  window.addEventListener(
    "mousemove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (overlay.style.opacity !== "1") overlay.style.opacity = "1";
      schedule();
    },
    { passive: true },
  );

  window.addEventListener("mouseleave", () => {
    overlay.style.opacity = "0";
  });

  window.addEventListener("mouseenter", () => {
    overlay.style.opacity = "1";
  });

  window.addEventListener(
    "click",
    () => {
      pulseStart = performance.now();
      schedule();
    },
    { passive: true },
  );

  mx = window.innerWidth / 2;
  my = window.innerHeight / 2;
  schedule();
})();

export {};
