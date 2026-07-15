// Tokens copied verbatim from src/app/globals.css in the main PulseDesk
// repo (see HANDOFF.md §4). Keep these in sync if the landing page's
// palette ever changes — the widget intentionally duplicates rather than
// imports them, since it ships as an isolated bundle onto third-party
// sites and can't share a CSS pipeline with the Next.js app.
export const CSS = /* css */ `
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
`;
