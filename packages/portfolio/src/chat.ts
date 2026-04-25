/**
 * Portfolio chat widget — vanilla JS, no framework, <200 lines.
 * Floating bubble bottom-right opens a drawer; drawer streams responses
 * from the agent's POST /chat/stream (SSE). Session id is client-generated
 * and persisted in sessionStorage so turns within one browser tab share
 * agent memory (per warm serverless instance).
 */
(function () {
  "use strict";

  const AGENT_URL =
    document.querySelector<HTMLMetaElement>('meta[name="agent-url"]')?.content || "";
  if (!AGENT_URL) {
    // Silent no-op if the portfolio is served without a configured agent URL.
    return;
  }

  const STORAGE_KEY = "moorthyptm-chat-session";
  let sessionId = sessionStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = (crypto.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(STORAGE_KEY, sessionId);
  }

  const root = document.createElement("div");
  root.className = "agent-chat-widget";
  root.innerHTML = `
    <button class="agent-chat-bubble" type="button" aria-expanded="false">
      <span class="agent-chat-bubble-dot" aria-hidden="true"></span>
      <span>Ask the agent</span>
    </button>
    <section class="agent-chat-drawer" role="dialog" aria-label="Chat with portfolio agent" hidden>
      <header class="agent-chat-header">
        <div>
          <div class="agent-chat-title">Portfolio Agent</div>
          <div class="agent-chat-sub">Grounded in his profile and work</div>
        </div>
        <button class="agent-chat-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div class="agent-chat-messages" role="log" aria-live="polite" aria-atomic="false"></div>
      <form class="agent-chat-form" autocomplete="off">
        <input class="agent-chat-input" type="text" id="agent-chat-input"
               name="message" maxlength="2000" required
               placeholder="Ask a question…" aria-label="Message" />
        <button class="agent-chat-submit" type="submit" aria-label="Send">→</button>
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

  type MsgRole = "user" | "assistant";
  type MsgState = { plainText: string; body: HTMLDivElement };
  const msgState = new WeakMap<HTMLElement, MsgState>();

  function toggleDrawer(open: boolean) {
    drawer.hidden = !open;
    bubble.setAttribute("aria-expanded", String(open));
    if (open) {
      input.focus();
      if (messages.childElementCount === 0) {
        appendMessage(
          "assistant",
          "Ask me about Thirumoorthy's experience, stack, or past projects.",
        );
      }
    }
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  /**
   * Minimal safe Markdown → HTML. XSS-safe: escape first, then apply a
   * whitelist of token substitutions. Only http(s) links allowed.
   *   **bold**  *italic*  `code`  ```fenced```  [text](https://url)
   *   - / *     bullet (rendered as •)
   */
  function renderMarkdown(md) {
    let h = escapeHtml(md);
    h = h.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
    h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    h = h.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/(^|\s)\*([^*\s][^*\n]*?)\*(?=\s|$|[.,;:!?])/g, "$1<em>$2</em>");
    h = h.replace(/(^|\s)_([^_\s][^_\n]*?)_(?=\s|$|[.,;:!?])/g, "$1<em>$2</em>");
    h = h.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
    h = h.replace(/^(\s*)[-*]\s+(.+)$/gm, "$1• $2");
    return h;
  }

  const ACTOR_LABEL: Record<MsgRole, string> = { user: "You", assistant: "Agent" };

  function appendMessage(role: MsgRole, text: string) {
    const el = document.createElement("div");
    el.className = `agent-chat-msg agent-chat-msg--${role}`;
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", ACTOR_LABEL[role]);

    const actor = document.createElement("div");
    actor.className = "agent-chat-msg-actor";
    actor.textContent = ACTOR_LABEL[role];
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

  /**
   * Client-side streaming drain. Because the agent forces non-stream upstream
   * when tools are declared (see OpenRouterLlm), the SSE often delivers one
   * large chunk. We buffer it here and paint character-by-character at ~60fps
   * for a "typing" feel that matches the cursor animation.
   */
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
          let payload;
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
            // end of stream — no action
          }
        }
      }
    } catch {
      streamer.push("Connection error. Please try again.");
      out.classList.add("agent-chat-msg--error");
    } finally {
      await streamer.flush();
      out.classList.remove("agent-chat-msg--streaming");
      submit.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  bubble.addEventListener("click", () => toggleDrawer(!!drawer.hidden));
  closeBtn.addEventListener("click", () => toggleDrawer(false));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendMessage(text);
  });

  // Close with Escape while drawer is open.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.hidden) toggleDrawer(false);
  });
})();

export {};
