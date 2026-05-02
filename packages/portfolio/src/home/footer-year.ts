// Stamp current year into the footer. Trivial but kept separate so the
// home/ index stays a thin orchestrator.

export function initFooterYear(): void {
  const year = document.getElementById("footer-year");
  if (year) year.textContent = String(new Date().getFullYear());
}
