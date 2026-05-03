const prefersReduced = (): boolean =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

function wrapForSweep(el: Element): HTMLSpanElement {
  const wrap = document.createElement("span");
  wrap.className = "sweep-wrap";
  const inner = document.createElement("span");
  inner.className = "sweep";
  while (el.firstChild) inner.appendChild(el.firstChild);
  wrap.appendChild(inner);
  el.appendChild(wrap);
  return wrap;
}

function play(wrap: HTMLSpanElement): void {
  wrap.classList.add("playing");
  wrap.querySelector(".sweep")?.classList.add("playing");
}

export function initSweep(): void {
  const targets = document.querySelectorAll("#home h1, .section-heading");
  const wraps: HTMLSpanElement[] = [];
  targets.forEach((el) => wraps.push(wrapForSweep(el)));

  if (prefersReduced() || !("IntersectionObserver" in window)) {
    wraps.forEach(play);
    return;
  }
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        play(entry.target as HTMLSpanElement);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.35, rootMargin: "0px 0px -10% 0px" },
  );
  wraps.forEach((w) => obs.observe(w));
}
