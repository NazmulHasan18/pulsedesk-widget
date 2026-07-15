import type { ChatMessage, Connection, PresenceStatus, WidgetConfig } from "./types";

/**
 * MOCK transport — stands in for the real Socket.io connection described
 * in HANDOFF.md §6.3 (realtime layer, not yet built) and §6.4 (RAG /
 * Groq generation, not yet built).
 *
 * Functional factory pattern (closures over listeners + a fake queue),
 * matching the project's preference for functional over class-based code.
 *
 * Swap: create real-connection.ts implementing the same `Connection`
 * shape using socket.io-client, scoped by config.siteId -> companyId,
 * and swap the import in widget.ts. No other file needs to change.
 */
export function createMockConnection(config: WidgetConfig): Connection {
  let presenceListeners: ((status: PresenceStatus) => void)[] = [];
  let messageListeners: ((msg: ChatMessage) => void)[] = [];
  let typingListeners: ((isTyping: boolean) => void)[] = [];
  let timers: ReturnType<typeof setTimeout>[] = [];

  const emitPresence = (status: PresenceStatus) => {
    presenceListeners.forEach((cb) => cb(status));
  };

  const emitMessage = (msg: ChatMessage) => {
    messageListeners.forEach((cb) => cb(msg));
  };

  const emitTyping = (isTyping: boolean) => {
    typingListeners.forEach((cb) => cb(isTyping));
  };

  const schedule = (fn: () => void, delayMs: number) => {
    const t = setTimeout(fn, delayMs);
    timers.push(t);
    return t;
  };

  const connect = () => {
    emitPresence("connecting");
    // Simulates: POST /api/widget/session { siteId } -> { companyId, agentsOnline }
    schedule(() => {
      const agentOnline = Math.random() > 0.5;
      emitPresence(agentOnline ? "agent-online" : "ai-only");
      emitMessage({
        id: crypto.randomUUID(),
        role: "ai",
        text: config.welcomeMessage,
        createdAt: Date.now(),
      });
    }, 500);
  };

  const disconnect = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  const sendMessage = (text: string) => {
    emitMessage({
      id: crypto.randomUUID(),
      role: "visitor",
      text,
      createdAt: Date.now(),
    });

    // Simulates: server routes to a claimed agent, or falls back to the
    // AI (pgvector similarity search over FaqDoc -> Groq generation).
    emitTyping(true);
    const replyDelay = 900 + Math.min(text.length * 20, 1800);
    schedule(() => {
      emitTyping(false);
      emitMessage({
        id: crypto.randomUUID(),
        role: "ai",
        text: mockReply(text, config.companyName),
        createdAt: Date.now(),
      });
    }, replyDelay);
  };

  const setVisitorTyping = (_isTyping: boolean) => {
    // No-op for the mock — a real transport would emit a "typing" event
    // over the socket so an agent's inbox can show it live.
  };

  return {
    connect,
    disconnect,
    sendMessage,
    setVisitorTyping,
    onPresence: (cb) => presenceListeners.push(cb),
    onMessage: (cb) => messageListeners.push(cb),
    onRemoteTyping: (cb) => typingListeners.push(cb),
  };
}

function mockReply(userText: string, companyName: string): string {
  const lower = userText.toLowerCase();
  if (lower.includes("price") || lower.includes("cost")) {
    return `${companyName} has a free tier plus usage-based pricing for higher volume — want me to pull up the details?`;
  }
  if (lower.includes("human") || lower.includes("agent") || lower.includes("person")) {
    return "I can loop in a teammate for you — they'll join this chat as soon as one's free.";
  }
  return "Thanks for the message! I've noted this — a teammate or I will follow up with more detail shortly.";
}
