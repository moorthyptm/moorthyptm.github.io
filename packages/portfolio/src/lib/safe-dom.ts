// Safe DOM-building primitives shared across data-driven section renderers.
// Body text from JSON is treated as untrusted: we never set innerHTML with it.
// All inline emphasis and links flow through DOM APIs (createElement / textContent
// / setAttribute) and link URLs are validated against a domain whitelist before
// emission. Anything that fails validation is rendered as plain text — no silent
// injection.

export const ALLOWED_DOMAINS: readonly string[] = [
  // Owner-managed
  "moorthyptm.github.io",
  "agent.moorthyptm.com",

  // Identity / social
  "linkedin.com",
  "github.com",
  "instagram.com",
  "meetup.com",

  // Employer / past clients
  "trustrace.com",
  "stellantis.com",
  "capgemini.com",
  "infor.com",

  // Education / institutions referenced in experience + community
  "iqubekct.ac.in",
  "kct.ac.in",
  "usm.my",
  "bitsathy.ac.in",
  "kahedu.edu.in",

  // Tech / framework canonical sites
  "angular.dev",
  "angularjs.org",
  "nodejs.org",
  "spring.io",
  "aws.amazon.com",
  "azure.microsoft.com",
  "powerbi.microsoft.com",
  "babylonjs.com",
  "threejs.org",
  "playwright.dev",
  "protractortest.org",
  "postman.com",
  "mochajs.org",
  "mongodb.com",
  "elastic.co",
  "storybook.js.org",
  "mqtt.org",
  "nodered.org",
  "python.org",
  "pandas.pydata.org",
  "materializecss.com",
  "php.net",
  "mysql.com",
];

const ALLOWED_DOMAIN_SET = new Set(ALLOWED_DOMAINS);

/** Validates a URL: must be http(s), free of embedded credentials, and the
 *  hostname must match (or be a subdomain of) one of the whitelisted domains.
 *  Returns the parsed URL if valid, null otherwise.
 *
 *  Notes on the host check:
 *  - WHATWG `new URL()` isolates the host from path / query / fragment, so
 *    tricks like `https://evil.com?host=linkedin.com` reduce to `host = evil.com`
 *    and fail the check correctly.
 *  - `host.endsWith('.' + domain)` requires a leading dot so `evillinkedin.com`
 *    cannot impersonate `linkedin.com`.
 *  - We strip a trailing dot (FQDN form) so `linkedin.com.` matches.
 *  - We reject credentialed URLs (`https://user:pwd@github.com`) — modern
 *    browsers warn but defence-in-depth says don't render them as anchors.
 */
export function validateUrl(raw: string): URL | null {
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

  for (const domain of ALLOWED_DOMAIN_SET) {
    if (host === domain || host.endsWith(`.${domain}`)) return url;
  }
  return null;
}

/** Style classes used across renderers. Centralised so changes flow consistently. */
export const STYLE = {
  bodyLink:
    "underline decoration-rule decoration-1 underline-offset-[3px] hover:text-ink hover:decoration-ink transition-colors",
  metaLink:
    "mono text-xs uppercase tracking-widest text-muted hover:text-ink inline-flex items-center gap-1.5 transition-colors",
  italic: "serif-italic text-ink",
} as const;

/** Build an external anchor with the standard styling. URL is validated; if invalid,
 *  emits a span with the label text (no link). */
export function makeAnchor(
  doc: Document,
  label: string,
  rawUrl: string,
  className: string = STYLE.bodyLink,
): HTMLElement {
  const url = validateUrl(rawUrl);
  if (!url) {
    const span = doc.createElement("span");
    span.textContent = label;
    return span;
  }
  const a = doc.createElement("a");
  a.href = url.toString();
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = className;
  a.textContent = label;
  return a;
}

/** A meta-link is an underlined-arrow anchor used for "Post on LinkedIn ↗" style refs. */
export function makeMetaAnchor(doc: Document, label: string, rawUrl: string): HTMLElement | null {
  const url = validateUrl(rawUrl);
  if (!url) return null;

  const a = doc.createElement("a");
  a.href = url.toString();
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = STYLE.metaLink;
  a.textContent = label;

  // arrow svg — built via DOM APIs (svgs don't honour innerHTML for parsing reliably here)
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "w-3 h-3");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("stroke-width", "1.5");
  const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("stroke-linecap", "square");
  path.setAttribute("d", "M7 17L17 7M8 7h9v9");
  svg.appendChild(path);
  a.appendChild(svg);

  return a;
}

/** Body inline tokens: a paragraph is an array of these.
 *  Strings render as plain text. `em` wraps in italic span. `link` builds a validated anchor. */
export type InlineToken =
  | string
  | { em: string }
  | { link: string; url: string };

/** Append a paragraph's tokens to a parent <p>. All emission goes through DOM APIs;
 *  no token field is ever passed to innerHTML. */
export function appendInline(
  doc: Document,
  parent: HTMLElement,
  tokens: readonly InlineToken[],
): void {
  for (const tok of tokens) {
    if (typeof tok === "string") {
      parent.appendChild(doc.createTextNode(tok));
      continue;
    }
    if ("em" in tok) {
      const span = doc.createElement("span");
      span.className = STYLE.italic;
      span.textContent = tok.em;
      parent.appendChild(span);
      continue;
    }
    if ("link" in tok && "url" in tok) {
      parent.appendChild(makeAnchor(doc, tok.link, tok.url));
      continue;
    }
  }
}
