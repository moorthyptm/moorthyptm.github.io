import { initChat } from "./widget.js";

const AGENT_URL =
  document
    .querySelector<HTMLMetaElement>('meta[name="a2a-agent-endpoint"]')
    ?.content?.trim() || "";

if (AGENT_URL) {
  initChat(AGENT_URL);
}
