import type { WidgetConfig } from "./types";

// Shapes returned by the PulseDesk widget API (see backend widget module).
export interface ApiMessage {
  id: string;
  clientMessageId: string | null;
  senderType: "CUSTOMER" | "AGENT" | "AI";
  content: string;
  createdAt: string;
  readByCustomerAt: string | null;
}

export interface ApiConversation {
  publicId: string;
  status: string;
  agent: { name: string } | null;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: { hasNextPage: boolean; nextCursor: string | null };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const request = async <T>(url: string, init: RequestInit = {}, token?: string): Promise<Envelope<T>> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-widget-session-token": token } : {}),
    },
  });
  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !body) {
    throw new ApiError(response.status, body?.message ?? `Request failed (${response.status})`);
  }
  return body;
};

// The visitor key identifies a returning visitor. Storage can be blocked
// (privacy modes, sandboxed iframes) - the chat then works for this page view only.
const storageKey = (siteId: string) => `pulsedesk:${siteId}:visitorKey`;

export const visitorKeyStore = {
  get: (siteId: string): string | null => {
    try {
      return localStorage.getItem(storageKey(siteId));
    } catch {
      return null;
    }
  },
  set: (siteId: string, key: string) => {
    try {
      localStorage.setItem(storageKey(siteId), key);
    } catch {
      // ignore
    }
  },
};

export const createWidgetApi = (apiBase: string, siteId: string) => {
  let token: string | null = null;
  let sessionPromise: Promise<string> | null = null;

  // Creates or restores the visitor session. Concurrent callers share one request.
  const startSession = (): Promise<string> => {
    sessionPromise ??= (async () => {
      try {
        const visitorKey = visitorKeyStore.get(siteId);
        const { data } = await request<{ sessionToken: string; visitorKey: string }>(`${apiBase}/widget/sessions`, {
          method: "POST",
          body: JSON.stringify({ siteId, ...(visitorKey ? { visitorKey } : {}) }),
        });
        visitorKeyStore.set(siteId, data!.visitorKey);
        token = data!.sessionToken;
        return token;
      } finally {
        sessionPromise = null;
      }
    })();
    return sessionPromise;
  };

  // Authenticated call; an expired session is renewed once from the visitor key.
  const authed = async <T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> => {
    const current = token ?? (await startSession());
    try {
      return await request<T>(`${apiBase}${path}`, init, current);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return request<T>(`${apiBase}${path}`, init, await startSession());
      }
      throw err;
    }
  };

  const messagesPath = (conversationId: string) => `/widget/conversations/${encodeURIComponent(conversationId)}/messages`;

  return {
    hasStoredVisitor: () => visitorKeyStore.get(siteId) !== null,
    hasSession: () => token !== null,
    getToken: () => token,
    startSession,

    getConfig: async () =>
      (await request<WidgetConfig>(`${apiBase}/widget/config?siteId=${encodeURIComponent(siteId)}`)).data!,

    getActiveConversation: async () => (await authed<ApiConversation>("/widget/conversations/active")).data ?? null,

    openConversation: async () => (await authed<ApiConversation>("/widget/conversations", { method: "POST" })).data!,

    // Latest page of history, oldest first.
    getMessages: async (conversationId: string) =>
      (await authed<ApiMessage[]>(`${messagesPath(conversationId)}?limit=50`)).data ?? [],

    // Everything after `afterId`, following pages until caught up.
    getMessagesAfter: async (conversationId: string, afterId: string) => {
      const all: ApiMessage[] = [];
      let cursor = afterId;
      for (let page = 0; page < 20; page++) {
        const res = await authed<ApiMessage[]>(`${messagesPath(conversationId)}?after=${cursor}&limit=100`);
        const data = res.data ?? [];
        all.push(...data);
        if (!res.meta?.hasNextPage || data.length === 0) break;
        cursor = data[data.length - 1].id;
      }
      return all;
    },

    sendMessage: async (conversationId: string, content: string, clientMessageId: string) =>
      (
        await authed<ApiMessage>(messagesPath(conversationId), {
          method: "POST",
          body: JSON.stringify({ content, clientMessageId }),
        })
      ).data!,

    markRead: async (conversationId: string) => {
      await authed(`${messagesPath(conversationId)}/read`, { method: "PATCH" });
    },
  };
};

export type WidgetApi = ReturnType<typeof createWidgetApi>;
