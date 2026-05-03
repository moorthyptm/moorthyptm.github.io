queueMicrotask(() => {
  void import("./home/index.js");
  void import("./effects/index.js");
  void import("./clock.js");
});

let deferredLoaded = false;

function loadDeferred(): void {
  if (deferredLoaded) return;
  deferredLoaded = true;
  void import("./chat/index.js");
  void import("./analytics.js");
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
