// Mirrors agent's welcome.service.ts contract. Update both sides together.

export interface WelcomePayload {
  agentName: string;
  bubbleLabel: string;
  drawerTitle: string;
  drawerSubtitle: string;
  inputPlaceholder: string;
  inputLabel: string;
  closeLabel: string;
  sendLabel: string;
  actorLabels: { user: string; assistant: string };
  offlineMessage: string;
  errorMessage: string;
}
