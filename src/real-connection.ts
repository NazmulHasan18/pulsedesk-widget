import { io, type Socket } from "socket.io-client";
import { ApiError, type ApiMessage, type WidgetApi } from "./api";
import type { ChatMessage, Connection, ConnectionSnapshot, SenderRole, WidgetConfig } from "./types";

interface Options {
  api: WidgetApi;
  socketBase: string;
  config: WidgetConfig;
}

const ROLE: Record<ApiMessage["senderType"], SenderRole> = { CUSTOMER: "visitor", AGENT: "agent", AI: "ai" };

// crypto.randomUUID needs a secure context; customer sites may be plain http.
const uuid = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

const toChatMessage = (m: ApiMessage): ChatMessage => ({
  id: m.id,
  clientMessageId: m.clientMessageId ?? undefined,
  role: ROLE[m.senderType],
  text: m.content,
  createdAt: new Date(m.createdAt).getTime(),
  status: "sent",
  unread: m.senderType !== "CUSTOMER" && !m.readByCustomerAt,
});

// The other side stops sending typing updates without saying so if they
// close the tab, so typing expires on its own.
const REMOTE_TYPING_TIMEOUT_MS = 6000;
const TYPING_REFRESH_MS = 2500;
const AUTH_RETRY_MS = 5000;

/**
 * Load order:
 *   config (done by widget.ts) -> session (visitor key in localStorage)
 *   -> active conversation + history -> socket.
 * First-time visitors get a session only when they open the chat, so page
 * views alone never create customers.
 */
export function createRealConnection({ api, socketBase, config }: Options): Connection {
  let snapshot: ConnectionSnapshot = {
    status: "idle",
    agentsOnline: config.agentsOnline,
    agentName: null,
    messages: [],
    remoteTyping: false,
  };
  const listeners: ((s: ConnectionSnapshot) => void)[] = [];

  let socket: Socket | null = null;
  let conversationId: string | null = null;
  let conversationPromise: Promise<string> | null = null;
  let booting: Promise<void> | null = null;
  let stopped = false;
  let remoteTypingTimer: ReturnType<typeof setTimeout> | undefined;
  let lastTypingSent = { isTyping: false, at: 0 };

  const update = (patch: Partial<ConnectionSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((cb) => cb(snapshot));
  };

  // ---- messages ------------------------------------------------------------

  // Adds or replaces by server id or clientMessageId, keeping time order.
  const upsertMessages = (incoming: ChatMessage[]) => {
    const messages = [...snapshot.messages];
    for (const msg of incoming) {
      const index = messages.findIndex(
        (m) => m.id === msg.id || (msg.clientMessageId && m.clientMessageId === msg.clientMessageId),
      );
      if (index >= 0) messages[index] = { ...msg, unread: messages[index].unread && msg.unread };
      else messages.push(msg);
    }
    messages.sort((a, b) => a.createdAt - b.createdAt);
    update({ messages });
  };

  const patchMessage = (id: string, patch: Partial<ChatMessage>) =>
    update({ messages: snapshot.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) });

  const lastServerMessageId = () => {
    for (let i = snapshot.messages.length - 1; i >= 0; i--) {
      if (snapshot.messages[i].status === "sent") return snapshot.messages[i].id;
    }
    return null;
  };

  // ---- conversation ----------------------------------------------------------

  const joinConversation = () => {
    if (socket?.connected && conversationId) socket.emit("conversation:join", conversationId);
  };

  const loadActiveConversation = async () => {
    const active = await api.getActiveConversation();
    if (!active) return;
    conversationId = active.publicId;
    update({ agentName: active.agent?.name ?? null });
    joinConversation();
    upsertMessages((await api.getMessages(active.publicId)).map(toChatMessage));
  };

  // Conversations are created on the first message, not on page view.
  const ensureConversation = (): Promise<string> => {
    if (conversationId) return Promise.resolve(conversationId);
    conversationPromise ??= api
      .openConversation()
      .then((conversation) => {
        conversationId = conversation.publicId;
        update({ agentName: conversation.agent?.name ?? null });
        joinConversation();
        return conversation.publicId;
      })
      .finally(() => {
        conversationPromise = null;
      });
    return conversationPromise;
  };

  const catchUp = async () => {
    if (!conversationId) return;
    const after = lastServerMessageId();
    const missed = after ? await api.getMessagesAfter(conversationId, after) : await api.getMessages(conversationId);
    upsertMessages(missed.map(toChatMessage));
  };

  // ---- socket ----------------------------------------------------------------

  const connectSocket = () => {
    if (socket || stopped) return;
    let hasConnected = false;

    socket = io(socketBase, {
      path: "/realtime/socket.io",
      transports: ["websocket", "polling"],
      // Called on every (re)connect, so a renewed session token is picked up.
      auth: (cb) => cb({ widgetToken: api.getToken() }),
    });

    socket.on("connect", () => {
      update({ status: "online" });
      joinConversation();
      if (hasConnected) catchUp().catch(() => undefined);
      hasConnected = true;
    });

    socket.on("disconnect", () => {
      if (!stopped) update({ status: "reconnecting", remoteTyping: false });
    });

    // Rejected by the server (e.g. the session token expired): Socket.io does
    // not retry those on its own. Renew the session, then reconnect.
    socket.on("connect_error", () => {
      if (stopped || socket?.active) return;
      update({ status: "reconnecting" });
      setTimeout(() => {
        api
          .startSession()
          .then(() => socket?.connect())
          .catch(() => update({ status: "error" }));
      }, AUTH_RETRY_MS);
    });

    socket.on("message:created", (payload: { conversationId: string; message: ApiMessage }) => {
      if (payload.conversationId !== conversationId) return;
      if (payload.message.senderType !== "CUSTOMER") {
        clearTimeout(remoteTypingTimer);
        update({ remoteTyping: false });
      }
      upsertMessages([toChatMessage(payload.message)]);
    });

    socket.on("agent:typing", (payload: { conversationId: string; isTyping: boolean }) => {
      if (payload.conversationId !== conversationId) return;
      clearTimeout(remoteTypingTimer);
      update({ remoteTyping: payload.isTyping });
      if (payload.isTyping) {
        remoteTypingTimer = setTimeout(() => update({ remoteTyping: false }), REMOTE_TYPING_TIMEOUT_MS);
      }
    });

    const onAssignment = (payload: { conversationId: string; agent: { name: string } | null }) => {
      if (payload.conversationId === conversationId) update({ agentName: payload.agent?.name ?? null });
    };
    socket.on("conversation:assigned", onAssignment);
    socket.on("conversation:unassigned", onAssignment);

    socket.on("widget:availability", (payload: { agentsOnline: boolean }) => {
      update({ agentsOnline: payload.agentsOnline });
    });
  };

  // Session -> conversation/history -> socket. Safe to call repeatedly.
  const boot = (createVisitor: boolean): Promise<void> => {
    if (api.hasSession() || (!createVisitor && !api.hasStoredVisitor())) return Promise.resolve();
    booting ??= (async () => {
      update({ status: "connecting" });
      try {
        await api.startSession();
        await loadActiveConversation();
        connectSocket();
      } catch (err) {
        update({ status: "error" });
        throw err;
      } finally {
        booting = null;
      }
    })();
    return booting;
  };

  // ---- sending -----------------------------------------------------------------

  const deliver = async (local: ChatMessage) => {
    try {
      await boot(true);
      const id = await ensureConversation();
      const saved = await api.sendMessage(id, local.text, local.clientMessageId!);
      // Replace the local copy (the socket echo may already have done it).
      update({ messages: snapshot.messages.filter((m) => m.id !== local.id) });
      upsertMessages([toChatMessage(saved)]);
    } catch (err) {
      patchMessage(local.id, { status: "failed" });
      if (err instanceof ApiError && err.status === 403) update({ status: "error" });
    }
  };

  const sendMessage = (text: string) => {
    const local: ChatMessage = {
      id: `local-${uuid()}`,
      clientMessageId: uuid(),
      role: "visitor",
      text,
      createdAt: Date.now(),
      status: "sending",
      unread: false,
    };
    upsertMessages([local]);
    void deliver(local);
  };

  const retry = (messageId: string) => {
    const message = snapshot.messages.find((m) => m.id === messageId && m.status === "failed");
    if (!message) return;
    patchMessage(messageId, { status: "sending" });
    // Same clientMessageId: if the first attempt did reach the server, this
    // returns that message instead of saving it twice.
    void deliver({ ...message, status: "sending" });
  };

  const setVisitorTyping = (isTyping: boolean) => {
    if (!socket?.connected || !conversationId) return;
    const now = Date.now();
    if (isTyping === lastTypingSent.isTyping && (!isTyping || now - lastTypingSent.at < TYPING_REFRESH_MS)) return;
    lastTypingSent = { isTyping, at: now };
    socket.emit("typing", { conversationId, isTyping });
  };

  const markRead = () => {
    if (!conversationId || !snapshot.messages.some((m) => m.unread)) return;
    update({ messages: snapshot.messages.map((m) => (m.unread ? { ...m, unread: false } : m)) });
    api.markRead(conversationId).catch(() => undefined);
  };

  return {
    start: () => {
      boot(false).catch(() => undefined);
    },
    activate: () => {
      boot(true).catch(() => undefined);
    },
    sendMessage,
    retry,
    setVisitorTyping,
    markRead,
    subscribe: (cb) => {
      listeners.push(cb);
      cb(snapshot);
    },
    stop: () => {
      stopped = true;
      clearTimeout(remoteTypingTimer);
      socket?.disconnect();
      socket = null;
    },
  };
}
