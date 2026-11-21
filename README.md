# PulseDesk widget

This is the canonical source repository for the embeddable widget. It builds
`dist/widget.js` (minified release) and `dist/widget.debug.js` (local demo).
The Next.js frontend does not maintain a second widget source or `public/widget.js`.
Publish the generated `dist/widget.js` to the configured static host/CDN.

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
  types.ts             Connection contract, message/snapshot/config types
  api.ts               PulseDesk widget REST API + visitor key storage
  real-connection.ts   Real transport: REST for history/sending, Socket.io for live updates
  mock-connection.ts   Offline demo transport (data-demo="true"), scripted replies
  styles.ts            CSS, tokens copied from the landing page's globals.css
  widget.ts            Entry point: loads config, mounts Shadow DOM UI, wires everything up
demo/
  index.html           Stand-in "customer site" with the widget embedded
dist/
  widget.js            Production bundle (minified, ~64KB / ~21KB gzip, includes socket.io-client)
  widget.debug.js      Unminified build, used by demo/index.html
```

## Install on a website

```html
<script src="https://<widget host>/widget.js" data-site-id="YOUR_SITE_ID" async></script>
```

`data-site-id` is the only attribute. Company admins copy the exact snippet
from **Dashboard → Widget & Site**. Optional: `data-demo="true"` runs the
offline mock (no backend).

## How it talks to the backend

1. `GET /widget/config?siteId=` — name, welcome message, colours, whether
   the widget is enabled and whether any agent is online. If it fails (unknown
   site, website not in the company's allowed list) or the widget is disabled,
   nothing is rendered.
2. `POST /widget/sessions` — creates or restores the visitor. The returned
   `visitorKey` is kept in `localStorage` (`pulsedesk:<siteId>:visitorKey`),
   so a refresh brings back the same visitor and history. **First-time
   visitors get a session only when they open the chat**, so page views alone
   never create customers.
3. `GET /widget/conversations/active` + its messages — restores history.
4. Socket.io (`/realtime/socket.io`, `widgetToken` in the handshake) for live
   messages, agent typing, assignment and agent availability.
5. Messages are sent over REST with a `clientMessageId`, so **Retry** after a
   failure can never create a duplicate. The conversation is created on the
   first message.
6. After a reconnect the widget fetches `?after=<last message id>` to catch
   up on anything it missed. An expired session token is renewed from the
   visitor key automatically.

## Run the demo

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm lint
npx serve .         # then open demo/index.html
```

`demo/index.html` uses `data-demo="true"` (offline mock). To try it against a
local backend, remove `data-demo` and set `data-site-id` to a real company's
site id. The API/socket bases are injected at build time from this
repository's `.env` (`PULSEDESK_API_BASE`, `PULSEDESK_SOCKET_BASE`).

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
pnpm build      # one-shot production + debug bundle
pnpm typecheck  # TypeScript validation without generating output
pnpm lint       # Source lint validation for widget source
pnpm watch      # rebuild on change (debug build only)
```
