// Build-time security audit for dist/. Runs in CI; exits 1 on findings.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ALLOWED_DOMAINS } from "../src/lib/safe-dom.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const DIST = resolve(__dirname, "../dist");
const ALLOWED = new Set(ALLOWED_DOMAINS);

// Third-party hosts used by the static page (fonts, GA, JSON-LD, SVG ns).
const INFRASTRUCTURE_DOMAINS = new Set<string>([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "www.googletagmanager.com",
  "www.google-analytics.com",
  "analytics.google.com",
  "region1.google-analytics.com",
  "schema.org",
  "www.w3.org",
]);

interface Finding {
  file: string;
  line: number;
  rule: string;
  detail: string;
}

const findings: Finding[] = [];

function add(file: string, content: string, idx: number, rule: string, detail: string) {
  const line = content.slice(0, idx).split("\n").length;
  findings.push({ file: relative(DIST, file), line, rule, detail });
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

function isHostAllowed(host: string): boolean {
  let h = host.toLowerCase();
  if (h.endsWith(".")) h = h.slice(0, -1);
  if (INFRASTRUCTURE_DOMAINS.has(h)) return true;
  for (const d of ALLOWED) if (h === d || h.endsWith(`.${d}`)) return true;
  return false;
}

// Comment ranges (HTML <!-- --> and /* */). Findings inside these are skipped.
function commentRanges(content: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const re of [/<!--[\s\S]*?-->/g, /\/\*[\s\S]*?\*\//g]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

function inComment(idx: number, ranges: Array<[number, number]>): boolean {
  for (const [s, e] of ranges) if (idx >= s && idx < e) return true;
  return false;
}

// ── Checks ────────────────────────────────────────────────────────────────

function checkTokens(file: string, content: string) {
  const re = /\{\{\s*[\w.]+\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    add(file, content, m.index, "unresolved-template", `${m[0]} leaked into output`);
  }
}

function checkInlineHandlers(file: string, content: string, ranges: Array<[number, number]>) {
  const re = /<[a-z][^>]*?\s(on[a-z]+)\s*=/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (inComment(m.index, ranges)) continue;
    add(file, content, m.index, "inline-event-handler", `${m[1]}=… on element`);
  }
}

function checkDangerousElements(file: string, content: string, ranges: Array<[number, number]>) {
  const re = /<(iframe|object|embed)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (inComment(m.index, ranges)) continue;
    add(file, content, m.index, "dangerous-element", `<${m[1]}> not permitted`);
  }
}

function checkJavascriptUrls(file: string, content: string, ranges: Array<[number, number]>) {
  const re = /\b(?:href|src|action)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (inComment(m.index, ranges)) continue;
    const url = m[1].trim();
    if (/^javascript:/i.test(url)) {
      add(file, content, m.index, "javascript-url", url);
    }
    if (/^data:(?!image\/)/i.test(url)) {
      add(file, content, m.index, "non-image-data-url", url.slice(0, 60) + "…");
    }
  }
}

const AGENT_ENDPOINT_HOSTS = new Set<string>();
function checkUrlWhitelist(file: string, content: string, ranges: Array<[number, number]>) {
  const re = /\b(https?:\/\/[^\s"'<>()`]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (inComment(m.index, ranges)) continue;
    const raw = m[1].replace(/[.,;:!?)\]]+$/, "");
    // HTML-escaped chars → literal text in markup, not a live link.
    if (/&(lt|gt|amp|#\d+);/.test(raw)) continue;
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.username || url.password) {
      add(file, content, m.index, "credentialed-url", raw);
      continue;
    }
    const host = url.hostname.toLowerCase();
    if (isHostAllowed(host)) continue;
    if (AGENT_ENDPOINT_HOSTS.has(host)) continue;
    add(file, content, m.index, "off-whitelist-url", `${host} (${raw})`);
  }
}

function loadAgentEndpointHosts(html: string): void {
  const m = /<meta\s+name=["']a2a-agent-endpoint["']\s+content=["']([^"']+)["']/i.exec(html);
  if (!m) return;
  try {
    AGENT_ENDPOINT_HOSTS.add(new URL(m[1]).hostname.toLowerCase());
  } catch {
    /* malformed URL surfaces via the URL whitelist check itself */
  }
}

function checkRequiredMetas(file: string, content: string) {
  if (!file.endsWith("index.html")) return;
  const required: Array<[RegExp, string]> = [
    [/<meta\s+http-equiv=["']Content-Security-Policy["']/i, "CSP meta missing"],
    [/<meta\s+http-equiv=["']X-Content-Type-Options["']\s+content=["']nosniff/i, "X-Content-Type-Options nosniff missing"],
    [/<meta\s+name=["']referrer["']/i, "referrer policy meta missing"],
  ];
  for (const [re, msg] of required) {
    if (!re.test(content)) add(file, content, 0, "missing-meta", msg);
  }
}

function checkAgentCard(): void {
  const cardPath = resolve(DIST, ".well-known/agent-card.json");
  if (!existsSync(cardPath)) {
    findings.push({
      file: ".well-known/agent-card.json",
      line: 0,
      rule: "missing-file",
      detail: "agent-card.json absent from dist/",
    });
    return;
  }
  const raw = readFileSync(cardPath, "utf8");
  let card: Record<string, unknown>;
  try {
    card = JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    findings.push({
      file: ".well-known/agent-card.json",
      line: 0,
      rule: "malformed-json",
      detail: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  const required = ["protocolVersion", "id", "name", "description", "provider", "interfaces"];
  for (const key of required) {
    if (!(key in card)) {
      findings.push({
        file: ".well-known/agent-card.json",
        line: 0,
        rule: "missing-key",
        detail: `agent-card.json is missing required key: ${key}`,
      });
    }
  }
}

// ── Run ───────────────────────────────────────────────────────────────────

if (!existsSync(DIST)) {
  console.error("[audit] dist/ not found — run `vite build` first.");
  process.exit(2);
}

const indexPath = resolve(DIST, "index.html");
if (existsSync(indexPath)) loadAgentEndpointHosts(readFileSync(indexPath, "utf8"));

const TEXT_EXTENSIONS = /\.(html?|json|svg|webmanifest|xml|txt)$/i;
let scanned = 0;
for (const file of walk(DIST)) {
  if (!TEXT_EXTENSIONS.test(file)) continue;
  scanned += 1;
  const content = readFileSync(file, "utf8");
  const ranges = commentRanges(content);
  checkTokens(file, content);
  checkInlineHandlers(file, content, ranges);
  checkDangerousElements(file, content, ranges);
  checkJavascriptUrls(file, content, ranges);
  checkUrlWhitelist(file, content, ranges);
  checkRequiredMetas(file, content);
}

checkAgentCard();
console.log(`[audit] scanned ${scanned} text file(s) under dist/`);

if (findings.length === 0) {
  console.log("[audit] ✓ no findings");
  process.exit(0);
}

console.error(`[audit] ✗ ${findings.length} finding(s):`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  [${f.rule}]  ${f.detail}`);
}
process.exit(1);
