import { CSS } from "./styles";
import { createMockConnection } from "./mock-connection";
import type { ChatMessage, Connection, PresenceStatus, WidgetConfig, WidgetState } from "./types";

/**
 * PulseDesk embeddable widget.
 *
 * Usage (see demo/index.html):
 *   <script src="https://cdn.pulsedesk.io/widget.js" data-site-id="site_abc123" async></script>
 *
 * Design notes:
 * - Functional composition throughout (factories + closures), no classes,
 *   matching the project's stated preference for functional over
 *   class-based patterns.
 * - Renders into a closed-ish Shadow DOM so host-page CSS can never bleed
 *   in or out. `:host` carries all design tokens (see styles.ts).
 * - Talks to a `Connection` (types.ts). Today that's createMockConnection;
 *   swap to a real socket.io-client implementation once the realtime
 *   backend (HANDOFF.md §6.3) exists — nothing in this file changes
 *   except the import.
 * - Config resolution (site-id -> companyId, branding, welcome message)
 *   is mocked below in resolveConfig(). Replace with a real
 *   `fetch(\`${API_BASE}/api/widget/config?siteId=...\`)` once
 *   the Company model / widget config endpoint exists.
 */

const API_BASE = "https://api.pulsedesk.io"; // placeholder — not live yet
const SOCKET_BASE = "wss://realtime.pulsedesk.io"; // placeholder — not live yet

function getSiteId(): string | null {
  const current = document.currentScript as HTMLScriptElement | null;
  const fromCurrent = current?.getAttribute("data-site-id");
  if (fromCurrent) return fromCurrent;
  // Fallback for environments where currentScript isn't reliable
  // (e.g. dynamically injected/async loaders).
  const fallback = document.querySelector<HTMLScriptElement>("script[data-site-id]");
  return fallback?.getAttribute("data-site-id") ?? null;
}
function getUserId(): string | null {
  const current = document.currentScript as HTMLScriptElement | null;
  const fromCurrent = current?.getAttribute("data-site-user-id");
  if (fromCurrent) return fromCurrent;
  // Fallback for environments where currentScript isn't reliable
  // (e.g. dynamically injected/async loaders).
  const fallback = document.querySelector<HTMLScriptElement>("script[data-site-user-id]");
  return fallback?.getAttribute("data-site-user-id") ?? null;
}

/**
 * MOCK config resolution. Real version: single fetch to the Company
 * table by siteId, returning companyId + branding + welcome copy.
 */
function resolveConfig(siteId: string, userId: string): WidgetConfig {
  return {
    siteId,
    userId,
    companyId: `company_${siteId}`,
    companyName: "PulseDesk Demo Co.",
    brandColor: "#4B4FE0",
    welcomeMessage: "Hi! 👋 Ask me anything — I'll get you to a human if needed.",
    socketUrl: `${SOCKET_BASE}/?siteId=${siteId}`,
  };
}

function createInitialState(): WidgetState {
  return {
    open: false,
    presence: "connecting",
    messages: [],
    visitorTyping: false,
    remoteTyping: false,
    unread: 0,
  };
}

function svgChatIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 12C4 7.58 7.58 4 12 4s8 3.58 8 8-3.58 8-8 8c-1.13 0-2.2-.23-3.18-.66L4 20l1.02-4.06A7.94 7.94 0 0 1 4 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function svgSendIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 12.5 20 4l-6.5 17-2.5-7-7-1.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
  </svg>`;
}

function svgCloseIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
}

function presencePill(status: PresenceStatus): string {
  if (status === "agent-online") {
    return `<span class="pill agent"><span class="pill-dot"></span>Agent online</span>`;
  }
  if (status === "ai-only") {
    return `<span class="pill ai"><span class="pill-dot"></span>AI assistant</span>`;
  }
  if (status === "connecting") {
    return `<span class="pill connecting"><span class="pill-dot"></span>Connecting…</span>`;
  }
  return `<span class="pill connecting"><span class="pill-dot"></span>Offline</span>`;
}

function senderLabel(msg: ChatMessage): string {
  if (msg.role === "agent") return "Agent";
  if (msg.role === "ai") return "AI Assistant";
  return "";
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Builds the widget DOM once and returns a `render(state)` function that
 * does targeted updates. Keeps this framework-free without diffing the
 * whole tree on every keystroke.
 */
function mountWidget(root: ShadowRoot, config: WidgetConfig, connection: Connection) {
  let state = createInitialState();

  const style = document.createElement("style");
  style.textContent = CSS;
  root.appendChild(style);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <button class="launcher" type="button" aria-label="Open chat" aria-expanded="false">
      ${svgChatIcon()}
      <span class="badge" hidden></span>
    </button>
    <div class="panel" role="dialog" aria-label="${escapeHtml(config.companyName)} chat">
      <div class="header">
        <div class="header-info">
          <span class="company-name">${escapeHtml(config.companyName)}</span>
          <span class="presence-pill"></span>
        </div>
        <button class="close-btn" type="button" aria-label="Close chat">${svgCloseIcon()}</button>
      </div>
      <div class="messages" aria-live="polite"></div>
      <div class="composer">
        <textarea rows="1" placeholder="Type a message…" aria-label="Message"></textarea>
        <button class="send-btn" type="button" aria-label="Send message" disabled>${svgSendIcon()}</button>
      </div>
      <div class="footer-note">Powered by PulseDesk</div>
    </div>
  `;
  root.appendChild(wrapper);

  const launcher = wrapper.querySelector<HTMLButtonElement>(".launcher")!;
  const badge = wrapper.querySelector<HTMLSpanElement>(".badge")!;
  const panel = wrapper.querySelector<HTMLDivElement>(".panel")!;
  const presencePillEl = wrapper.querySelector<HTMLSpanElement>(".presence-pill")!;
  const closeBtn = wrapper.querySelector<HTMLButtonElement>(".close-btn")!;
  const messagesEl = wrapper.querySelector<HTMLDivElement>(".messages")!;
  const textarea = wrapper.querySelector<HTMLTextAreaElement>("textarea")!;
  const sendBtn = wrapper.querySelector<HTMLButtonElement>(".send-btn")!;

  function setState(patch: Partial<WidgetState>) {
    state = { ...state, ...patch };
    render();
  }

  function renderMessages() {
    const wasNearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 60;

    messagesEl.innerHTML = state.messages
      .map((msg) => {
        const side = msg.role === "visitor" ? "visitor" : "other";
        const label = senderLabel(msg);
        return `
          <div class="row ${side}">
            ${label ? `<span class="sender-label">${label}</span>` : ""}
            <div class="bubble">${escapeHtml(msg.text)}</div>
          </div>
        `;
      })
      .join("");

    if (state.remoteTyping) {
      messagesEl.insertAdjacentHTML(
        "beforeend",
        `<div class="row other"><div class="typing-bubble" aria-label="Assistant is typing">
          <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
        </div></div>`,
      );
    }

    if (wasNearBottom || state.messages.length <= 1) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function render() {
    panel.classList.toggle("open", state.open);
    launcher.setAttribute("aria-expanded", String(state.open));
    presencePillEl.innerHTML = presencePill(state.presence);

    badge.hidden = state.unread === 0 || state.open;
    badge.textContent = String(state.unread);

    sendBtn.disabled = textarea.value.trim().length === 0;

    renderMessages();
  }

  function toggleOpen(nextOpen: boolean) {
    setState({ open: nextOpen, unread: nextOpen ? 0 : state.unread });
    if (nextOpen) {
      window.setTimeout(() => textarea.focus(), 50);
    }
  }

  launcher.addEventListener("click", () => toggleOpen(!state.open));
  closeBtn.addEventListener("click", () => toggleOpen(false));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.open) toggleOpen(false);
  });

  textarea.addEventListener("input", () => {
    sendBtn.disabled = textarea.value.trim().length === 0;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 88)}px`;
    connection.setVisitorTyping(textarea.value.length > 0);
  });

  function submit() {
    const text = textarea.value.trim();
    if (!text) return;
    connection.sendMessage(text);
    textarea.value = "";
    textarea.style.height = "auto";
    sendBtn.disabled = true;
    connection.setVisitorTyping(false);
  }

  sendBtn.addEventListener("click", submit);
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });

  connection.onPresence((status) => setState({ presence: status }));

  connection.onMessage((msg) => {
    const nextMessages = [...state.messages, msg];
    const incomingFromOther = msg.role !== "visitor";
    setState({
      messages: nextMessages,
      remoteTyping: false,
      unread: incomingFromOther && !state.open ? state.unread + 1 : state.unread,
    });
  });

  connection.onRemoteTyping((isTyping) => setState({ remoteTyping: isTyping }));

  render();
  connection.connect();
}

function init() {
  const siteId = getSiteId();
  if (!siteId) {
    console.error("[PulseDesk] Missing data-site-id on the widget <script> tag.");
    return;
  }
  const userId = getUserId();
  if (!userId) {
    console.error("[PulseDesk] Missing data-site-id on the widget <script> tag.");
    return;
  }

  const config = resolveConfig(siteId, userId);
  const connection: Connection = createMockConnection(config);

  const host = document.createElement("div");
  host.id = "pulsedesk-widget-root";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  mountWidget(shadow, config, connection);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
