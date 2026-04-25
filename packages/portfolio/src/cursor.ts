// Harry Potter wand cursor with electric-pulse trail.
//
// Replaces the native cursor on pointer-fine devices with a custom SVG wand element
// that follows the mouse, plus a canvas-based particle trail that emits sparks like
// "wingardium leviosa". Disabled on:
//  - touch devices (no real cursor to replace)
//  - users with prefers-reduced-motion (sparks would be annoying)
//
// All DOM is built via createElement / setAttribute — no innerHTML.

(function init() {
  if (typeof window === "undefined") return;

  // Bail on touch / reduced-motion / no fine pointer
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (prefersReducedMotion || !finePointer) return;

  const doc = document;

  // ── Wand element (SVG, follows mouse) ───────────────────────────────────────
  const wandWrap = doc.createElement("div");
  wandWrap.setAttribute("aria-hidden", "true");
  wandWrap.setAttribute("data-wand-cursor", "");
  wandWrap.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "width:36px",
    "height:36px",
    "pointer-events:none",
    "z-index:10001",
    "transform:translate3d(-100px,-100px,0)",
    "transition:transform 90ms cubic-bezier(.2,.8,.2,1)",
    "will-change:transform",
  ].join(";");

  const NS = "http://www.w3.org/2000/svg";
  const svg = doc.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 36 36");
  svg.setAttribute("width", "36");
  svg.setAttribute("height", "36");
  svg.style.cssText = "overflow:visible;display:block";

  // Wand stick — diagonal from top-left tip to bottom-right handle
  const stick = doc.createElementNS(NS, "line");
  stick.setAttribute("x1", "4");
  stick.setAttribute("y1", "4");
  stick.setAttribute("x2", "26");
  stick.setAttribute("y2", "26");
  stick.setAttribute("stroke", "url(#wandGrad)");
  stick.setAttribute("stroke-width", "2.2");
  stick.setAttribute("stroke-linecap", "round");

  // Handle (darker grip)
  const handle = doc.createElementNS(NS, "line");
  handle.setAttribute("x1", "26");
  handle.setAttribute("y1", "26");
  handle.setAttribute("x2", "32");
  handle.setAttribute("y2", "32");
  handle.setAttribute("stroke", "#3a2616");
  handle.setAttribute("stroke-width", "3.2");
  handle.setAttribute("stroke-linecap", "round");

  // Glow at tip
  const glow = doc.createElementNS(NS, "circle");
  glow.setAttribute("cx", "4");
  glow.setAttribute("cy", "4");
  glow.setAttribute("r", "3.2");
  glow.setAttribute("fill", "url(#tipGlow)");

  const spark = doc.createElementNS(NS, "circle");
  spark.setAttribute("cx", "4");
  spark.setAttribute("cy", "4");
  spark.setAttribute("r", "1.4");
  spark.setAttribute("fill", "#cfeaff");

  // Defs: gradients
  const defs = doc.createElementNS(NS, "defs");
  const wandGrad = doc.createElementNS(NS, "linearGradient");
  wandGrad.setAttribute("id", "wandGrad");
  wandGrad.setAttribute("x1", "0");
  wandGrad.setAttribute("y1", "0");
  wandGrad.setAttribute("x2", "1");
  wandGrad.setAttribute("y2", "1");
  for (const [offset, color] of [
    ["0%", "#cfeaff"],
    ["35%", "#7a5436"],
    ["100%", "#3a2616"],
  ]) {
    const stop = doc.createElementNS(NS, "stop");
    stop.setAttribute("offset", offset);
    stop.setAttribute("stop-color", color);
    wandGrad.appendChild(stop);
  }
  defs.appendChild(wandGrad);

  const tipGlow = doc.createElementNS(NS, "radialGradient");
  tipGlow.setAttribute("id", "tipGlow");
  for (const [offset, color, opacity] of [
    ["0%", "#ffffff", "1"],
    ["40%", "#7fd4ff", "0.85"],
    ["100%", "#1f6fff", "0"],
  ]) {
    const stop = doc.createElementNS(NS, "stop");
    stop.setAttribute("offset", offset);
    stop.setAttribute("stop-color", color);
    stop.setAttribute("stop-opacity", opacity);
    tipGlow.appendChild(stop);
  }
  defs.appendChild(tipGlow);

  svg.appendChild(defs);
  svg.appendChild(stick);
  svg.appendChild(handle);
  svg.appendChild(glow);
  svg.appendChild(spark);
  wandWrap.appendChild(svg);
  doc.body.appendChild(wandWrap);

  // ── Canvas particle trail (electric pulse / sparks) ─────────────────────────
  const canvas = doc.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.setAttribute("data-cursor-trail", "");
  canvas.style.cssText = [
    "position:fixed",
    "inset:0",
    "width:100%",
    "height:100%",
    "pointer-events:none",
    "z-index:10000",
  ].join(";");
  doc.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas, { passive: true });

  // Hide native cursor on the document — but only when the magic mode is ON.
  // The :not(.magic-off) guard means `cursor: none` doesn't apply once the
  // toggle disables magic mode, restoring the native cursor immediately.
  const styleEl = doc.createElement("style");
  styleEl.textContent = `
    html:not(.magic-off), html:not(.magic-off) body, html:not(.magic-off) button, html:not(.magic-off) a, html:not(.magic-off) input, html:not(.magic-off) textarea, html:not(.magic-off) select, html:not(.magic-off) label { cursor: none !important; }
    html:not(.magic-off) [data-keep-cursor], html:not(.magic-off) [data-keep-cursor] * { cursor: auto !important; }
  `;
  doc.head.appendChild(styleEl);

  // ── Particle system ──────────────────────────────────────────────────────────
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    hue: number;
  }
  interface Bolt {
    points: { x: number; y: number }[];
    life: number;
    maxLife: number;
    hue: number;
    width: number;
  }
  const particles: Particle[] = [];
  const bolts: Bolt[] = [];
  const MAX_PARTICLES = 120;
  const MAX_BOLTS = 8;

  function spawnBolt(x1: number, y1: number, x2: number, y2: number, hue: number) {
    // jagged lightning between two points: subdivide and offset perpendicular
    const points: { x: number; y: number }[] = [];
    const segments = 6 + Math.floor(Math.random() * 4);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const jitter = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * 16;
      points.push({
        x: x1 + dx * t + nx * jitter,
        y: y1 + dy * t + ny * jitter,
      });
    }
    bolts.push({ points, life: 7, maxLife: 7, hue, width: 1 + Math.random() * 0.8 });
    if (bolts.length > MAX_BOLTS) bolts.shift();
  }

  let mouseX = -100;
  let mouseY = -100;
  let lastSpawnX = -100;
  let lastSpawnY = -100;
  let isMoving = false;
  let lastMoveAt = 0;

  function spawn(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.4;
      const maxLife = 28 + Math.random() * 24;
      particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.3, // slight upward drift
        life: maxLife,
        maxLife,
        size: 0.8 + Math.random() * 1.4,
        // electric hue range: 200 (cyan) → 260 (purple)
        hue: 200 + Math.random() * 60,
      });
    }
    if (particles.length > MAX_PARTICLES) {
      particles.splice(0, particles.length - MAX_PARTICLES);
    }
  }

  function tick() {
    // fade-trail clear: leave a soft afterglow
    ctx!.globalCompositeOperation = "destination-out";
    ctx!.fillStyle = "rgba(0,0,0,0.18)";
    ctx!.fillRect(0, 0, window.innerWidth, window.innerHeight);

    ctx!.globalCompositeOperation = "lighter";

    // Lightning bolts (drawn first so particles overlay on top)
    for (let bi = bolts.length - 1; bi >= 0; bi--) {
      const b = bolts[bi];
      b.life -= 1;
      if (b.life <= 0) { bolts.splice(bi, 1); continue; }
      const t = b.life / b.maxLife;
      const alpha = t * 0.95;

      // outer glow stroke
      ctx!.strokeStyle = `hsla(${b.hue}, 100%, 70%, ${alpha * 0.5})`;
      ctx!.lineWidth = b.width * 5;
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(b.points[0].x, b.points[0].y);
      for (let i = 1; i < b.points.length; i++) ctx!.lineTo(b.points[i].x, b.points[i].y);
      ctx!.stroke();

      // bright core stroke
      ctx!.strokeStyle = `hsla(${b.hue}, 100%, 95%, ${alpha})`;
      ctx!.lineWidth = b.width;
      ctx!.beginPath();
      ctx!.moveTo(b.points[0].x, b.points[0].y);
      for (let i = 1; i < b.points.length; i++) ctx!.lineTo(b.points[i].x, b.points[i].y);
      ctx!.stroke();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= 1;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      const t = p.life / p.maxLife;
      const alpha = t * 0.85;
      const radius = p.size * (0.7 + t * 0.6);

      // outer glow
      const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 4);
      grad.addColorStop(0, `hsla(${p.hue}, 100%, 75%, ${alpha})`);
      grad.addColorStop(0.4, `hsla(${p.hue}, 100%, 60%, ${alpha * 0.5})`);
      grad.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, radius * 4, 0, Math.PI * 2);
      ctx!.fill();

      // bright core
      ctx!.fillStyle = `hsla(${p.hue}, 100%, 92%, ${alpha})`;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx!.fill();
    }

    // Idle: occasional sparkle near tip
    const now = performance.now();
    if (!isMoving && now - lastMoveAt > 200 && Math.random() < 0.06) {
      spawn(mouseX, mouseY, 1);
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ── Mouse tracking ──────────────────────────────────────────────────────────
  let pendingX = mouseX;
  let pendingY = mouseY;
  let frame: number | null = null;
  function applyTransform() {
    // wand offset so the tip (top-left) sits at the actual cursor position
    wandWrap.style.transform = `translate3d(${pendingX - 4}px, ${pendingY - 4}px, 0)`;
    frame = null;
  }

  window.addEventListener(
    "mousemove",
    (e) => {
      pendingX = e.clientX;
      pendingY = e.clientY;
      mouseX = e.clientX;
      mouseY = e.clientY;
      isMoving = true;
      lastMoveAt = performance.now();

      // Spawn particles along the path so motion looks smooth
      const dx = mouseX - lastSpawnX;
      const dy = mouseY - lastSpawnY;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        const steps = Math.min(4, Math.floor(dist / 6));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          spawn(lastSpawnX + dx * t, lastSpawnY + dy * t, 2);
        }
        // crackle: occasional lightning bolt from previous spawn point to current
        if (dist > 24 && Math.random() < 0.55) {
          spawnBolt(lastSpawnX, lastSpawnY, mouseX, mouseY, 200 + Math.random() * 60);
        }
        lastSpawnX = mouseX;
        lastSpawnY = mouseY;
      }

      if (frame === null) frame = requestAnimationFrame(applyTransform);

      // movement-end timer
      window.clearTimeout((window as any).__wandIdleTimer);
      (window as any).__wandIdleTimer = window.setTimeout(() => {
        isMoving = false;
      }, 80);
    },
    { passive: true },
  );

  window.addEventListener("mouseleave", () => {
    pendingX = -200;
    pendingY = -200;
    if (frame === null) frame = requestAnimationFrame(applyTransform);
  });

  // Click: burst + radial lightning starburst
  window.addEventListener(
    "click",
    (e) => {
      spawn(e.clientX, e.clientY, 24);
      const arms = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < arms; i++) {
        const angle = (Math.PI * 2 * i) / arms + Math.random() * 0.4;
        const reach = 40 + Math.random() * 30;
        const x2 = e.clientX + Math.cos(angle) * reach;
        const y2 = e.clientY + Math.sin(angle) * reach;
        spawnBolt(e.clientX, e.clientY, x2, y2, 200 + Math.random() * 60);
      }
    },
    { passive: true },
  );
})();

export {};
