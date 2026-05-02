// XSS-safe markdown: escape first, then apply a whitelisted token set.
// Supports **bold**, *italic*, `code`, ```fenced```, [text](https://url),
// and -/* bullets (rendered as •). http(s) links only.

import { validateUrl } from "../lib/safe-dom.js";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function renderMarkdown(md: string): string {
  let h = escapeHtml(md);
  h = h.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  h = h.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/(^|\s)\*([^*\s][^*\n]*?)\*(?=\s|$|[.,;:!?])/g, "$1<em>$2</em>");
  h = h.replace(/(^|\s)_([^_\s][^_\n]*?)_(?=\s|$|[.,;:!?])/g, "$1<em>$2</em>");
  // Agent output is untrusted (prompt injection). Off-whitelist URLs render
  // as the bare label, never as a clickable anchor.
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label: string, rawUrl: string) => {
    const safe = validateUrl(rawUrl);
    if (!safe) return label;
    return `<a href="${safe.toString()}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  h = h.replace(/^(\s*)[-*]\s+(.+)$/gm, "$1• $2");
  return h;
}
