(() => {
  const prefersReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Footer year
  const year = document.getElementById('footer-year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Mobile menu
  const menuBtn = document.getElementById('mobile-menu-button');
  const menuClose = document.getElementById('mobile-menu-close');
  const sheet = document.getElementById('mobile-menu');

  const openMenu = () => {
    if (!sheet) return;
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    menuBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const closeMenu = () => {
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    menuBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  menuBtn?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', closeMenu);
  sheet?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheet?.classList.contains('open')) closeMenu();
  });

  // Fade-and-slide reveals
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => revealObs.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('visible'));
  }

  // Nav active state
  const navLinks = document.querySelectorAll('[data-nav-link]');
  const sections = Array.from(document.querySelectorAll('section[id]'));
  if ('IntersectionObserver' in window && sections.length) {
    const navObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { threshold: 0.4 });
    sections.forEach(s => navObs.observe(s));
  }

  // Heading sweep — Codex-style left→right wipe with accent bar
  const wrapForSweep = (el: Element): HTMLSpanElement => {
    const wrap = document.createElement('span');
    wrap.className = 'sweep-wrap';
    const inner = document.createElement('span');
    inner.className = 'sweep';
    while (el.firstChild) inner.appendChild(el.firstChild);
    wrap.appendChild(inner);
    el.appendChild(wrap);
    return wrap;
  };

  const sweepTargets = document.querySelectorAll('.hero-name, .section-heading');
  const sweepWraps: HTMLSpanElement[] = [];
  sweepTargets.forEach(el => sweepWraps.push(wrapForSweep(el)));

  if (prefersReduced()) {
    sweepWraps.forEach(w => {
      w.classList.add('playing');
      w.querySelector('.sweep')?.classList.add('playing');
    });
  } else if ('IntersectionObserver' in window) {
    const sweepObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('playing');
          entry.target.querySelector('.sweep')?.classList.add('playing');
          sweepObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35, rootMargin: '0px 0px -10% 0px' });
    sweepWraps.forEach(w => sweepObs.observe(w));
  } else {
    sweepWraps.forEach(w => {
      w.classList.add('playing');
      w.querySelector('.sweep')?.classList.add('playing');
    });
  }

  // TUI streaming — character-by-character like a real LLM
  const streamChildNodes = async (
    targetEl: Node,
    sourceNodes: Node[],
    speed: number,
    onTick?: () => void,
  ): Promise<void> => {
    for (const node of sourceNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? '';
        const textNode = document.createTextNode('');
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
  };

  const runTuiStream = async (root: Element) => {
    const lines = Array.from(root.querySelectorAll<HTMLElement>('[data-line]'));
    const finalLine = root.querySelector('.tui-final');

    // Internal-only scroll. rAF-batched to avoid layout thrash during fast char appends.
    let rafPending = false;
    const pinBottom = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        root.scrollTop = root.scrollHeight;
        rafPending = false;
      });
    };

    // Snapshot each line's source content, clear target text (keep lines hidden)
    const snapshots = lines.map(line => {
      const textEl = line.querySelector('.tui-text');
      if (!textEl) return { line, textEl: null, sourceNodes: [] };
      const sourceNodes = Array.from(textEl.childNodes);
      textEl.textContent = '';
      return { line, textEl, sourceNodes };
    });

    for (const snap of snapshots) {
      const { line, textEl, sourceNodes } = snap;
      line.classList.add('tui-seen');
      pinBottom();
      const speed = parseInt(line.dataset.speed || '12', 10);
      const pause = parseInt(line.dataset.pause || '180', 10);
      if (textEl && speed > 0) {
        line.classList.add('tui-active');
        await streamChildNodes(textEl, sourceNodes, speed, pinBottom);
        line.classList.remove('tui-active');
      } else if (textEl) {
        sourceNodes.forEach(n => textEl.appendChild(n));
      }
      pinBottom();
      await sleep(pause);
    }

    if (finalLine) {
      finalLine.classList.add('tui-seen');
      pinBottom();
    }
  };

  const tuiStreams = document.querySelectorAll('[data-tui-stream]');
  if (tuiStreams.length) {
    if (prefersReduced()) {
      tuiStreams.forEach(root => {
        root.querySelectorAll('[data-line]').forEach(l => l.classList.add('tui-seen'));
      });
    } else if ('IntersectionObserver' in window) {
      const tuiObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            tuiObs.unobserve(entry.target);
            runTuiStream(entry.target);
          }
        });
      }, { threshold: 0.25 });
      tuiStreams.forEach(root => tuiObs.observe(root));
    } else {
      tuiStreams.forEach(root => {
        root.querySelectorAll('[data-line]').forEach(l => l.classList.add('tui-seen'));
      });
    }
  }
})();
