# Vercel as a proxy, not a host

`aurabank.vercel.app` is a front door and nothing else. The application runs on
`fox`, in Docker, and stays there. Vercel holds no code, no database and no
state — it forwards requests to a Tailscale Funnel hostname and returns the
answer.

```
aurabank.vercel.app  →  Vercel  →  Tailscale Funnel  →  fox  →  Docker
```

## What is in the repository

`vercel.json`, and every field in it is load-bearing:

```json
{
  "framework": null,
  "installCommand": "",
  "buildCommand": "echo 'proxy-only project: nothing is built here'",
  "outputDirectory": "public",
  "rewrites": [
    { "source": "/:path*", "destination": "https://aurabank.tailcc00e1.ts.net/:path*" }
  ]
}
```

- **`framework: null`** is how you select "Other". Without it Vercel finds
  `next` in the root `package.json` and presets Next.js.
- **`buildCommand`** overrides the Build Command *and the `build` script in
  `package.json`*. Without it Vercel runs the root script — `npm run build
  --workspace apps/landing` — and tries to build and host the application,
  which is the one thing this arrangement exists to prevent. It is a harmless
  `echo` rather than an empty string so that "no build" cannot be
  misread as "no override, use the default".
- **`installCommand: ""`** skips installation. An empty string is documented
  to skip it, and there is nothing to install for an `echo`.
- **`outputDirectory: "public"`** is the subtle one. With the preset set to
  "Other" and no `public` directory, Vercel falls back to serving **the
  repository root** — `package.json`, the source tree, `docs/`, all of it, at
  `aurabank.vercel.app`. Worse, static files are matched *before* rewrites, so
  those paths would stop being proxied. `public/` is committed and empty for
  exactly this reason; see the note inside it.
- **`rewrites`** proxies (the browser's URL never changes). A *redirect* would
  bounce the visitor to the `ts.net` hostname and defeat the point.

Nothing is built or deployed from this repository to Vercel.

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

`vercel.json` overrides the dashboard for the build settings — the docs say so
for each field: *"This value overrides the Framework / Build Command / Install
Command / Output Directory in Project Settings."* So the presets there do not
need touching, and changing them will not help if something is wrong.

**One setting is the exception, and it is the one that bites.** *Root
Directory* has no `vercel.json` equivalent; it exists only in the dashboard. If
it is set to anything other than the repository root — and Vercel's monorepo
detection is happy to point it at `apps/landing` on import — then:

- `vercel.json` is outside the root and **is never read**, so none of the
  above applies;
- Vercel builds whatever it finds there instead.

To check: **Project → Settings → Build and Deployment → Root Directory.** It
must be **empty** (the repository root). The docs are explicit that with a root
directory set, *"your app will not be able to access files outside of that
directory"*.

On first import:

1. **New Project → import `aibelbin/aurabank`.**
2. **Root Directory: leave empty.** If the import screen has pre-filled
   `apps/landing`, clear it.
3. Everything else can be left alone — `vercel.json` sets it.
4. Deploy. The build log should show the `echo`, no `npm install`, and no
   `next build`.

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
