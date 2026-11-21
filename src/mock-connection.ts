import type { ChatMessage, Connection, ConnectionSnapshot, WidgetConfig } from "./types";

/**
 * Offline demo transport: no backend, scripted replies. Used only when the
 * script tag has data-demo="true" (see widget.ts). Real sites use
 * real-connection.ts.
 */
export function createMockConnection(config: WidgetConfig): Connection {
  let snapshot: ConnectionSnapshot = {
    status: "idle",
    agentsOnline: config.agentsOnline,
    agentName: null,
    messages: [],
    remoteTyping: false,
  };
  const listeners: ((s: ConnectionSnapshot) => void)[] = [];
  let timers: ReturnType<typeof setTimeout>[] = [];

  const update = (patch: Partial<ConnectionSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((cb) => cb(snapshot));
  };

  const schedule = (fn: () => void, delayMs: number) => {
    timers.push(setTimeout(fn, delayMs));
  };

  const add = (msg: Omit<ChatMessage, "id" | "createdAt" | "status">) =>
    update({
      messages: [
        ...snapshot.messages,
        { ...msg, id: `mock-${Math.random().toString(36).slice(2)}`, createdAt: Date.now(), status: "sent" },
      ],
    });

  const activate = () => {
    if (snapshot.status !== "idle") return;
    update({ status: "connecting" });
    schedule(() => update({ status: "online", agentsOnline: Math.random() > 0.5 }), 500);
  };

  const sendMessage = (text: string) => {
    add({ role: "visitor", text, unread: false });
    update({ remoteTyping: true });
    schedule(
      () => {
        update({ remoteTyping: false });
        add({ role: "ai", text: mockReply(text, config.displayName), unread: true });
      },
      900 + Math.min(text.length * 20, 1800),
    );
  };

  return {
    start: () => undefined,
    activate,
    sendMessage,
    retry: () => undefined,
    setVisitorTyping: () => undefined,
    markRead: () => update({ messages: snapshot.messages.map((m) => ({ ...m, unread: false })) }),
    subscribe: (cb) => {
      listeners.push(cb);
      cb(snapshot);
    },
    stop: () => {
      timers.forEach(clearTimeout);
      timers = [];
    },
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
