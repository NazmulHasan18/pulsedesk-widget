export type SenderRole = "visitor" | "agent" | "ai";

export interface ChatMessage {
  id: string;
  role: SenderRole;
  text: string;
  createdAt: number;
}

export type PresenceStatus = "agent-online" | "ai-only" | "connecting" | "offline";

export interface WidgetConfig {
  siteId: string;
  userId: string;
  companyId: string;
  companyName: string;
  brandColor: string;
  welcomeMessage: string;
  socketUrl: string;
}

export interface WidgetState {
  open: boolean;
  presence: PresenceStatus;
  messages: ChatMessage[];
  visitorTyping: boolean;
  remoteTyping: boolean;
  unread: number;
}

/**
 * Transport contract the widget talks to. Implemented today by
 * mock-connection.ts (scripted/simulated). Swap for a real Socket.io
 * implementation in real-connection.ts once the backend (§6.3 of
 * HANDOFF.md — realtime layer) exists. The widget's UI code never needs
 * to change when that swap happens.
 */
export interface Connection {
  connect: () => void;
  disconnect: () => void;
  sendMessage: (text: string) => void;
  setVisitorTyping: (isTyping: boolean) => void;
  onPresence: (cb: (status: PresenceStatus) => void) => void;
  onMessage: (cb: (msg: ChatMessage) => void) => void;
  onRemoteTyping: (cb: (isTyping: boolean) => void) => void;
}
