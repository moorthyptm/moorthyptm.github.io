const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const prefersReduced = (): boolean =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

async function streamChildNodes(
  targetEl: Node,
  sourceNodes: Node[],
  speed: number,
  onTick?: () => void,
): Promise<void> {
  for (const node of sourceNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      const textNode = document.createTextNode("");
      targetEl.appendChild(textNode);
      for (let i = 0; i < text.length; i++) {
        textNode.data += text[i];
        onTick?.();
        await sleep(speed + (Math.random() * speed * 0.6 - speed * 0.3));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const clone = node.cloneNode(false);
      targetEl.appendChild(clone);
      await streamChildNodes(clone, Array.from(node.childNodes), speed, onTick);
    }
  }
}

async function runTuiStream(root: Element): Promise<void> {
  const lines = Array.from(root.querySelectorAll<HTMLElement>("[data-line]"));
  const finalLine = root.querySelector(".tui-final");

  let rafPending = false;
  const pinBottom = (): void => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      root.scrollTop = root.scrollHeight;
      rafPending = false;
    });
  };

  const snapshots = lines.map((line) => {
    const textEl = line.querySelector(".tui-text");
    if (!textEl) return { line, textEl: null, sourceNodes: [] as Node[] };
    const sourceNodes = Array.from(textEl.childNodes);
    textEl.textContent = "";
    return { line, textEl, sourceNodes };
  });

  for (const snap of snapshots) {
    const { line, textEl, sourceNodes } = snap;
    line.classList.add("tui-seen");
    pinBottom();
    const speed = parseInt(line.dataset.speed || "12", 10);
    const pause = parseInt(line.dataset.pause || "180", 10);
    if (textEl && speed > 0) {
      line.classList.add("tui-active");
      await streamChildNodes(textEl, sourceNodes, speed, pinBottom);
      line.classList.remove("tui-active");
    } else if (textEl) {
      sourceNodes.forEach((n) => textEl.appendChild(n));
    }
    pinBottom();
    await sleep(pause);
  }

  if (finalLine) {
    finalLine.classList.add("tui-seen");
    pinBottom();
  }
}

export function initTuiStream(): void {
  const streams = document.querySelectorAll("[data-tui-stream]");
  if (streams.length === 0) return;

  if (prefersReduced() || !("IntersectionObserver" in window)) {
    streams.forEach((root) => {
      root.querySelectorAll("[data-line]").forEach((l) => l.classList.add("tui-seen"));
    });
    return;
  }

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        void runTuiStream(entry.target);
      });
    },
    { threshold: 0.25 },
  );
  streams.forEach((root) => obs.observe(root));
}
