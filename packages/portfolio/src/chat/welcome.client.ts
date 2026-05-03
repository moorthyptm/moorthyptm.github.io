import type { WelcomePayload } from "./models/welcome.model.js";

export function fetchWelcome(agentUrl: string): Promise<WelcomePayload | null> {
  return (async () => {
    try {
      const res = await fetch(`${agentUrl}/chat/welcome`, { cache: "default" });
      if (!res.ok) return null;
      return (await res.json()) as WelcomePayload;
    } catch {
      return null;
    }
  })();
}
