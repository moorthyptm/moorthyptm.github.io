// Entry point for the chat widget bundle. Reads the agent URL from a meta
// tag (empty = widget disabled, used during agent redeploys) and bootstraps
// the widget when present.

import { initChat } from "./widget.js";

const AGENT_URL =
  document
    .querySelector<HTMLMetaElement>('meta[name="a2a-agent-endpoint"]')
    ?.content?.trim() || "";

if (AGENT_URL) {
  initChat(AGENT_URL);
}
