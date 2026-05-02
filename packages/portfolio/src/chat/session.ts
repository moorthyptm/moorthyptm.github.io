// Session id pinned to the tab via sessionStorage so multi-turn memory
// survives reloads but doesn't bleed across tabs.

const STORAGE_KEY = "moorthyptm-chat-session";

export function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(STORAGE_KEY);
  if (id) return id;
  id =
    (crypto.randomUUID && crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(STORAGE_KEY, id);
  return id;
}
