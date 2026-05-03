import { renderMarkdown } from "./markdown.js";
import type { MsgRole, MsgState } from "./models/message.model.js";
import type { WelcomePayload } from "./models/welcome.model.js";
import { getOrCreateSessionId } from "./session.js";
import { makeStreamer } from "./streamer.js";
import { streamChat, streamGreet } from "./transport.js";
import { fetchWelcome } from "./welcome.client.js";

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
  offlineMessage: "Chat is currently unavailable.",
  errorMessage: "Connection error. Please try again.",
} as const;

const MARKUP = `
  <button class="agent-chat-bubble" type="button" aria-expanded="false">
    <span class="agent-chat-bubble-dot agent-chat-bubble-dot--checking" data-bubble-status aria-hidden="true"></span>
    <span data-bubble-label></span>
  </button>
  <span data-bubble-status-label class="sr-only" aria-live="polite">Checking agent status</span>
  <section class="agent-chat-drawer" role="dialog" aria-modal="true" aria-label="Chat" hidden>
    <header class="agent-chat-header">
      <div>
        <div class="agent-chat-title-row">
          <div class="agent-chat-title" data-drawer-title></div>
          <span class="agent-chat-beta" aria-label="Beta">BETA</span>
        </div>
        <div class="agent-chat-sub" data-drawer-sub></div>
      </div>
      <button class="agent-chat-close" type="button" aria-label="Close">×</button>
    </header>
    <div class="agent-chat-messages" role="log" aria-live="polite" aria-atomic="false"></div>
    <form class="agent-chat-form" autocomplete="off">
      <textarea class="agent-chat-input" id="agent-chat-input" rows="1"
             maxlength="2000" required aria-label="Message"></textarea>
      <button class="agent-chat-submit" type="submit" aria-label="Send">→</button>
    </form>
  </section>
`;

export function initChat(agentUrl: string): void {
  const sessionId = getOrCreateSessionId();

  const root = document.createElement("div");
  root.className = "agent-chat-widget";
  root.innerHTML = MARKUP;
  document.body.appendChild(root);

  const bubble = root.querySelector<HTMLButtonElement>(".agent-chat-bubble")!;
  const drawer = root.querySelector<HTMLElement>(".agent-chat-drawer")!;
  const closeBtn = root.querySelector<HTMLButtonElement>(".agent-chat-close")!;
  const messages = root.querySelector<HTMLDivElement>(".agent-chat-messages")!;
  const form = root.querySelector<HTMLFormElement>(".agent-chat-form")!;
  const input = root.querySelector<HTMLTextAreaElement>(".agent-chat-input")!;
  const submit = root.querySelector<HTMLButtonElement>(".agent-chat-submit")!;
  const bubbleLabel = root.querySelector<HTMLSpanElement>("[data-bubble-label]")!;
  const drawerTitle = root.querySelector<HTMLDivElement>("[data-drawer-title]")!;
  const drawerSub = root.querySelector<HTMLDivElement>("[data-drawer-sub]")!;
  const statusDot = root.querySelector<HTMLSpanElement>("[data-bubble-status]")!;
  const statusLabel = root.querySelector<HTMLSpanElement>("[data-bubble-status-label]")!;
  drawer.setAttribute("aria-label", "Chat");

  const msgState = new WeakMap<HTMLElement, MsgState>();
  let welcome: WelcomePayload | null = null;
  const welcomePending = fetchWelcome(agentUrl);

  const applyFallbackCopy = (): void => {
    bubbleLabel.textContent = FALLBACK.bubbleLabel;
    drawerTitle.textContent = FALLBACK.drawerTitle;
    input.placeholder = FALLBACK.inputPlaceholder;
    input.setAttribute("aria-label", FALLBACK.inputLabel);
    closeBtn.setAttribute("aria-label", FALLBACK.closeLabel);
    submit.setAttribute("aria-label", FALLBACK.sendLabel);
    drawer.setAttribute("aria-label", FALLBACK.drawerTitle);
  };

  const applyWelcomeCopy = (p: WelcomePayload): void => {
    bubbleLabel.textContent = p.bubbleLabel ?? FALLBACK.bubbleLabel;
    const title = p.drawerTitle ?? FALLBACK.drawerTitle;
    drawerTitle.textContent = title;
    drawerSub.textContent = p.drawerSubtitle ?? FALLBACK.drawerSubtitle;
    input.placeholder = p.inputPlaceholder ?? FALLBACK.inputPlaceholder;
    input.setAttribute("aria-label", p.inputLabel ?? FALLBACK.inputLabel);
    closeBtn.setAttribute("aria-label", p.closeLabel ?? FALLBACK.closeLabel);
    submit.setAttribute("aria-label", p.sendLabel ?? FALLBACK.sendLabel);
    drawer.setAttribute("aria-label", title);
  };

  const setStatus = (state: "checking" | "online" | "offline", label: string): void => {
    statusDot.classList.remove(
      "agent-chat-bubble-dot--checking",
      "agent-chat-bubble-dot--online",
      "agent-chat-bubble-dot--offline",
    );
    statusDot.classList.add(`agent-chat-bubble-dot--${state}`);
    statusLabel.textContent = label;
  };

  const actorLabel = (role: MsgRole): string => {
    if (welcome) return welcome.actorLabels[role];
    return role === "user" ? FALLBACK.actorUser : FALLBACK.actorAssistant;
  };

  const appendMessage = (role: MsgRole, text: string): HTMLElement => {
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
    messages.scrollTo({ top: messages.scrollHeight, behavior: "smooth" });
    return el;
  };

  const renderWelcome = (payload: WelcomePayload): void => {
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

    msgState.set(wrap, { plainText: "", body: greetingP });

    messages.appendChild(wrap);
    messages.scrollTo({ top: messages.scrollHeight, behavior: "smooth" });

    const streamer = makeStreamer(wrap, msgState, messages);
    void streamGreet(
      agentUrl,
      sessionId,
      streamer,
      "Hi — ask me anything about Thirumoorthy's work or how to get in touch.",
    ).finally(() => wrap.classList.remove("agent-chat-msg--streaming"));
  };

  const sendMessage = async (text: string): Promise<void> => {
    appendMessage("user", text);
    const out = appendMessage("assistant", "");
    out.classList.add("agent-chat-msg--streaming");
    submit.disabled = true;
    input.disabled = true;
    const streamer = makeStreamer(out, msgState, messages);

    try {
      await streamChat(agentUrl, sessionId, text, {
        onDelta: (d) => streamer.push(d),
        onError: (e) => {
          streamer.push(`\n[${e}]`);
          out.classList.add("agent-chat-msg--error");
        },
        onHttpFailure: (status, body) => {
          const state = msgState.get(out)!;
          const msg =
            (body && typeof body === "object" && "message" in body && typeof body.message === "string"
              ? body.message
              : null) ?? `Request failed (${status}).`;
          state.plainText = msg;
          state.body.innerHTML = renderMarkdown(state.plainText);
          out.classList.add("agent-chat-msg--error");
        },
      });
    } catch (err) {
      const isOffline =
        !navigator.onLine ||
        (err instanceof TypeError && /fetch|network/i.test(err.message));
      const fallback = isOffline
        ? welcome?.offlineMessage ?? FALLBACK.offlineMessage
        : welcome?.errorMessage ?? FALLBACK.errorMessage;
      streamer.push(fallback);
      out.classList.add("agent-chat-msg--error");
    } finally {
      await streamer.flush();
      out.classList.remove("agent-chat-msg--streaming");
      submit.disabled = false;
      input.disabled = false;
      input.focus();
    }
  };

  type VK = { overlaysContent: boolean };
  const vk = (navigator as unknown as { virtualKeyboard?: VK }).virtualKeyboard;
  const useVK = vk != null;
  const vv = window.visualViewport;
  let vvRaf = 0;
  const updateKbOffset = (): void => {
    if (!vv) return;
    cancelAnimationFrame(vvRaf);
    vvRaf = requestAnimationFrame(() => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--kb-offset", `${offset}px`);
      messages.scrollTo({ top: messages.scrollHeight, behavior: "smooth" });
    });
  };

  const toggleDrawer = async (open: boolean): Promise<void> => {
    drawer.hidden = !open;
    bubble.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("agent-chat-open", open);
    if (useVK) vk!.overlaysContent = open;
    if (open && vv) {
      vv.addEventListener("resize", updateKbOffset);
      vv.addEventListener("scroll", updateKbOffset);
      updateKbOffset();
    } else if (vv) {
      vv.removeEventListener("resize", updateKbOffset);
      vv.removeEventListener("scroll", updateKbOffset);
      document.documentElement.style.setProperty("--kb-offset", "0px");
    }
    if (!open) return;
    input.focus();
    if (messages.childElementCount > 0) return;
    const pendingNode = appendMessage("assistant", "…");
    const data = welcome ?? (await welcomePending);
    pendingNode.remove();
    if (data) {
      renderWelcome(data);
    } else {
      appendMessage("assistant", "Chat is currently unavailable.");
    }
  };

  applyFallbackCopy();
  void welcomePending.then((p) => {
    if (p) {
      welcome = p;
      applyWelcomeCopy(p);
      setStatus("online", `${p.agentName} is online`);
    } else {
      setStatus("offline", "Agent is offline");
    }
  });

  const MAX_INPUT_HEIGHT = 150;
  const autoGrow = (): void => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, MAX_INPUT_HEIGHT) + "px";
  };
  input.addEventListener("input", autoGrow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  bubble.addEventListener("click", () => void toggleDrawer(!!drawer.hidden));
  closeBtn.addEventListener("click", () => void toggleDrawer(false));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    input.style.height = "auto";
    void sendMessage(text);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.hidden) void toggleDrawer(false);
  });
}
