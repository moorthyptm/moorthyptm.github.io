// SSE clients for /chat/stream. Keeps fetch+frame parsing in one place so
// widget.ts doesn't have to know about server-sent-events framing.

import type { Streamer } from "./streamer.js";

export interface StreamHandlers {
  onDelta?: (delta: string) => void;
  onError?: (msg: string) => void;
  onDone?: () => void;
  onHttpFailure?: (status: number, body: unknown) => void;
}

interface FramePayload {
  delta?: string;
  error?: string;
  done?: boolean;
}

async function readSseFrames(
  res: Response,
  handlers: StreamHandlers,
): Promise<void> {
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
      let payload: FramePayload;
      try {
        payload = JSON.parse(line);
      } catch {
        continue;
      }
      if (typeof payload.delta === "string") handlers.onDelta?.(payload.delta);
      else if (typeof payload.error === "string") handlers.onError?.(payload.error);
      else if (payload.done) handlers.onDone?.();
    }
  }
}

/** Stream a chat turn. Resolves on stream-end; rejects on network error. */
export async function streamChat(
  agentUrl: string,
  sessionId: string,
  text: string,
  handlers: StreamHandlers,
): Promise<void> {
  const res = await fetch(`${agentUrl}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": sessionId,
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    handlers.onHttpFailure?.(res.status, body);
    return;
  }
  await readSseFrames(res, handlers);
}

/** Hidden first-turn greet. Pushes deltas into a streamer; never throws. */
export async function streamGreet(
  agentUrl: string,
  sessionId: string,
  streamer: Streamer,
  fallback: string,
): Promise<void> {
  try {
    await streamChat(agentUrl, sessionId, "role:greet", {
      onDelta: (d) => streamer.push(d),
    });
  } catch {
    streamer.push(fallback);
  } finally {
    await streamer.flush();
  }
}
