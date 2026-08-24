# AuraBank

The central bank of aura. Aura is not created. It is transferred.

A web app rebuilt from scratch (the v1 Kotlin/Compose Android app lives at tag
`pre-rebuild-2026-08-23`). This repository currently contains **sub-project 1:
the landing page** — a single scrolling page ending in a waitlist.

Design spec: [`docs/superpowers/specs/2026-08-23-aurabank-landing-design.md`](docs/superpowers/specs/2026-08-23-aurabank-landing-design.md)

## Layout

A monorepo, on npm workspaces.

```
apps/landing/      the landing page — its own deployable, its own database
packages/design/   shared design system: tokens, type and motion primitives
```

Apps depend on `packages/design` and on nothing else in the repo. They never
read each other's databases; if two apps need the same data they talk over HTTP.
There is deliberately no `packages/db` and no `packages/types` — sharing a schema
across apps rebuilds, at compile time, the coupling the split exists to avoid.
Both rules are enforced by tests that fail the build on a cross-boundary import,
because a rule that lives only in your memory will lose.

## Running it

Requires Node 24+ (it uses the built-in `node:sqlite`; developed on Node 26).

```bash
npm install
npm run dev        # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Landing dev server |
| `npm run build` | Landing production build |
| `npm start` | Serve the production build |
| `npm test` | Every workspace's suite |
| `npm run typecheck` | Every workspace |
| `node apps/landing/scripts/generate-story-frames.mjs` | Redraw the story atlas |

## Everything is local

The page makes **zero external requests at runtime** — no CDN, no Google Fonts,
no analytics, no hosted database. Fonts are bundled as woff2 and served by the
app itself. `lib/__tests__/local-only.test.ts` fails the build if that changes.

Waitlist applications are stored in a local SQLite file at `data/waitlist.db`
(gitignored, created on first write). Override the location with
`WAITLIST_DB_PATH`.

**Deployment constraint:** local SQLite needs a persistent Node process. On a
serverless host the filesystem is ephemeral and signups would be discarded
silently. Migrating to Postgres means reimplementing `lib/waitlist/store.ts` and
nothing else.

## The story

The middle of the page is a cartoon of the mechanic — one character roasts another, files a claim, and the aura crosses over — scrubbed by scroll. Scroll down and it advances; scroll up and it runs backwards.

It is **not a video**. It is 96 frames packed into one greyscale sprite sheet
(`public/story/story-atlas.png`, ~290 KB), sampled by the shader and engraved
into the guilloché line field. Scrubbing a video file would mean seeking on
every frame, which stutters forwards and is far worse backwards; picking an
atlas cell costs the same in either direction.

The captions name **Person A and Person B**, and the two balance gauges in the
artwork are labelled `A` and `B` on the same sides the figures stand on — so the
words and the picture refer to the same people without anything having to
explain the mapping. Writing the steps in the second person ("you roast
someone") was tried first and did not read: nothing tied the text to the two
anonymous figures on screen.

While the story runs, the viewport holds the artwork, the current step, and
nothing else. The artwork's two **balance gauges** are the only instrumentation —
they show aura leaving one account and arriving in another — so the section
reserves a clear band at the bottom for them, and the shader anchors the artwork
to the bottom of the viewport so they stay pinned there at any aspect ratio.

The artwork is **atmosphere, not explanation** — the captions and the step rail
carry the mechanic, because type at real size is always more legible than an
engraving at 9% opacity behind it. Adding detail to the artwork was tried and
reverted; it read as clutter without being any clearer.

The current artwork is a **placeholder** — stick figures, four acts of 24
frames. To replace it with real animation, edit `scripts/lib/story-frames.mjs`
(or pack your own frames at the same geometry) and regenerate:

```bash
node scripts/generate-story-frames.mjs
```

That rewrites both the atlas and `lib/story/atlas.ts`, so no constants need
updating by hand.

## Deployment

Runs on the `fox` server as a Docker stack, alongside `tikwah` and following the
same pattern: read-only root filesystem, all capabilities dropped,
`no-new-privileges`, CPU and memory caps, log rotation, and a free Cloudflare
quick tunnel for the public URL. No ports are published on the host.

```bash
# Ship the committed tree (nothing untracked reaches the server)
ssh fox 'mkdir -p ~/aurabank'
git archive HEAD | ssh fox 'tar -x -C ~/aurabank'

# Build and start
ssh fox 'cd ~/aurabank && docker compose build && docker compose up -d'

# The tunnel hostname is random and CHANGES on every cloudflared restart
ssh fox "docker logs aurabank-cloudflared 2>&1 | grep -o 'https://.*trycloudflare.com'"
```

The image is a two-stage build: the toolchain stays in the build stage, and the
runtime carries Node, Next's standalone server, and nothing else.

## Not losing the data

The waitlist database is the only stateful thing here. It is a local SQLite file
on a machine that can lose power, so durability is deliberate at three levels.

**Every commit is fsynced.** `synchronous = FULL` means an acknowledged signup is
on disk before the response returns. SQLite's default can lose the last few
transactions on power loss — fine for a cache, not for "you're on the list".

**Hourly verified snapshots.** A `backup` sidecar runs from the app's own image
and takes `VACUUM INTO` snapshots — the only safe way to copy a live WAL
database, since `cp` can capture a file missing recent commits or simply torn.
Every snapshot is then opened and `PRAGMA integrity_check`-ed before it is kept,
and a failing one is deleted rather than left looking like safety. Seven days are
retained; each is a few kilobytes.

**Snapshots live outside Docker.** They are written to `./backups` on the host,
not a Docker volume, because `docker compose down -v` and a corrupted Docker
state both destroy volumes — and a backup that dies with the thing it backs up is
not a backup.

```bash
ssh fox 'ls -la ~/aurabank/backups | tail -5'          # what exists
ssh fox 'docker logs aurabank-backup --tail 5'          # what it last did
```

**Restore** — stop the app so nothing writes mid-restore, put the snapshot back,
start again:

```bash
ssh fox 'cd ~/aurabank && docker compose stop web backup'
ssh fox 'cd ~/aurabank && docker run --rm -v aurabank_waitlist-data:/d \
  -v "$PWD/backups":/b alpine sh -c "rm -f /d/waitlist.db* && cp /b/<SNAPSHOT>.db /d/waitlist.db"'
ssh fox 'cd ~/aurabank && docker compose start web backup'
```

**Pull a copy off the machine** — on-box snapshots do not survive a dead disk:

```bash
scp -r fox:~/aurabank/backups ./waitlist-backups-$(date +%F)
```

That last step is the only one that is still manual, and it is the one that
matters most if the machine itself dies.

**A tunnel URL is not a permanent address.** It changes whenever the container
restarts, which `restart: unless-stopped` will do after a reboot. A stable
address needs either a named Cloudflare tunnel (a domain plus an account) or a
tailnet node like tikwah's, which needs a `TS_AUTHKEY`.

## Layout

```
app/
  page.tsx                  composes the seven sections
  layout.tsx                self-hosted fonts, metadata
  globals.css               design tokens and the motion system
  actions/waitlist.ts       server action: validate -> rate-limit -> store
components/
  sections/                 one file per beat of the scroll
  canvas/                   the guilloché engraving (WebGL2) and its GLSL
  motion/                   split-character headline
  ui/                       Rule, MonoLabel, Figure, Mantra, Section
lib/
  motion/                   split-text and viewport/motion hooks
  story/                    scrub maths (pure) and generated atlas geometry
  waitlist/                 schema, store, rate limiter, form state
scripts/                    the story generator — PNG encoder, rasteriser, toon
```

## On phones

The story is responsive in three ways that matter:

- **The artwork is enlarged and cropped** rather than contain-fitted. A 16:9
  frame contain-fitted into a portrait phone is a strip about a quarter of the
  screen tall; portrait scales it up (capped at 1.7×) and crops the mostly empty
  top, reaching ~44% of the screen. Filling more height means seeing less width,
  so the cap and the artwork's layout are one decision — at full zoom only the
  central ~59% of the frame shows, which is why the ledger sits well inside it.
- **Phones fetch `story-atlas-half.png`** (1920×1620, 133 KB) instead of the
  full sheet, which decodes to tens of megabytes of texture. Small screens also
  cap the device pixel ratio at 1.5 and skip pointer tracking.
- **Captions move above the artwork** and the scrub gets shorter (2.8 screens
  against 4), so the text never lands on the figures. They hang from the top of
  their box on phones and from the bottom on desktop, so larger type grows into
  empty space instead of pushing itself down the screen.

## Design rules

- **Ink on paper.** No dark mode — this is printed stationery.
- **Accent colours only on numbers.** Settlement green, debt red, nowhere else.
- **The joke never winks.** Deadpan institutional voice throughout.
- **Every animation is gated** behind `prefers-reduced-motion`, and the page
  reads perfectly with no JavaScript and no WebGL — including the story, whose
  captions fall back to a plain numbered list.
- **Show, don't write.** The story replaced a whole prose section; served markup
  dropped from 52 KB to 31 KB.
