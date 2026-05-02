// Mirrors agent's welcome.service.ts contract. Update both sides together.

export interface WelcomeChip {
  label: string;
  role: "recruiter" | "developer" | "other";
  description?: string;
}

export interface WelcomePayload {
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
