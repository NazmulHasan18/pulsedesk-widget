export type SenderRole = "visitor" | "agent" | "ai";

export type MessageStatus = "sending" | "sent" | "failed";

export interface ChatMessage {
  // Server id once saved; a local id while sending or after a failure.
  id: string;
  // Sent with the message so a retry can never create a duplicate.
  clientMessageId?: string;
  role: SenderRole;
  text: string;
  createdAt: number;
  status: MessageStatus;
  // From the agent/AI and not yet read by the visitor.
  unread: boolean;
}

// Public settings from GET /widget/config.
export interface WidgetConfig {
  siteId: string;
  displayName: string;
  welcomeMessage: string;
  primaryColor: string;
  secondaryColor: string;
  widgetEnabled: boolean;
  agentsOnline: boolean;
}

// idle: no visitor session yet (first-time visitor who hasn't opened the chat).
export type ConnectionStatus = "idle" | "connecting" | "online" | "reconnecting" | "error";

export interface ConnectionSnapshot {
  status: ConnectionStatus;
  agentsOnline: boolean;
  // Name of the agent handling this visitor's conversation, if any.
  agentName: string | null;
  messages: ChatMessage[];
  remoteTyping: boolean;
}

/**
 * Transport contract the widget UI talks to. Implemented by
 * real-connection.ts (PulseDesk API + Socket.io) and mock-connection.ts
 * (offline demo). The UI only renders snapshots and calls these methods.
 */
export interface Connection {
  // Page load: restores a returning visitor. Never creates a new visitor.
  start: () => void;
  // Chat opened: creates the visitor session if there isn't one yet.
  activate: () => void;
  sendMessage: (text: string) => void;
  retry: (messageId: string) => void;
  setVisitorTyping: (isTyping: boolean) => void;
  markRead: () => void;
  subscribe: (listener: (snapshot: ConnectionSnapshot) => void) => void;
  stop: () => void;
}
