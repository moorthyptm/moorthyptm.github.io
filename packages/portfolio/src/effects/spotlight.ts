// Dark-room spotlight following the wand cursor.
//
// Lays a fixed full-viewport overlay over the page that fades from transparent
// at the wand tip to dark at the edges — like a torch in a dark room. Content
// inside the light circle is fully visible; content outside is dimmed.
//
// Disabled on (pointer: coarse) and (prefers-reduced-motion: reduce) so it
// matches the cursor's gating exactly.

const RADIUS_PX = 220; // resting light circle radius
const RADIUS_PULSE_PX = 300; // peak radius during a click pulse (subtle bump)
const PULSE_MS = 420; // how long the click pulse takes to settle
const SOFT_PCT = 35; // % of radius that's fully transparent before falloff begins
const DIM_LEVEL = 0.75; // alpha of the dark area (0 = no dim, 1 = pitch black)
// Layering: spotlight sits ABOVE main content but BELOW the chat widget (z:9999)
// so an open chat window stays bright while the rest of the page dims. The
// wand cursor (z:9999) and trail canvas (z:9998) live above the chat too — see
// cursor.ts. Magic toggle button (z:10000) is always topmost.
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
  // pulseProgress: 1 at click peak, decays to 0 with ease-out
  let pulseStart = -Infinity;

  function currentRadius(now: number): number {
    const elapsed = now - pulseStart;
    if (elapsed >= PULSE_MS || elapsed < 0) return RADIUS_PX;
    const t = elapsed / PULSE_MS;
    // ease-out: fast peak, slow settle
    const eased = 1 - Math.pow(t, 2);
    return RADIUS_PX + (RADIUS_PULSE_PX - RADIUS_PX) * eased;
  }

  function tick() {
    frame = null;
    const r = currentRadius(performance.now());
    overlay.style.background = buildGradient(mx, my, r);
    // keep ticking while pulse is in flight
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
      // Show overlay on first move (avoids flash on initial load before mouse arrives)
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

  // Click pulse: briefly expand the light radius (matches the wand's lightning burst)
  window.addEventListener(
    "click",
    () => {
      pulseStart = performance.now();
      schedule();
    },
    { passive: true },
  );

  // Prime once at viewport center so it's not at the corner before the user moves
  mx = window.innerWidth / 2;
  my = window.innerHeight / 2;
  schedule();
})();

export {};
