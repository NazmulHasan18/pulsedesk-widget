(() => {
  // src/styles.ts
  var CSS = (
    /* css */
    `
:host {
  all: initial;
  --paper: #F6F5F1;
  --surface: #FFFEFB;
  --ink: #14171C;
  --muted: #656A74;
  --line: #E6E3DA;
  --line-strong: #CFCCC0;
  --indigo: #4B4FE0;
  --indigo-dark: #3638B8;
  --indigo-tint: #ECEAFD;
  --signal: #1F9D68;
  --signal-tint: #E2F5EA;
  --signal-ink: #157A50;
  --amber: #D98A1F;
  --amber-tint: #FBEDD8;
  --amber-ink: #9C6413;
  --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  --font-display: "Space Grotesk", var(--font-sans);
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  position: fixed;
  z-index: 2147483000;
  bottom: 20px;
  right: 20px;
  font-family: var(--font-sans);
}

* { box-sizing: border-box; }

.launcher {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: var(--indigo);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(75, 79, 224, 0.35), 0 2px 6px rgba(20, 23, 28, 0.12);
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.launcher:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(75, 79, 224, 0.4); }
.launcher:focus-visible { outline: 2px solid var(--indigo-dark); outline-offset: 3px; }
.launcher svg { width: 24px; height: 24px; }

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--amber);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--paper);
}

.panel {
  position: absolute;
  bottom: 72px;
  right: 0;
  width: 360px;
  max-width: calc(100vw - 40px);
  height: 520px;
  max-height: calc(100vh - 120px);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 20px 48px rgba(20, 23, 28, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  transform: translateY(12px) scale(0.98);
  pointer-events: none;
  transition: opacity 160ms ease, transform 160ms ease;
}
.panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }

@media (prefers-reduced-motion: reduce) {
  .launcher, .panel { transition: none; }
}

.header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
}
.header-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.company-name {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px 2px 6px;
  border-radius: 999px;
  width: fit-content;
}
.pill-dot { width: 6px; height: 6px; border-radius: 999px; }
.pill.agent { background: var(--signal-tint); color: var(--signal-ink); }
.pill.agent .pill-dot { background: var(--signal); }
.pill.ai { background: var(--amber-tint); color: var(--amber-ink); }
.pill.ai .pill-dot { background: var(--amber); }
.pill.connecting { background: var(--line); color: var(--muted); }
.pill.connecting .pill-dot { background: var(--muted); }

.close-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
}
.close-btn:hover { background: var(--paper); color: var(--ink); }
.close-btn:focus-visible { outline: 2px solid var(--indigo); outline-offset: 2px; }

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--paper);
}

.row { display: flex; flex-direction: column; max-width: 82%; }
.row.visitor { align-self: flex-end; align-items: flex-end; }
.row.other { align-self: flex-start; align-items: flex-start; }

.sender-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 3px;
  padding: 0 2px;
}

.bubble {
  padding: 9px 12px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.45;
  word-wrap: break-word;
}
.row.visitor .bubble {
  background: var(--indigo);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.row.other .bubble {
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  border-bottom-left-radius: 4px;
}

.typing-bubble {
  display: inline-flex;
  gap: 3px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  border-bottom-left-radius: 4px;
  width: fit-content;
}
.typing-dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--muted);
  animation: bounce 1.1s infinite ease-in-out;
}
.typing-dot:nth-child(2) { animation-delay: 0.12s; }
.typing-dot:nth-child(3) { animation-delay: 0.24s; }
@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-3px); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .typing-dot { animation: none; opacity: 0.8; }
}

.composer {
  border-top: 1px solid var(--line);
  background: var(--surface);
  padding: 10px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.composer textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 9px 11px;
  font-family: var(--font-sans);
  font-size: 13.5px;
  color: var(--ink);
  background: var(--paper);
  max-height: 88px;
  min-height: 38px;
  line-height: 1.4;
}
.composer textarea:focus-visible {
  outline: 2px solid var(--indigo);
  outline-offset: 1px;
  border-color: var(--indigo);
}
.composer textarea::placeholder { color: var(--muted); }

.send-btn {
  border: none;
  background: var(--indigo);
  color: #fff;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 120ms ease;
}
.send-btn:hover:not(:disabled) { background: var(--indigo-dark); }
.send-btn:disabled { background: var(--line-strong); cursor: not-allowed; }
.send-btn:focus-visible { outline: 2px solid var(--indigo-dark); outline-offset: 2px; }
.send-btn svg { width: 16px; height: 16px; }

.footer-note {
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--muted);
  text-align: center;
  padding: 4px 0 8px;
  background: var(--surface);
}

.messages::-webkit-scrollbar { width: 6px; }
.messages::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 999px; }

@media (max-width: 480px) {
  :host { bottom: 12px; right: 12px; }
  .panel {
    width: calc(100vw - 24px);
    height: calc(100vh - 100px);
    bottom: 68px;
  }
}
`
  );

  // src/mock-connection.ts
  function createMockConnection(config) {
    let presenceListeners = [];
    let messageListeners = [];
    let typingListeners = [];
    let timers = [];
    const emitPresence = (status) => {
      presenceListeners.forEach((cb) => cb(status));
    };
    const emitMessage = (msg) => {
      messageListeners.forEach((cb) => cb(msg));
    };
    const emitTyping = (isTyping) => {
      typingListeners.forEach((cb) => cb(isTyping));
    };
    const schedule = (fn, delayMs) => {
      const t = setTimeout(fn, delayMs);
      timers.push(t);
      return t;
    };
    const connect = () => {
      emitPresence("connecting");
      schedule(() => {
        const agentOnline = Math.random() > 0.5;
        emitPresence(agentOnline ? "agent-online" : "ai-only");
        emitMessage({
          id: crypto.randomUUID(),
          role: "ai",
          text: config.welcomeMessage,
          createdAt: Date.now()
        });
      }, 500);
    };
    const disconnect = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    const sendMessage = (text) => {
      emitMessage({
        id: crypto.randomUUID(),
        role: "visitor",
        text,
        createdAt: Date.now()
      });
      emitTyping(true);
      const replyDelay = 900 + Math.min(text.length * 20, 1800);
      schedule(() => {
        emitTyping(false);
        emitMessage({
          id: crypto.randomUUID(),
          role: "ai",
          text: mockReply(text, config.companyName),
          createdAt: Date.now()
        });
      }, replyDelay);
    };
    const setVisitorTyping = (_isTyping) => {
    };
    return {
      connect,
      disconnect,
      sendMessage,
      setVisitorTyping,
      onPresence: (cb) => presenceListeners.push(cb),
      onMessage: (cb) => messageListeners.push(cb),
      onRemoteTyping: (cb) => typingListeners.push(cb)
    };
  }
  function mockReply(userText, companyName) {
    const lower = userText.toLowerCase();
    if (lower.includes("price") || lower.includes("cost")) {
      return `${companyName} has a free tier plus usage-based pricing for higher volume \u2014 want me to pull up the details?`;
    }
    if (lower.includes("human") || lower.includes("agent") || lower.includes("person")) {
      return "I can loop in a teammate for you \u2014 they'll join this chat as soon as one's free.";
    }
    return "Thanks for the message! I've noted this \u2014 a teammate or I will follow up with more detail shortly.";
  }

  // src/widget.ts
  var SOCKET_BASE = "wss://realtime.pulsedesk.io";
  function getSiteId() {
    var _a;
    const current = document.currentScript;
    const fromCurrent = current == null ? void 0 : current.getAttribute("data-site-id");
    if (fromCurrent) return fromCurrent;
    const fallback = document.querySelector("script[data-site-id]");
    return (_a = fallback == null ? void 0 : fallback.getAttribute("data-site-id")) != null ? _a : null;
  }
  function resolveConfig(siteId) {
    return {
      siteId,
      companyId: `company_${siteId}`,
      companyName: "PulseDesk Demo Co.",
      brandColor: "#4B4FE0",
      welcomeMessage: "Hi! \u{1F44B} Ask me anything \u2014 I'll get you to a human if needed.",
      socketUrl: `${SOCKET_BASE}/?siteId=${siteId}`
    };
  }
  function createInitialState() {
    return {
      open: false,
      presence: "connecting",
      messages: [],
      visitorTyping: false,
      remoteTyping: false,
      unread: 0
    };
  }
  function svgChatIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 12C4 7.58 7.58 4 12 4s8 3.58 8 8-3.58 8-8 8c-1.13 0-2.2-.23-3.18-.66L4 20l1.02-4.06A7.94 7.94 0 0 1 4 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  }
  function svgSendIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 12.5 20 4l-6.5 17-2.5-7-7-1.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
  </svg>`;
  }
  function svgCloseIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
  }
  function presencePill(status) {
    if (status === "agent-online") {
      return `<span class="pill agent"><span class="pill-dot"></span>Agent online</span>`;
    }
    if (status === "ai-only") {
      return `<span class="pill ai"><span class="pill-dot"></span>AI assistant</span>`;
    }
    if (status === "connecting") {
      return `<span class="pill connecting"><span class="pill-dot"></span>Connecting\u2026</span>`;
    }
    return `<span class="pill connecting"><span class="pill-dot"></span>Offline</span>`;
  }
  function senderLabel(msg) {
    if (msg.role === "agent") return "Agent";
    if (msg.role === "ai") return "AI Assistant";
    return "";
  }
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function mountWidget(root, config, connection) {
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
        <textarea rows="1" placeholder="Type a message\u2026" aria-label="Message"></textarea>
        <button class="send-btn" type="button" aria-label="Send message" disabled>${svgSendIcon()}</button>
      </div>
      <div class="footer-note">Powered by PulseDesk</div>
    </div>
  `;
    root.appendChild(wrapper);
    const launcher = wrapper.querySelector(".launcher");
    const badge = wrapper.querySelector(".badge");
    const panel = wrapper.querySelector(".panel");
    const presencePillEl = wrapper.querySelector(".presence-pill");
    const closeBtn = wrapper.querySelector(".close-btn");
    const messagesEl = wrapper.querySelector(".messages");
    const textarea = wrapper.querySelector("textarea");
    const sendBtn = wrapper.querySelector(".send-btn");
    function setState(patch) {
      state = { ...state, ...patch };
      render();
    }
    function renderMessages() {
      const wasNearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 60;
      messagesEl.innerHTML = state.messages.map((msg) => {
        const side = msg.role === "visitor" ? "visitor" : "other";
        const label = senderLabel(msg);
        return `
          <div class="row ${side}">
            ${label ? `<span class="sender-label">${label}</span>` : ""}
            <div class="bubble">${escapeHtml(msg.text)}</div>
          </div>
        `;
      }).join("");
      if (state.remoteTyping) {
        messagesEl.insertAdjacentHTML(
          "beforeend",
          `<div class="row other"><div class="typing-bubble" aria-label="Assistant is typing">
          <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
        </div></div>`
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
    function toggleOpen(nextOpen) {
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
        unread: incomingFromOther && !state.open ? state.unread + 1 : state.unread
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
    const config = resolveConfig(siteId);
    const connection = createMockConnection(config);
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
})();
