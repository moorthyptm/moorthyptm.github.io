// Scratch-card reveal effect.
//
// Attach the `data-scratch-reveal` attribute to any element (typically a button or
// link). On scroll-into-view the element will be covered by a canvas "foil" that
// erases itself with random zigzag scratch strokes, revealing the element underneath.
// Hover over the element while the foil is still present to *manually* scratch
// (drag to erase). Once the foil is sufficiently revealed it auto-completes and
// removes itself.
//
// Disabled on `prefers-reduced-motion: reduce` — the element shows immediately.

const SCRATCH_THRESHOLD = 0.55; // when this fraction of pixels has been erased, auto-complete
const AUTO_STEPS = 36; // frames of automatic scratch animation
const FOIL_BG = "linear-gradient(135deg, #d4d6d9 0%, #b6bbc1 35%, #e8eaec 55%, #9ba0a6 80%, #cccfd2 100%)";

interface ScratchInstance {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  stepsLeft: number;
  done: boolean;
}

function scaleCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function paintFoil(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // base metallic gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#d4d6d9");
  grad.addColorStop(0.35, "#9ba0a6");
  grad.addColorStop(0.55, "#e8eaec");
  grad.addColorStop(0.8, "#9ba0a6");
  grad.addColorStop(1, "#cccfd2");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // brushed-metal scratches (subtle horizontal lines)
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 0.4;
  for (let i = 0; i < 50; i++) {
    const y = Math.random() * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (Math.random() - 0.5) * 1.5);
    ctx.stroke();
  }

  // little glints
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 0.6 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // hint text
  ctx.fillStyle = "rgba(40,42,46,0.45)";
  ctx.font = "600 9px ui-monospace, 'Geist Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⟵ scratch to reveal ⟶", w / 2, h / 2);
}

function eraseStroke(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
) {
  // jagged scratchy path — subdivide and offset perpendicular for irregular erase
  const segments = 6 + Math.floor(Math.random() * 4);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  ctx.globalCompositeOperation = "destination-out";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const j = i === segments ? 0 : (Math.random() - 0.5) * 6;
    ctx.lineTo(x1 + dx * t + nx * j, y1 + dy * t + ny * j);
  }
  ctx.stroke();
}

function pixelsRemaining(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const sample = ctx.getImageData(0, 0, w, h);
  const data = sample.data;
  let opaque = 0;
  // sample every ~9th pixel for speed
  for (let i = 3; i < data.length; i += 36) {
    if (data[i] > 32) opaque++;
  }
  return opaque / (data.length / 36);
}

function complete(inst: ScratchInstance) {
  if (inst.done) return;
  inst.done = true;
  // Fade out the canvas, then remove it
  inst.canvas.style.transition = "opacity 280ms ease-out";
  inst.canvas.style.opacity = "0";
  setTimeout(() => inst.canvas.remove(), 320);
}

function attach(el: HTMLElement) {
  // Make sure host element is positionable
  const computed = getComputedStyle(el);
  if (computed.position === "static") {
    el.style.position = "relative";
  }
  el.style.overflow = "hidden";

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = [
    "position:absolute",
    "inset:0",
    "width:100%",
    "height:100%",
    "pointer-events:auto",
    "cursor:none",
    "z-index:5",
    "border-radius:inherit",
  ].join(";");
  el.appendChild(canvas);

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  const rect = el.getBoundingClientRect();
  let width = rect.width;
  let height = rect.height;
  scaleCanvas(canvas, ctx, width, height);
  paintFoil(ctx, width, height);

  const inst: ScratchInstance = { el, canvas, ctx, width, height, stepsLeft: 0, done: false };

  // Manual scratch on hover/drag
  let lastX = -1;
  let lastY = -1;
  function onMove(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (lastX >= 0) {
      eraseStroke(ctx!, lastX, lastY, x, y, 22);
    } else {
      eraseStroke(ctx!, x - 4, y, x + 4, y, 22);
    }
    lastX = x;
    lastY = y;
    if (pixelsRemaining(ctx!, width, height) < 1 - SCRATCH_THRESHOLD) {
      finishAuto();
    }
  }
  function onLeave() {
    lastX = -1;
    lastY = -1;
  }
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);

  // Auto reveal animation when in view
  function finishAuto() {
    // Final wipe — large radial erase from centre
    ctx!.globalCompositeOperation = "destination-out";
    const cx = width / 2;
    const cy = height / 2;
    let r = 0;
    const rMax = Math.hypot(width, height);
    function step() {
      r += rMax / 8;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fill();
      if (r < rMax) requestAnimationFrame(step);
      else complete(inst);
    }
    step();
  }

  function autoScratchStep() {
    if (inst.done) return;
    if (inst.stepsLeft <= 0) return;
    inst.stepsLeft--;

    // Sweep from a random edge with a zigzag stroke
    const side = Math.floor(Math.random() * 4);
    let x1 = 0,
      y1 = 0,
      x2 = 0,
      y2 = 0;
    if (side === 0) {
      x1 = -10;
      y1 = Math.random() * height;
      x2 = width + 10;
      y2 = y1 + (Math.random() - 0.5) * 24;
    } else if (side === 1) {
      x1 = width + 10;
      y1 = Math.random() * height;
      x2 = -10;
      y2 = y1 + (Math.random() - 0.5) * 24;
    } else if (side === 2) {
      x1 = Math.random() * width;
      y1 = -10;
      x2 = x1 + (Math.random() - 0.5) * 24;
      y2 = height + 10;
    } else {
      x1 = Math.random() * width;
      y1 = height + 10;
      x2 = x1 + (Math.random() - 0.5) * 24;
      y2 = -10;
    }
    eraseStroke(ctx!, x1, y1, x2, y2, 14 + Math.random() * 10);

    if (inst.stepsLeft <= 0) {
      finishAuto();
    } else if (pixelsRemaining(ctx!, width, height) < 1 - SCRATCH_THRESHOLD) {
      finishAuto();
    } else {
      requestAnimationFrame(autoScratchStep);
    }
  }

  function startAuto() {
    if (inst.done) return;
    inst.stepsLeft = AUTO_STEPS;
    requestAnimationFrame(autoScratchStep);
  }

  // Resize handling
  const resizeObserver = new ResizeObserver(() => {
    if (inst.done) return;
    const r = el.getBoundingClientRect();
    if (Math.abs(r.width - width) < 1 && Math.abs(r.height - height) < 1) return;
    width = r.width;
    height = r.height;
    scaleCanvas(canvas, ctx!, width, height);
    paintFoil(ctx!, width, height);
  });
  resizeObserver.observe(el);

  // Trigger auto reveal on viewport entry
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          startAuto();
          io.disconnect();
        }
      }
    },
    { threshold: 0.4 },
  );
  io.observe(el);
}

(function init() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  function run() {
    const els = document.querySelectorAll<HTMLElement>("[data-scratch-reveal]");
    els.forEach(attach);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();

export {};
