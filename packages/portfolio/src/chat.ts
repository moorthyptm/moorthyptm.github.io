// Vanilla chat widget. SSE-streamed replies from the agent; session id in
// sessionStorage so turns within a tab share agent memory.
import { validateUrl } from "./lib/safe-dom.js";

(function () {
  "use strict";

  // Empty meta value disables the widget (used during agent redeploys).
  const AGENT_URL =
    document
      .querySelector<HTMLMetaElement>('meta[name="a2a-agent-endpoint"]')
      ?.content?.trim() || "";
  if (!AGENT_URL) {
    return;
  }

  const STORAGE_KEY = "moorthyptm-chat-session";
  let sessionId = sessionStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = (crypto.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(STORAGE_KEY, sessionId);
  }

  // Contract: agent/welcome.service.ts.
  interface WelcomeChip {
    label: string;
    role: "recruiter" | "developer" | "other";
    description?: string;
  }
  interface WelcomePayload {
    agentName: string;
    chips: WelcomeChip[];
    bubbleLabel: string;
    drawerTitle: string;
    drawerSubtitle: string;
    inputPlaceholder: string;
    inputLabel: string;
    closeLabel: string;
    sendLabel: string;
    actorLabels: { user: string; assistant: string };
    freeFormPrompt: string;
    offlineMessage: string;
    errorMessage: string;
  }

  let welcome: WelcomePayload | null = null;
  const welcomePending: Promise<WelcomePayload | null> = (async () => {
    try {
      const res = await fetch(`${AGENT_URL}/chat/welcome`, { cache: "default" });
      if (!res.ok) return null;
      return (await res.json()) as WelcomePayload;
    } catch {
      return null;
    }
  })();

  const root = document.createElement("div");
  root.className = "agent-chat-widget";
  root.innerHTML = `
    <button class="agent-chat-bubble" type="button" aria-expanded="false">
      <span class="agent-chat-bubble-dot agent-chat-bubble-dot--checking" data-bubble-status aria-hidden="true"></span>
      <span data-bubble-label></span>
    </button>
    <span data-bubble-status-label class="sr-only" aria-live="polite">Checking agent status</span>
    <section class="agent-chat-drawer" role="dialog" hidden>
      <header class="agent-chat-header">
        <div>
          <div class="agent-chat-title-row">
            <div class="agent-chat-title" data-drawer-title></div>
            <span class="agent-chat-beta" aria-label="Beta">BETA</span>
          </div>
          <div class="agent-chat-sub" data-drawer-sub></div>
        </div>
        <button class="agent-chat-close" type="button">×</button>
      </header>
      <div class="agent-chat-messages" role="log" aria-live="polite" aria-atomic="false"></div>
      <form class="agent-chat-form" autocomplete="off">
        <input class="agent-chat-input" type="text" id="agent-chat-input"
               name="message" maxlength="2000" required />
        <button class="agent-chat-submit" type="submit">→</button>
      </form>
    </section>
  `;
  document.body.appendChild(root);

  const bubble = root.querySelector<HTMLButtonElement>(".agent-chat-bubble")!;
  const drawer = root.querySelector<HTMLElement>(".agent-chat-drawer")!;
  const closeBtn = root.querySelector<HTMLButtonElement>(".agent-chat-close")!;
  const messages = root.querySelector<HTMLDivElement>(".agent-chat-messages")!;
  const form = root.querySelector<HTMLFormElement>(".agent-chat-form")!;
  const input = root.querySelector<HTMLInputElement>(".agent-chat-input")!;
  const submit = root.querySelector<HTMLButtonElement>(".agent-chat-submit")!;
  const bubbleLabel = root.querySelector<HTMLSpanElement>("[data-bubble-label]")!;
  const drawerTitle = root.querySelector<HTMLDivElement>("[data-drawer-title]")!;
  const drawerSub = root.querySelector<HTMLDivElement>("[data-drawer-sub]")!;
  drawer.setAttribute("aria-label", "Chat");

  // Generic scaffolding shown when the welcome fetch is in flight or fails.
  const FALLBACK = {
    bubbleLabel: "Chat",
    drawerTitle: "Chat",
    drawerSubtitle: "",
    inputPlaceholder: "Message…",
    inputLabel: "Message",
    closeLabel: "Close",
    sendLabel: "Send",
    actorUser: "You",
    actorAssistant: "Agent",
    freeFormPrompt: "Tell me your role and what I can help with.",
    offlineMessage: "Chat is currently unavailable.",
    errorMessage: "Connection error. Please try again.",
  } as const;

  function applyWelcomeCopy(p: WelcomePayload): void {
    bubbleLabel.textContent = p.bubbleLabel ?? FALLBACK.bubbleLabel;
    const title = p.drawerTitle ?? FALLBACK.drawerTitle;
    drawerTitle.textContent = title;
    drawerSub.textContent = p.drawerSubtitle ?? FALLBACK.drawerSubtitle;
    input.placeholder = p.inputPlaceholder ?? FALLBACK.inputPlaceholder;
    input.setAttribute("aria-label", p.inputLabel ?? FALLBACK.inputLabel);
    closeBtn.setAttribute("aria-label", p.closeLabel ?? FALLBACK.closeLabel);
    submit.setAttribute("aria-label", p.sendLabel ?? FALLBACK.sendLabel);
    drawer.setAttribute("aria-label", title);
  }
  bubbleLabel.textContent = FALLBACK.bubbleLabel;
  drawerTitle.textContent = FALLBACK.drawerTitle;
  input.placeholder = FALLBACK.inputPlaceholder;
  input.setAttribute("aria-label", FALLBACK.inputLabel);
  closeBtn.setAttribute("aria-label", FALLBACK.closeLabel);
  submit.setAttribute("aria-label", FALLBACK.sendLabel);
  drawer.setAttribute("aria-label", FALLBACK.drawerTitle);

  const statusDot = root.querySelector<HTMLSpanElement>("[data-bubble-status]")!;
  const statusLabel = root.querySelector<HTMLSpanElement>("[data-bubble-status-label]")!;
  function setStatus(state: "checking" | "online" | "offline", label: string): void {
    statusDot.classList.remove(
      "agent-chat-bubble-dot--checking",
      "agent-chat-bubble-dot--online",
      "agent-chat-bubble-dot--offline",
    );
    statusDot.classList.add(`agent-chat-bubble-dot--${state}`);
    statusLabel.textContent = label;
  }

  void welcomePending.then((p) => {
    if (p) {
      welcome = p;
      applyWelcomeCopy(p);
      setStatus("online", `${p.agentName} is online`);
    } else {
      setStatus("offline", "Agent is offline");
    }
  });

  type MsgRole = "user" | "assistant";
  type MsgState = { plainText: string; body: HTMLElement };
  const msgState = new WeakMap<HTMLElement, MsgState>();

  async function toggleDrawer(open: boolean) {
    drawer.hidden = !open;
    bubble.setAttribute("aria-expanded", String(open));
    if (open) {
      input.focus();
      if (messages.childElementCount === 0) {
        const pendingNode = appendMessage("assistant", "…");
        const data = welcome ?? (await welcomePending);
        pendingNode.remove();
        if (data) {
          renderWelcome(data);
        } else {
          appendMessage("assistant", "Chat is currently unavailable.");
        }
      }
    }
  }

  // Stream the LLM-generated greeting silently (user message hidden from UI).
  async function streamGreet(out: HTMLElement): Promise<void> {
    const streamer = makeStreamer(out);
    try {
      const res = await fetch(`${AGENT_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId ?? "",
        },
        body: JSON.stringify({ text: "role:greet" }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() || "";
        for (const frame of frames) {
          const line = frame.replace(/^data: /, "").trim();
          if (!line) continue;
          try {
            const p = JSON.parse(line) as { delta?: string };
            if (typeof p.delta === "string") streamer.push(p.delta);
          } catch {
            /* skip */
          }
        }
      }
    } catch {
      streamer.push("Hi — pick a role below or ask me anything.");
    } finally {
      await streamer.flush();
      out.classList.remove("agent-chat-msg--streaming");
    }
  }

  // Single bubble: actor + streamed greeting paragraph + chip row inline.
  // Chips post `role:<x>` so the system prompt's onboarding branches.
  function renderWelcome(payload: WelcomePayload) {
    const wrap = document.createElement("div");
    wrap.className =
      "agent-chat-msg agent-chat-msg--assistant agent-chat-welcome agent-chat-msg--streaming";

    const actor = document.createElement("div");
    actor.className = "agent-chat-msg-actor";
    actor.textContent = payload.agentName;
    wrap.appendChild(actor);

    const body = document.createElement("div");
    body.className = "agent-chat-msg-body";
    wrap.appendChild(body);

    const greetingP = document.createElement("p");
    greetingP.className = "agent-chat-greet";
    body.appendChild(greetingP);

    // Streamer writes into the greeting paragraph specifically — leaving
    // the chips below untouched.
    msgState.set(wrap, { plainText: "", body: greetingP });

    const chipRow = document.createElement("div");
    chipRow.className = "agent-chat-chips";
    for (const c of payload.chips) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "agent-chat-chip";
      btn.textContent = c.label;
      if (c.description) btn.title = c.description;
      btn.addEventListener("click", () => {
        wrap.classList.add("agent-chat-welcome--used");
        chipRow.querySelectorAll<HTMLButtonElement>(".agent-chat-chip").forEach((b) => {
          b.disabled = true;
        });
        if (c.role === "other") {
          appendMessage("assistant", payload.freeFormPrompt);
          input.focus();
          return;
        }
        sendMessage(`role:${c.role}`);
      });
      chipRow.appendChild(btn);
    }
    body.appendChild(chipRow);

    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;

    void streamGreet(wrap);
  }

  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  }

  // XSS-safe markdown: escape first, then apply a whitelisted token set.
  // Supports **bold**, *italic*, `code`, ```fenced```, [text](https://url),
  // and -/* bullets (rendered as •). http(s) links only.
  function renderMarkdown(md: string) {
    let h = escapeHtml(md);
    h = h.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
    h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    h = h.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/(^|\s)\*([^*\s][^*\n]*?)\*(?=\s|$|[.,;:!?])/g, "$1<em>$2</em>");
    h = h.replace(/(^|\s)_([^_\s][^_\n]*?)_(?=\s|$|[.,;:!?])/g, "$1<em>$2</em>");
    // Agent output is untrusted (prompt injection). Off-whitelist URLs
    // render as the bare label, never as a clickable anchor.
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match: string, label: string, rawUrl: string) => {
      const safe = validateUrl(rawUrl);
      if (!safe) return label;
      return `<a href="${safe.toString()}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
    h = h.replace(/^(\s*)[-*]\s+(.+)$/gm, "$1• $2");
    return h;
  }

  function actorLabel(role: MsgRole): string {
    if (welcome) return welcome.actorLabels[role];
    return role === "user" ? "You" : "Agent";
  }

  function appendMessage(role: MsgRole, text: string) {
    const el = document.createElement("div");
    el.className = `agent-chat-msg agent-chat-msg--${role}`;
    el.setAttribute("role", "group");
    const label = actorLabel(role);
    el.setAttribute("aria-label", label);

    const actor = document.createElement("div");
    actor.className = "agent-chat-msg-actor";
    actor.textContent = label;
    el.appendChild(actor);

    const body = document.createElement("div");
    body.className = "agent-chat-msg-body";
    if (role === "assistant") {
      body.innerHTML = renderMarkdown(text);
    } else {
      body.textContent = text;
    }
    el.appendChild(body);

    msgState.set(el, { plainText: text, body });
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  // SSE often arrives as one chunk (upstream falls back to non-stream when
  // tools are declared). Paint it char-by-char so the typing cursor stays honest.
  function makeStreamer(out: HTMLElement, charsPerFrame = 3) {
    let buffer = "";
    let draining = false;
    const drain = () => {
      const state = msgState.get(out)!;
      if (!buffer) {
        draining = false;
        return;
      }
      const chunk = buffer.slice(0, charsPerFrame);
      buffer = buffer.slice(charsPerFrame);
      state.plainText += chunk;
      state.body.innerHTML = renderMarkdown(state.plainText);
      messages.scrollTop = messages.scrollHeight;
      requestAnimationFrame(drain);
    };
    return {
      push(s: string) {
        buffer += s;
        if (!draining) {
          draining = true;
          requestAnimationFrame(drain);
        }
      },
      async flush() {
        while (buffer) await new Promise(requestAnimationFrame);
      },
    };
  }

  async function sendMessage(text: string) {
    appendMessage("user", text);
    const out = appendMessage("assistant", "");
    out.classList.add("agent-chat-msg--streaming");
    submit.disabled = true;
    input.disabled = true;
    const streamer = makeStreamer(out);

    try {
      const res = await fetch(`${AGENT_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId ?? "",
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const state = msgState.get(out)!;
        state.plainText = (body && body.message) || `Request failed (${res.status}).`;
        state.body.innerHTML = renderMarkdown(state.plainText);
        out.classList.add("agent-chat-msg--error");
        return;
      }
      if (!res.body) throw new Error("No response body.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";
        for (const frame of frames) {
          const line = frame.replace(/^data: /, "").trim();
          if (!line) continue;
          let payload: { delta?: string; error?: string; done?: boolean };
          try {
            payload = JSON.parse(line);
          } catch {
            continue;
          }
          if (typeof payload.delta === "string") {
            streamer.push(payload.delta);
          } else if (typeof payload.error === "string") {
            streamer.push(`\n[${payload.error}]`);
            out.classList.add("agent-chat-msg--error");
          } else if (payload.done) {
            // end of stream
          }
        }
      }
    } catch (err) {
      // DNS / refused / CORS preflight / offline — surface welcome-supplied
      // copy when we have it (carries the right contact URLs).
      const isOffline =
        !navigator.onLine ||
        (err instanceof TypeError && /fetch|network/i.test(err.message));
      const fallback = isOffline
        ? welcome?.offlineMessage ?? "Chat is currently unavailable."
        : welcome?.errorMessage ?? "Connection error. Please try again.";
      streamer.push(fallback);
      out.classList.add("agent-chat-msg--error");
    } finally {
      await streamer.flush();
      out.classList.remove("agent-chat-msg--streaming");
      submit.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  bubble.addEventListener("click", () => void toggleDrawer(!!drawer.hidden));
  closeBtn.addEventListener("click", () => void toggleDrawer(false));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendMessage(text);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.hidden) void toggleDrawer(false);
  });
})();

export {};
