# Vercel as a proxy, not a host

`aurabank.vercel.app` is a front door and nothing else. The application runs on
`fox`, in Docker, and stays there. Vercel holds no code, no database and no
state — it forwards requests to a Tailscale Funnel hostname and returns the
answer.

```
aurabank.vercel.app  →  Vercel  →  Tailscale Funnel  →  fox  →  Docker
```

## What is in the repository

`vercel.json` — a single catch-all rewrite. A *rewrite* proxies (the browser's
URL never changes); a *redirect* would bounce the visitor to the `ts.net`
hostname and defeat the point.

```json
{ "source": "/:path*", "destination": "https://aurabank.tailcc00e1.ts.net/:path*" }
```

Nothing is built or deployed from this repository to Vercel. There is no
framework preset to select and no build command to run.

## The two hostnames

Each app is its own Tailscale node, so each has its own `:443`:

| App | Funnel hostname | Container |
|---|---|---|
| Landing | `aurabank.tailcc00e1.ts.net` | `aurabank-web` |
| Bank | `aurabank-bank.tailcc00e1.ts.net` | `aurabank-bank` |

`vercel.json` points at the **landing**, matching what `aurabank.vercel.app`
implies. To point the domain at the bank instead, change the one hostname in
`destination`. To publish both, make a second Vercel project whose
`vercel.json` targets the bank — one project proxies one app, because both
apps generate root-relative URLs and neither can live under a path prefix
without a `basePath`, which would change every URL it emits.

## Setting it up in the dashboard

This part cannot be done from the repository.

1. **New Project → import `aibelbin/aurabank`.**
2. **Framework Preset: Other.** Not Next.js — Vercel would try to build and
   host the app, which is the thing we are avoiding.
3. **Build Command: leave empty. Output Directory: leave empty.** There is
   nothing to build.
4. **Root Directory: leave as the repository root**, so `vercel.json` is found.
5. Deploy. The result serves no files of its own; every path is proxied.

## Limitations of proxying through Vercel

Checked before building, not discovered afterwards.

- **WebSockets do not pass through a Vercel rewrite.** Neither app uses them in
  production — the landing's guilloché is WebGL on a canvas and the bank is
  server-rendered with Server Actions over ordinary POSTs — so nothing breaks
  today. But a future feature that needs a socket (live docket updates, say)
  will not work through this path and would have to talk to the `ts.net`
  hostname directly.
- **Server Actions would 403 without configuration.** Next compares a Server
  Action's `Origin` against its `Host` and rejects mismatches as CSRF. Behind a
  proxy they never match. Both apps list `aurabank.vercel.app` in
  `serverActions.allowedOrigins`; remove it and every form on the site stops
  working — sign-in, filing, rulings, the waitlist.
- **Uploads are capped well below the app's own limit.** A Vercel proxied
  request body is limited to ~4.5MB; an exhibit may be 5MB. A large screenshot
  filed through `aurabank.vercel.app` will fail at the edge before it reaches
  the bank. Filing through the `ts.net` hostname has no such cap.
- **Response streaming is preserved**, so Next's streaming SSR still works, but
  a response has a finite window at the edge. Nothing here is long-polling.
- **The client IP the app sees is Vercel's**, forwarded in `x-forwarded-for`.
  The rate limiters read that header, so they still bucket per visitor rather
  than lumping everyone together.
- **Two hops of latency.** Vercel's edge, then Funnel's relay, then fox. Fine
  for a document-shaped app; it is not a CDN for the artwork.

## What happens on redeploy

Nothing on Vercel. The rewrite points at a hostname, and that hostname is
fixed by the Tailscale node's identity, which lives on a Docker volume. Rebuild
and restart the app as often as you like — the public URL does not move. That
was the failure of the Cloudflare quick tunnel: its hostname was random and
changed on every restart, which signed every member out, because a session
cookie is scoped to a host.
