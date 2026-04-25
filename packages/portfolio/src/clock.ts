// Live IST clock for any element with [data-local-time].
// Updates every 30s — fine grain for a "currently HH:MM" display.

const TZ = "Asia/Kolkata";
const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function update() {
  const els = document.querySelectorAll<HTMLElement>("[data-local-time]");
  if (els.length === 0) return;
  const now = new Date();
  const t = fmt.format(now);
  // Day-context hint (morning / afternoon / evening / night) in user's locale text
  const hour = Number.parseInt(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now),
    10,
  );
  let phase = "night";
  if (hour >= 5 && hour < 12) phase = "morning";
  else if (hour >= 12 && hour < 17) phase = "afternoon";
  else if (hour >= 17 && hour < 21) phase = "evening";

  els.forEach((el) => {
    el.textContent = `${t} IST · ${phase}`;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", update);
} else {
  update();
}
setInterval(update, 30_000);

export {};
