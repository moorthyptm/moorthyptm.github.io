// Experience section — JSON-driven, safely rendered.
// Body content flows through DOM APIs only; link URLs are validated against the
// shared whitelist in lib/safe-dom.ts. innerHTML is never used for body data.

import { appendInline, makeAnchor, type InlineToken } from "./lib/safe-dom";

interface Ref {
  text: string;
  url?: string;
}

interface CompanyExtra {
  text: string;
  url?: string;
  joiner?: string; // e.g., " — " between company and extra
}

interface ExperienceRow {
  years: string;
  title: string;
  titleClient?: Ref; // optional linked client name appended to title (e.g. FCA → Stellantis)
  company: Ref;
  companySuffix?: string; // small parenthetical suffix
  companyExtra?: CompanyExtra; // additional org appended on the company line
  location?: string;
  paragraphs: InlineToken[][];
}

interface ExperiencePayload {
  intro?: string;
  rows: ExperienceRow[];
}

// `__BUILD_HASH__` is injected by Vite at build time (see vite.config.ts).
// Appending it as a query-string cache-buster lets the browser cache the JSON
// indefinitely while still picking up new content on every deploy. The matching
// <link rel="preload"> in index.html uses the same value so the preloaded
// resource is reused (no double-fetch).
const EXPERIENCE_DATA_URL = `/data/experience.json?v=${__BUILD_HASH__}`;

function buildCompanyLine(doc: Document, row: ExperienceRow): HTMLElement {
  const p = doc.createElement("p");
  p.className = "exp-company";

  // Primary company link
  if (row.company.url) {
    p.appendChild(makeAnchor(doc, row.company.text, row.company.url));
  } else {
    p.appendChild(doc.createTextNode(row.company.text));
  }

  // Suffix in muted-soft span
  if (row.companySuffix) {
    p.appendChild(doc.createTextNode(" "));
    const span = doc.createElement("span");
    span.className = "text-muted-soft";
    span.textContent = row.companySuffix;
    p.appendChild(span);
  }

  // Extra (e.g. iQube — KCT)
  if (row.companyExtra) {
    p.appendChild(doc.createTextNode(row.companyExtra.joiner ?? " · "));
    if (row.companyExtra.url) {
      p.appendChild(makeAnchor(doc, row.companyExtra.text, row.companyExtra.url));
    } else {
      p.appendChild(doc.createTextNode(row.companyExtra.text));
    }
  }

  if (row.location) {
    p.appendChild(doc.createTextNode(` · ${row.location}`));
  }
  return p;
}

function buildTitle(doc: Document, row: ExperienceRow): HTMLElement {
  const h3 = doc.createElement("h3");
  // If a linked client is present, render as "Consultant — <a>Fiat Chrysler Automobiles</a>"
  // We split the title at " — " when titleClient is set, so the client name is replaced by the linked anchor.
  if (row.titleClient) {
    const sep = " — ";
    const idx = row.title.indexOf(sep);
    if (idx >= 0) {
      h3.appendChild(doc.createTextNode(row.title.slice(0, idx) + sep));
      const a = makeAnchor(
        doc,
        row.titleClient.text,
        row.titleClient.url ?? "",
        // accent-coloured underline matches existing FCA link styling
        "underline decoration-rule decoration-1 underline-offset-[3px] hover:text-accent hover:decoration-accent transition-colors",
      );
      h3.appendChild(a);
      return h3;
    }
  }
  h3.textContent = row.title;
  return h3;
}

function buildRow(doc: Document, row: ExperienceRow): HTMLElement {
  const wrapper = doc.createElement("div");
  wrapper.className = "exp-row";

  const years = doc.createElement("div");
  years.className = "exp-years";
  years.textContent = row.years;
  wrapper.appendChild(years);

  const main = doc.createElement("div");
  main.appendChild(buildTitle(doc, row));
  main.appendChild(buildCompanyLine(doc, row));

  for (let i = 0; i < row.paragraphs.length; i++) {
    const p = doc.createElement("p");
    if (i < row.paragraphs.length - 1) p.className = "mb-3";
    appendInline(doc, p, row.paragraphs[i]);
    main.appendChild(p);
  }

  wrapper.appendChild(main);
  return wrapper;
}

async function hydrate(): Promise<void> {
  const container = document.querySelector<HTMLElement>("[data-experience-rows]");
  const introContainer = document.querySelector<HTMLElement>("[data-experience-intro]");
  if (!container) return;

  try {
    // cache: "default" — let the browser use HTTP cache; the URL's ?v= hash
    // changes per deploy so stale data can never be served.
    const res = await fetch(EXPERIENCE_DATA_URL, { cache: "default" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as ExperiencePayload;

    if (introContainer && data.intro) {
      introContainer.textContent = data.intro;
    }

    container.replaceChildren();
    for (const row of data.rows) {
      container.appendChild(buildRow(document, row));
    }
  } catch (err) {
    console.error("[experience] failed to hydrate", err);
    container.replaceChildren();
    const fallback = document.createElement("p");
    fallback.className = "text-muted";
    fallback.textContent = "Experience data unavailable.";
    container.appendChild(fallback);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", hydrate);
} else {
  void hydrate();
}
