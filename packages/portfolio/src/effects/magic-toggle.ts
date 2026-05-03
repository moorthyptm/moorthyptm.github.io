const STORAGE_KEY = "magic-mode";

(function init() {
  if (typeof window === "undefined") return;
  if (typeof document === "undefined") return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const supported = !prefersReduced && finePointer;

  function readState(): "on" | "off" {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "on" || v === "off") return v;
    return "off";
  }
  void supported;

  function applyState(state: "on" | "off") {
    document.documentElement.classList.toggle("magic-off", state === "off");
    try {
      localStorage.setItem(STORAGE_KEY, state);
    } catch {
      /* localStorage disabled (private mode); in-session toggle still works */
    }
    if (btn) {
      btn.setAttribute("aria-pressed", state === "on" ? "true" : "false");
      btn.title = state === "on" ? "Magic mode: on (click to turn off)" : "Magic mode: off (click to turn on)";
      btn.classList.toggle("is-on", state === "on");
    }
  }

  const style = document.createElement("style");
  style.textContent = `
    html.magic-off [data-wand-cursor],
    html.magic-off [data-cursor-trail],
    html.magic-off [data-spotlight-overlay] {
      display: none !important;
    }
    html.magic-off body,
    html.magic-off button,
    html.magic-off a,
    html.magic-off input,
    html.magic-off textarea,
    html.magic-off select,
    html.magic-off label {
      cursor: auto !important;
    }
    [data-magic-toggle] {
      position: fixed;
      bottom: 24px;
      left: 24px;
      width: 44px;
      height: 44px;
      border-radius: 999px;
      border: 1px solid var(--rule, rgba(0,0,0,0.15));
      background: var(--paper, #f4f1ea);
      color: var(--ink, #141619);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
      cursor: pointer !important;
      z-index: 10000;
      transition: transform 160ms ease-out, box-shadow 160ms ease-out, background 160ms;
      font: inherit;
      padding: 0;
    }
    [data-magic-toggle]:hover {
      transform: translateY(-1px) scale(1.04);
      box-shadow: 0 6px 18px rgba(0,0,0,0.12), 0 2px 3px rgba(0,0,0,0.08);
    }
    [data-magic-toggle]:focus-visible {
      outline: 2px solid var(--accent, #2D5F4E);
      outline-offset: 3px;
    }
    [data-magic-toggle].is-on {
      background: var(--ink, #141619);
      color: var(--paper, #f4f1ea);
    }
    [data-magic-toggle] svg { width: 20px; height: 20px; display: block; }
    [data-magic-toggle] .glow {
      transform-origin: 6px 6px;
      transition: opacity 200ms;
    }
    [data-magic-toggle]:not(.is-on) .glow {
      opacity: 0.25;
    }
    @media (max-width: 640px) {
      [data-magic-toggle] { display: none; }
    }
  `;
  document.head.appendChild(style);

  const NS = "http://www.w3.org/2000/svg";
  const btn = document.createElement("button");
  btn.setAttribute("type", "button");
  btn.setAttribute("data-magic-toggle", "");
  btn.setAttribute("data-keep-cursor", "");
  btn.setAttribute("aria-label", "Toggle magic cursor");

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  const stick = document.createElementNS(NS, "line");
  stick.setAttribute("x1", "6");
  stick.setAttribute("y1", "6");
  stick.setAttribute("x2", "19");
  stick.setAttribute("y2", "19");
  svg.appendChild(stick);

  const tip = document.createElementNS(NS, "circle");
  tip.setAttribute("cx", "6");
  tip.setAttribute("cy", "6");
  tip.setAttribute("r", "2");
  tip.setAttribute("fill", "currentColor");
  tip.setAttribute("stroke", "none");
  tip.setAttribute("class", "glow");
  svg.appendChild(tip);

  const stars = [
    [3, 11],
    [10, 3],
    [11, 10],
  ];
  for (const [cx, cy] of stars) {
    const s = document.createElementNS(NS, "circle");
    s.setAttribute("cx", String(cx));
    s.setAttribute("cy", String(cy));
    s.setAttribute("r", "0.6");
    s.setAttribute("fill", "currentColor");
    s.setAttribute("stroke", "none");
    s.setAttribute("class", "glow");
    svg.appendChild(s);
  }

  btn.appendChild(svg);

  btn.addEventListener("click", () => {
    const next = readState() === "on" ? "off" : "on";
    applyState(next);
  });

  document.documentElement.classList.toggle("magic-off", readState() === "off");

  function attach() {
    const placeholder = document.getElementById("magic-toggle-placeholder");
    placeholder?.remove();
    document.getElementById("magic-toggle-placeholder-style")?.remove();
    document.body.appendChild(btn);
    applyState(readState());
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();

export {};
