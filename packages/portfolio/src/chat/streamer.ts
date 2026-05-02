// SSE often arrives as one chunk (upstream falls back to non-stream when
// tools are declared). Paint it char-by-char so the typing cursor stays honest.

import { renderMarkdown } from "./markdown.js";
import type { MsgState } from "./models/message.model.js";

export interface Streamer {
  push(s: string): void;
  flush(): Promise<void>;
}

export function makeStreamer(
  out: HTMLElement,
  msgState: WeakMap<HTMLElement, MsgState>,
  scrollHost: HTMLElement,
  charsPerFrame = 3,
): Streamer {
  let buffer = "";
  let draining = false;
  const drain = (): void => {
    const state = msgState.get(out)!;
    if (!buffer) {
      draining = false;
      return;
    }
    const chunk = buffer.slice(0, charsPerFrame);
    buffer = buffer.slice(charsPerFrame);
    state.plainText += chunk;
    state.body.innerHTML = renderMarkdown(state.plainText);
    scrollHost.scrollTop = scrollHost.scrollHeight;
    requestAnimationFrame(drain);
  };
  return {
    push(s) {
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
