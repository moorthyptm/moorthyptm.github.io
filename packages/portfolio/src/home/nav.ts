// Mobile menu open/close + active section highlighting in the desktop nav.

export function initNav(): void {
  const menuBtn = document.getElementById("mobile-menu-button");
  const menuClose = document.getElementById("mobile-menu-close");
  const sheet = document.getElementById("mobile-menu");

  const openMenu = (): void => {
    if (!sheet) return;
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    menuBtn?.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };
  const closeMenu = (): void => {
    if (!sheet) return;
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    menuBtn?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  menuBtn?.addEventListener("click", openMenu);
  menuClose?.addEventListener("click", closeMenu);
  sheet?.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sheet?.classList.contains("open")) closeMenu();
  });

  const navLinks = document.querySelectorAll("[data-nav-link]");
  const sections = Array.from(document.querySelectorAll("section[id]"));
  if (!("IntersectionObserver" in window) || sections.length === 0) return;

  // rootMargin shrinks the root to a horizontal line at viewport centre.
  // A section is "active" when its content crosses that line — works for
  // sections of any height (threshold 0.4 fails on sections >2.5x viewport).
  const navObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
        });
      });
    },
    { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
  );
  sections.forEach((s) => navObs.observe(s));
}
