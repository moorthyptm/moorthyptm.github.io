import { ALLOWED_DOMAINS } from "./src/lib/safe-dom.js";
import type {
  ExperiencePayload,
  CommunityPayload,
  WorkPayload,
} from "./build-schemas.js";

const ALLOWED = new Set(ALLOWED_DOMAINS);

const BODY_LINK_CLASS =
  "underline decoration-rule decoration-1 underline-offset-[3px] hover:text-ink hover:decoration-ink transition-colors";
const META_LINK_CLASS =
  "mono text-xs uppercase tracking-widest text-muted hover:text-ink inline-flex items-center gap-1.5 whitespace-nowrap transition-colors";
const ITALIC_CLASS = "italic font-medium text-ink";
const CODE_CLASS = "font-mono text-[0.85em] bg-rule/40 px-1 rounded";

type InlineToken =
  | string
  | { em: string }
  | { code: string }
  | { link: string; url: string };

type ExperienceRow = ExperiencePayload["rows"][number];
type CommunityItem = CommunityPayload["items"][number];
type WorkItem = WorkPayload["items"][number];

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function safeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  let host = url.hostname.toLowerCase();
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (!host) return null;
  for (const domain of ALLOWED) {
    if (host === domain || host.endsWith(`.${domain}`)) return url.toString();
  }
  return null;
}

function anchor(label: string, rawUrl: string, className: string): string {
  const safe = safeUrl(rawUrl);
  if (!safe) return `<span>${escape(label)}</span>`;
  return `<a href="${escape(safe)}" target="_blank" rel="noopener noreferrer" class="${className}">${escape(label)}</a>`;
}

function inlineTokens(tokens: readonly InlineToken[]): string {
  let out = "";
  for (const t of tokens) {
    if (typeof t === "string") {
      out += escape(t);
    } else if ("em" in t) {
      out += `<em class="${ITALIC_CLASS}">${escape(t.em)}</em>`;
    } else if ("code" in t) {
      out += `<code class="${CODE_CLASS}">${escape(t.code)}</code>`;
    } else if ("link" in t && "url" in t) {
      out += anchor(t.link, t.url, BODY_LINK_CLASS);
    }
  }
  return out;
}

const META_ARROW_SVG =
  `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">` +
  `<path stroke-linecap="square" d="M7 17L17 7M8 7h9v9"></path></svg>`;

function metaAnchor(label: string, rawUrl: string): string {
  const safe = safeUrl(rawUrl);
  if (!safe) return "";
  return `<a href="${escape(safe)}" target="_blank" rel="noopener noreferrer" class="${META_LINK_CLASS}">${escape(label)}${META_ARROW_SVG}</a>`;
}

function experienceTitle(row: ExperienceRow): string {
  if (row.titleClient) {
    const sep = " — ";
    const idx = row.title.indexOf(sep);
    if (idx >= 0) {
      const head = escape(row.title.slice(0, idx) + sep);
      const linkClass = "underline decoration-rule decoration-1 underline-offset-[3px] hover:text-accent hover:decoration-accent transition-colors";
      const link = anchor(row.titleClient.text, row.titleClient.url ?? "", linkClass);
      return `<h3>${head}${link}</h3>`;
    }
  }
  return `<h3>${escape(row.title)}</h3>`;
}

function experienceCompanyLine(row: ExperienceRow): string {
  let inner = "";
  inner += row.company.url
    ? anchor(row.company.text, row.company.url, BODY_LINK_CLASS)
    : escape(row.company.text);
  if (row.companySuffix) {
    inner += ` <span class="text-muted-soft">${escape(row.companySuffix)}</span>`;
  }
  if (row.companyExtra) {
    inner += escape(row.companyExtra.joiner ?? " · ");
    inner += row.companyExtra.url
      ? anchor(row.companyExtra.text, row.companyExtra.url, BODY_LINK_CLASS)
      : escape(row.companyExtra.text);
  }
  if (row.location) {
    inner += ` · ${escape(row.location)}`;
  }
  return `<p class="exp-company">${inner}</p>`;
}

function experienceRow(row: ExperienceRow): string {
  const paragraphs = row.paragraphs
    .map((para, i) => {
      const cls = i < row.paragraphs.length - 1 ? ' class="mb-3"' : "";
      return `<p${cls}>${inlineTokens(para)}</p>`;
    })
    .join("");
  return (
    `<div class="exp-row">` +
    `<div class="exp-years">${escape(row.years)}</div>` +
    `<div>${experienceTitle(row)}${experienceCompanyLine(row)}${paragraphs}</div>` +
    `</div>`
  );
}

export function renderExperience(payload: ExperiencePayload): string {
  return payload.rows.map(experienceRow).join("");
}

export function experienceIntro(payload: ExperiencePayload): string {
  return payload.intro ? escape(payload.intro) : "";
}

function communityItem(item: CommunityItem): string {
  let line = item.org.url
    ? anchor(item.org.text, item.org.url, BODY_LINK_CLASS)
    : escape(item.org.text);
  if (item.venue) line += ` · ${escape(item.venue)}`;

  const body = item.body.map((para) => `<p>${inlineTokens(para)}</p>`).join("");

  let links = "";
  if (item.links && item.links.length > 0) {
    const rendered = item.links
      .map((l) => metaAnchor(l.label, l.url))
      .filter((s) => s.length > 0)
      .join("");
    if (rendered) {
      links = `<div class="flex flex-wrap gap-x-5 gap-y-2 mt-3">${rendered}</div>`;
    }
  }

  return (
    `<div class="exp-row">` +
    `<div class="exp-years">${escape(item.date)}</div>` +
    `<div>` +
    `<h3>${escape(item.title)}</h3>` +
    `<p class="exp-company">${line}</p>` +
    body +
    links +
    `</div>` +
    `</div>`
  );
}

export function renderCommunity(payload: CommunityPayload): string {
  const buckets = payload.sections.map((section) => {
    const items = payload.items.filter((i) => i.bucket === section.id);
    if (items.length === 0) return "";
    const rendered = items.map(communityItem).join("");
    return (
      `<div>` +
      `<p class="eyebrow mb-6">${escape(section.label)}</p>` +
      rendered +
      `</div>`
    );
  });
  return buckets.filter((s) => s.length > 0).join("");
}

function workArticle(item: WorkItem, index: number): string {
  const idx = String(index + 1).padStart(2, "0");
  const body = item.body.map((para) => `<p>${inlineTokens(para)}</p>`).join("");
  const tags =
    item.tags.length > 0
      ? `<div>${item.tags.map((t) => `<span class="tag-chip">${escape(t)}</span>`).join("")}</div>`
      : "";
  const taglineCls =
    "font-display italic text-accent text-lg md:text-xl !mt-1 !mb-3 [text-wrap:balance]";
  return (
    `<article class="work-item">` +
    `<div class="work-index">${idx}</div>` +
    `<div>` +
    `<h3>${escape(item.title)}</h3>` +
    `<p class="${taglineCls}">${escape(item.tagline)}</p>` +
    body +
    tags +
    `</div>` +
    `<div class="work-meta">${escape(item.category)}<br />${escape(item.period)}</div>` +
    `</article>`
  );
}

export function renderWork(payload: WorkPayload): string {
  return payload.items.map((item, i) => workArticle(item, i)).join("");
}
