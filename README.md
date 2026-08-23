# AuraBank

The central bank of aura. Aura is not created. It is transferred.

A web app rebuilt from scratch (the v1 Kotlin/Compose Android app lives at tag
`pre-rebuild-2026-08-23`). This repository currently contains **sub-project 1:
the landing page** — a single scrolling page ending in a waitlist.

Design spec: [`docs/superpowers/specs/2026-08-23-aurabank-landing-design.md`](docs/superpowers/specs/2026-08-23-aurabank-landing-design.md)

## Running it

Requires Node 24+ (it uses the built-in `node:sqlite`; developed on Node 26).

```bash
npm install
npm run dev        # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Full test suite |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `node scripts/generate-story-frames.mjs` | Redraw the story atlas |

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

## Design rules

- **Ink on paper.** No dark mode — this is printed stationery.
- **Accent colours only on numbers.** Settlement green, debt red, nowhere else.
- **The joke never winks.** Deadpan institutional voice throughout.
- **Every animation is gated** behind `prefers-reduced-motion`, and the page
  reads perfectly with no JavaScript and no WebGL — including the story, whose
  captions fall back to a plain numbered list.
- **Show, don't write.** The story replaced a whole prose section; served markup
  dropped from 52 KB to 31 KB.
