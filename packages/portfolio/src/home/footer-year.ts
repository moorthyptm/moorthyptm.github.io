export function initFooterYear(): void {
  const year = document.getElementById("footer-year");
  if (year) year.textContent = String(new Date().getFullYear());
}
