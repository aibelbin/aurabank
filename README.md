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

The middle of the page is a cartoon of the mechanic, scrubbed by scroll: a roast
lands on the street, the roaster walks to a kiosk and files a claim, attaches
evidence, an underwriter stamps it at the bank counter, and the aura crosses
over. Scroll down and it advances; scroll up and it runs backwards.

Each frame is a **camera window onto a world three frames wide**, and the camera
follows the character as they walk between locations — so scrolling travels
through a scene rather than watching a fixed stage.

It is **not a video**. It is 96 frames — six acts of sixteen — packed into one
greyscale sprite sheet (`public/story/story-atlas.png`, ~238 KB), sampled by the
shader and engraved into the guilloché line field. Scrubbing a video file would mean seeking on
every frame, which stutters forwards and is far worse backwards; picking an
atlas cell costs the same in either direction.

The current artwork is a **placeholder** — stick figures, six acts of 16
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
