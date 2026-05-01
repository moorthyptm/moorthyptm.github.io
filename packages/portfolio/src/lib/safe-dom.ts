// URL whitelist used by the chat widget (agent output is untrusted) and the
// build-time renderers (defence-in-depth on trusted data files).

export const ALLOWED_DOMAINS: readonly string[] = [
  "moorthyptm.github.io",
  "agent.moorthyptm.com",

  "linkedin.com",
  "github.com",
  "meetup.com",

  "trustrace.com",
  "stellantis.com",
  "capgemini.com",
  "infor.com",

  "iqubekct.ac.in",
  "kct.ac.in",
  "usm.my",
  "bitsathy.ac.in",
  "kahedu.edu.in",

  "angular.dev",
  "angularjs.org",
  "nodejs.org",
  "spring.io",
  "aws.amazon.com",
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

// http(s) only, no creds, host must equal or be a subdomain of an entry.
// The leading dot on `endsWith('.' + domain)` blocks `evillinkedin.com`
// from impersonating `linkedin.com`.
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
