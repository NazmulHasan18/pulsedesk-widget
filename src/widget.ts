import { CSS } from "./styles";
import { createWidgetApi } from "./api";
import { createRealConnection } from "./real-connection";
import { createMockConnection } from "./mock-connection";
import type { ChatMessage, Connection, ConnectionSnapshot, WidgetConfig } from "./types";

/**
 * PulseDesk embeddable widget.
 *
 *   <script src="https://<widget host>/widget.js" data-site-id="site_abc123" async></script>
 *
 * - Renders into a Shadow DOM so host-page CSS can never bleed in or out.
 * - Loads the company's public config, then talks to the PulseDesk API and
 *   Socket.io through real-connection.ts. data-demo="true" uses an offline
 *   mock instead (no backend needed).
 */

// Injected at build time by scripts/build.mjs. Public endpoint URLs only.
declare const __PULSEDESK_API_BASE__: string;
declare const __PULSEDESK_SOCKET_BASE__: string;
const API_BASE = __PULSEDESK_API_BASE__;
const SOCKET_BASE = __PULSEDESK_SOCKET_BASE__;

// document.currentScript is only set while this script first runs, so read it now.
const scriptTag =
  (document.currentScript as HTMLScriptElement | null) ??
  document.querySelector<HTMLScriptElement>("script[data-site-id]");

const LOG_PREFIX = "[PulseDesk-widget]";

interface UiState {
  open: boolean;
  draft: string;
  snapshot: ConnectionSnapshot;
}

// ---- small helpers -----------------------------------------------------------

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Darkens a #RRGGBB colour for hover/focus states.
function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 0xff) * factor);
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, "0")).join("")}`;
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

function presencePill(s: ConnectionSnapshot): string {
  const pill = (kind: string, label: string) =>
    `<span class="pill ${kind}"><span class="pill-dot"></span>${escapeHtml(label)}</span>`;

  if (s.status === "connecting") return pill("connecting", "Connecting…");
  if (s.status === "reconnecting") return pill("connecting", "Reconnecting…");
  if (s.status === "error") return pill("connecting", "Chat unavailable");
  if (s.agentName) return pill("agent", `${s.agentName} is here`);
  if (s.agentsOnline) return pill("agent", "Agent online");
  return pill("away", "Away · we'll reply soon");
}

function senderLabel(msg: ChatMessage, agentName: string | null): string {
  if (msg.role === "agent") return agentName ?? "Agent";
  if (msg.role === "ai") return "AI Assistant";
  return "";
}

function messageMeta(msg: ChatMessage): string {
  if (msg.status === "sending") return `<span class="meta">Sending…</span>`;
  if (msg.status === "failed") {
    return `<span class="meta failed">Not sent · <button type="button" class="retry-btn" data-retry="${escapeHtml(
      msg.id,
    )}">Retry</button></span>`;
  }
  return "";
}

// ---- UI ------------------------------------------------------------------------

function mountWidget(root: ShadowRoot, config: WidgetConfig, connection: Connection) {
  let state: UiState = { open: false, draft: "", snapshot: { status: "idle", agentsOnline: false, agentName: null, messages: [], remoteTyping: false } };

  const style = document.createElement("style");
  style.textContent = CSS;
  root.appendChild(style);

  const host = root.host as HTMLElement;
  host.style.setProperty("--indigo", config.primaryColor);
  host.style.setProperty("--indigo-dark", shade(config.primaryColor, 0.78));
  host.style.setProperty("--indigo-tint", config.secondaryColor);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <button class="launcher" type="button" aria-label="Open chat" aria-expanded="false">
      ${svgChatIcon()}
      <span class="badge" hidden></span>
    </button>
    <div class="panel" role="dialog" aria-label="${escapeHtml(config.displayName)} chat">
      <div class="header">
        <div class="header-info">
          <span class="company-name">${escapeHtml(config.displayName)}</span>
          <span class="presence-pill"></span>
        </div>
        <button class="close-btn" type="button" aria-label="Close chat">${svgCloseIcon()}</button>
      </div>
      <div class="banner" hidden>We couldn't connect to chat. Your messages will be sent when we're back.</div>
      <div class="messages" aria-live="polite"></div>
      <div class="composer">
        <textarea rows="1" placeholder="Type a message…" aria-label="Message" maxlength="5000"></textarea>
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
  const banner = wrapper.querySelector<HTMLDivElement>(".banner")!;
  const closeBtn = wrapper.querySelector<HTMLButtonElement>(".close-btn")!;
  const messagesEl = wrapper.querySelector<HTMLDivElement>(".messages")!;
  const textarea = wrapper.querySelector<HTMLTextAreaElement>("textarea")!;
  const sendBtn = wrapper.querySelector<HTMLButtonElement>(".send-btn")!;

  function renderMessages() {
    const { messages, remoteTyping, agentName, status } = state.snapshot;
    const wasNearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 60;

    // The welcome message is a local greeting, not a stored message.
    const welcome = `
      <div class="row other">
        <span class="sender-label">${escapeHtml(config.displayName)}</span>
        <div class="bubble">${escapeHtml(config.welcomeMessage)}</div>
      </div>`;

    let body = messages
      .map((msg) => {
        const side = msg.role === "visitor" ? "visitor" : "other";
        const label = senderLabel(msg, agentName);
        return `
          <div class="row ${side} ${msg.status}">
            ${label ? `<span class="sender-label">${escapeHtml(label)}</span>` : ""}
            <div class="bubble">${escapeHtml(msg.text)}</div>
            ${messageMeta(msg)}
          </div>`;
      })
      .join("");

    if (messages.length === 0) {
      body =
        status === "connecting"
          ? `<div class="empty">Loading your conversation…</div>`
          : `<div class="empty">Send us a message — we usually reply in a few minutes.</div>`;
    }

    if (remoteTyping) {
      body += `<div class="row other"><div class="typing-bubble" aria-label="Agent is typing">
          <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
        </div></div>`;
    }

    messagesEl.innerHTML = welcome + body;

    if (wasNearBottom || messages.length <= 1) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function render() {
    const { snapshot } = state;
    const unread = snapshot.messages.filter((m) => m.unread).length;

    panel.classList.toggle("open", state.open);
    launcher.setAttribute("aria-expanded", String(state.open));
    presencePillEl.innerHTML = presencePill(snapshot);
    banner.hidden = snapshot.status !== "error";

    badge.hidden = unread === 0 || state.open;
    badge.textContent = unread > 9 ? "9+" : String(unread);
    launcher.setAttribute("aria-label", unread ? `Open chat, ${unread} unread` : "Open chat");

    sendBtn.disabled = textarea.value.trim().length === 0;
    renderMessages();
  }

  function setOpen(open: boolean) {
    state = { ...state, open };
    if (open) {
      connection.activate();
      connection.markRead();
      window.setTimeout(() => textarea.focus(), 50);
    }
    render();
  }

  launcher.addEventListener("click", () => setOpen(!state.open));
  closeBtn.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.open) setOpen(false);
  });

  messagesEl.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const id = target.getAttribute("data-retry");
    if (id) connection.retry(id);
  });

  textarea.addEventListener("input", () => {
    sendBtn.disabled = textarea.value.trim().length === 0;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 88)}px`;
    connection.setVisitorTyping(textarea.value.length > 0);
  });
  textarea.addEventListener("blur", () => connection.setVisitorTyping(false));

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

  connection.subscribe((snapshot) => {
    state = { ...state, snapshot };
    // Messages that arrive while the chat is open are read immediately.
    if (state.open && snapshot.messages.some((m) => m.unread)) connection.markRead();
    render();
  });

  connection.start();
}

// ---- boot --------------------------------------------------------------------

const demoConfig = (siteId: string): WidgetConfig => ({
  siteId,
  displayName: "PulseDesk Demo Co.",
  welcomeMessage: "Hi! 👋 Ask me anything — I'll get you to a human if needed.",
  primaryColor: "#4B4FE0",
  secondaryColor: "#EEF0FF",
  widgetEnabled: true,
  agentsOnline: false,
});

async function init() {
  if (document.getElementById("pulsedesk-widget-root")) return; // already loaded on this page

  const siteId = scriptTag?.getAttribute("data-site-id");
  if (!siteId) {
    console.error(`${LOG_PREFIX} Missing data-site-id on the widget <script> tag.`);
    return;
  }

  const demo = scriptTag?.getAttribute("data-demo") === "true";
  const api = createWidgetApi(API_BASE, siteId);

  let config: WidgetConfig;
  try {
    config = demo ? demoConfig(siteId) : await api.getConfig();
  } catch (err) {
    console.warn(`${LOG_PREFIX} Chat is not available on this site:`, (err as Error).message);
    return;
  }
  if (!config.widgetEnabled) return;

  const connection = demo
    ? createMockConnection(config)
    : createRealConnection({ api, socketBase: SOCKET_BASE, config });

  const host = document.createElement("div");
  host.id = "pulsedesk-widget-root";
  document.body.appendChild(host);
  mountWidget(host.attachShadow({ mode: "open" }), config, connection);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void init());
} else {
  void init();
}
