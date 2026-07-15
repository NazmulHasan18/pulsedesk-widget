# PulseDesk Widget

Standalone embeddable chat widget. Separate build from the main Next.js app
(landing page / dashboard / super-admin) on purpose — see rationale below.

## Why this is a separate package

The widget runs on **third-party sites you don't control**, embedded via:

```html
<script src="https://cdn.pulsedesk.io/widget.js" data-site-id="site_abc123" async></script>
```

That means it can't be a Next.js/React page — it has to be a small,
dependency-free, framework-free bundle that:
- Ships as a single `<script>` tag, no build step required on the customer's side
- Renders inside a **Shadow DOM** so host-page CSS never leaks in or out
- Has its own isolated build (esbuild → one minified file), independent of `next build`

Your landing page, company dashboard, and super-admin panel should stay
together in the main Next.js repo (they're all authenticated, share
Prisma/NextAuth/Socket.io). This package is just the widget.

## Structure

```
src/
  types.ts             Connection contract, message/state/config types
  mock-connection.ts   Simulated backend — presence, AI replies, typing
  styles.ts            CSS, tokens copied from the landing page's globals.css
  widget.ts            Entry point: mounts Shadow DOM UI, wires everything up
demo/
  index.html           Stand-in "customer site" with the widget embedded
dist/
  widget.js            Production bundle (minified, ~13KB, no deps)
  widget.debug.js       Unminified build, used by demo/index.html
```

## Run the demo

```bash
npm install
npm run build      # esbuild -> dist/widget.js + dist/widget.debug.js
npx serve .         # or any static server; open demo/index.html
```

Reload the demo page a few times — presence randomly resolves to
"Agent online" (signal/green) or "AI assistant" (amber), matching the
status language from HANDOFF.md §4.

## What's real vs. mocked right now

| Piece | Status |
|---|---|
| UI, Shadow DOM isolation, state machine, a11y (focus, `Esc` to close, `aria-live`, reduced-motion) | **Real** |
| `data-site-id` parsing | **Real** |
| Config resolution (`resolveConfig` in `widget.ts`) | **Mocked** — hardcoded company name/branding |
| Presence + messages (`mock-connection.ts`) | **Mocked** — random presence, canned AI replies, fake typing delays |
| Socket.io connection | **Not implemented** — backend doesn't exist yet (HANDOFF.md §6.3) |

## Swapping in the real backend

Everything the UI needs from a transport is defined by the `Connection`
interface in `src/types.ts`:

```ts
interface Connection {
  connect: () => void;
  disconnect: () => void;
  sendMessage: (text: string) => void;
  setVisitorTyping: (isTyping: boolean) => void;
  onPresence: (cb: (status: PresenceStatus) => void) => void;
  onMessage: (cb: (msg: ChatMessage) => void) => void;
  onRemoteTyping: (cb: (isTyping: boolean) => void) => void;
}
```

When the realtime layer exists:

1. Create `src/real-connection.ts` exporting `createRealConnection(config): Connection`,
   using `socket.io-client`, connecting to `SOCKET_BASE` scoped by `siteId`.
2. In `widget.ts`, swap the import:
   ```ts
   // import { createMockConnection } from "./mock-connection";
   import { createRealConnection } from "./real-connection";
   // ...
   const connection = createRealConnection(config);
   ```
3. Replace `resolveConfig()` in `widget.ts` with a real
   `fetch(\`${API_BASE}/api/widget/config?siteId=...\`)` once the
   `Company` model / widget-config endpoint exists (HANDOFF.md §6.1, §6.2).

No changes needed anywhere else — `widget.ts`'s DOM/rendering code only
talks to the `Connection` interface, never to the mock directly.

## Conventions followed (matching the main repo)

- Functional composition (factories + closures) throughout — no classes,
  matching the stated preference for functional over OOP patterns.
- Design tokens (`--paper`, `--ink`, `--indigo`, `--signal`/`--amber` for
  agent/AI status, `--font-display`/`--font-sans`/`--font-mono`) copied
  verbatim from `globals.css` — signal/green stays agent-online, amber
  stays AI, per HANDOFF.md §4.
- `data-site-id` is the multi-tenancy entry point, matching
  `site-id -> companyId` scoping described in HANDOFF.md §1.

## npm scripts

```bash
npm run build     # one-shot production + debug bundle
npm run watch     # rebuild on change (debug build only)
```
