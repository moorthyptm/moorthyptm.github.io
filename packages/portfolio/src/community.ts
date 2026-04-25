// Community section — JSON-driven, safely rendered.
// Data lives at /data/community.json. The body content is treated as untrusted:
// inline tokens flow through DOM APIs (textContent / createElement) and link URLs
// are validated against a domain whitelist in lib/safe-dom.ts.

import {
  appendInline,
  makeAnchor,
  makeMetaAnchor,
  type InlineToken,
} from "./lib/safe-dom";

type CommunityBucket = "speaking" | "mentorship" | "writing";

interface OrgRef {
  text: string;
  url?: string;
}

interface MetaLink {
  label: string;
  url: string;
}

interface CommunityItem {
  bucket: CommunityBucket;
  date: string;
  title: string;
  org: OrgRef;
  venue?: string;
  body: InlineToken[][]; // paragraphs of inline tokens
  links?: MetaLink[];
}

interface CommunitySection {
  id: CommunityBucket;
  label: string;
}

interface CommunityPayload {
  sections: CommunitySection[];
  items: CommunityItem[];
}

// `__BUILD_HASH__` is injected by Vite at build time (see vite.config.ts).
// Appending it as a query-string cache-buster lets the browser cache the JSON
// indefinitely while still picking up new content on every deploy. The matching
// <link rel="preload"> in index.html uses the same value so the preloaded
// resource is reused (no double-fetch).
const COMMUNITY_DATA_URL = `/data/community.json?v=${__BUILD_HASH__}`;

function buildItem(doc: Document, item: CommunityItem): HTMLElement {
  const row = doc.createElement("div");
  row.className = "exp-row";

  const years = doc.createElement("div");
  years.className = "exp-years";
  years.textContent = item.date;
  row.appendChild(years);

  const main = doc.createElement("div");

  const h3 = doc.createElement("h3");
  h3.textContent = item.title;
  main.appendChild(h3);

  // Org line
  const orgP = doc.createElement("p");
  orgP.className = "exp-company";
  if (item.org.url) {
    orgP.appendChild(makeAnchor(doc, item.org.text, item.org.url));
  } else {
    orgP.appendChild(doc.createTextNode(item.org.text));
  }
  if (item.venue) {
    orgP.appendChild(doc.createTextNode(" · "));
    orgP.appendChild(doc.createTextNode(item.venue));
  }
  main.appendChild(orgP);

  // Body paragraphs
  for (const tokens of item.body) {
    const p = doc.createElement("p");
    appendInline(doc, p, tokens);
    main.appendChild(p);
  }

  // Meta links (Post on LinkedIn / Source on GitHub etc.)
  if (item.links && item.links.length > 0) {
    const linkRow = doc.createElement("div");
    linkRow.className = "flex flex-wrap gap-x-5 gap-y-2 mt-3";
    for (const link of item.links) {
      const anchor = makeMetaAnchor(doc, link.label, link.url);
      if (anchor) linkRow.appendChild(anchor);
    }
    if (linkRow.children.length > 0) main.appendChild(linkRow);
  }

  row.appendChild(main);
  return row;
}

function buildBucket(
  doc: Document,
  section: CommunitySection,
  items: CommunityItem[],
): HTMLElement | null {
  const bucketItems = items.filter((i) => i.bucket === section.id);
  if (bucketItems.length === 0) return null;

  const wrapper = doc.createElement("div");

  const eyebrow = doc.createElement("p");
  eyebrow.className = "eyebrow mb-6";
  eyebrow.textContent = section.label;
  wrapper.appendChild(eyebrow);

  for (const it of bucketItems) {
    wrapper.appendChild(buildItem(doc, it));
  }
  return wrapper;
}

async function hydrate(): Promise<void> {
  const container = document.querySelector<HTMLElement>("[data-community-rows]");
  if (!container) return;

  try {
    // cache: "default" — let the browser use HTTP cache; the URL's ?v= hash
    // changes per deploy so stale data can never be served.
    const res = await fetch(COMMUNITY_DATA_URL, { cache: "default" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as CommunityPayload;

    container.replaceChildren();
    for (const section of data.sections) {
      const node = buildBucket(document, section, data.items);
      if (node) container.appendChild(node);
    }
  } catch (err) {
    console.error("[community] failed to hydrate", err);
    container.replaceChildren();
    const fallback = document.createElement("p");
    fallback.className = "text-muted";
    fallback.textContent = "Community data unavailable.";
    container.appendChild(fallback);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", hydrate);
} else {
  void hydrate();
}
