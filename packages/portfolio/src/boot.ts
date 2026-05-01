// Two-tier deferred load. Tier 1 (microtask) hydrates content; tier 2 fires
// on requestIdleCallback or first user interaction, whichever comes first.

// Tier 1
queueMicrotask(() => {
  void import("./script");
  void import("./clock");
});

// Tier 2
let deferredLoaded = false;

function loadDeferred(): void {
  if (deferredLoaded) return;
  deferredLoaded = true;
  void import("./chat");
  void import("./analytics");
}

if (typeof (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback === "function") {
  (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout?: number }) => void })
    .requestIdleCallback(loadDeferred, { timeout: 1800 });
} else {
  setTimeout(loadDeferred, 1000);
}

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
