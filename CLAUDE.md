# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AuraBank is a gamified social fintech app where users trade "Aura" points based on real-life interactions. Person A roasts Person B, files a claim with evidence, and on approval the aura debits B's balance and credits A's. Aura is never minted — only transferred.

Rebuilt from scratch in August 2026 as a **web app** (v1 was Kotlin/Compose Android, preserved at tag `pre-rebuild-2026-08-23`). Web, because it reaches iPhone users without App Store or Xcode overhead.

**The primary requirement is visual appeal.** This must not look like a normal everyday website.

## Current Scope

A monorepo (npm workspaces). It contains **sub-project 1: the landing page** — one scrolling page ending in a waitlist. Authentication, accounts, balances, filing claims, the admin clearing queue, and the leaderboard are future sub-projects, each getting its own spec.

```
apps/landing/      the landing page — its own deployable, its own database
packages/design/   shared design system: tokens, type and motion primitives
```

The bank app will be `apps/bank/`. The leaderboard starts as a route inside it, reading a precomputed snapshot table — never a live aggregate — so it can be split out later without sharing a schema.

Design spec (source of truth): `docs/superpowers/specs/2026-08-23-aurabank-landing-design.md`

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Vitest · SQLite via `node:sqlite`

Requires Node 24+ for the built-in SQLite. Inside `apps/landing`, the path alias `@/*` maps to that app's root; the shared package is imported as `@aurabank/design`.

## Commands

Run from the repository root; they fan out across workspaces.

```bash
npm run dev          # landing dev server
npm run build        # landing production build
npm start            # serve the production build
npm test             # every workspace's suite
npm run typecheck    # every workspace

node apps/landing/scripts/generate-story-frames.mjs   # redraw the story atlas
```

## Hard Constraints

**Everything is local.** The page makes zero external requests at runtime — no CDN, no Google Fonts, no analytics, no hosted database. Fonts are bundled woff2 served by the app. `apps/landing/lib/__tests__/local-only.test.ts` fails if that regresses; do not add an external host to get around it.

**No dark mode.** The design is ink on paper — printed stationery, not a webpage. Do not add a dark variant.

**Accent colours only on figures.** Settlement green and debt red appear on numbers, never on body text or chrome.

**Deadpan voice.** The joke never winks. Institutional bank language applied to absurd subject matter; if it reads like a meme page, the joke dies.

**Every animation gated** behind `prefers-reduced-motion`, and the page must read correctly with no JavaScript and no WebGL. The story's captions fall back to a plain numbered list.

**Waitlist storage is a local SQLite file** at `apps/landing/data/waitlist.db` (gitignored, `WAITLIST_DB_PATH` overrides). This needs a persistent Node process — on a serverless host the filesystem is ephemeral and signups vanish silently. Migrating to Postgres touches only `apps/landing/lib/waitlist/store.ts`.

**Durability is deliberate.** `synchronous = FULL` fsyncs every commit, so a power cut cannot lose an acknowledged signup. A backup sidecar takes hourly `VACUUM INTO` snapshots — the only safe way to copy a live WAL database — integrity-checks each one, and writes them to a host directory rather than a Docker volume, so `docker compose down -v` cannot destroy them.

## Monorepo Rules

**One owner per database.** Apps never read each other's tables. If two apps need the same data, they talk over HTTP. The waitlist belongs to the landing page; when auth exists, those emails move into the bank app by a one-time import script, not by the bank reading the landing page's file.

**`packages/design` holds presentational leaf code only** — no data access, no domain rules, no knowledge of any app. It is safe to share precisely because changing how aura settles cannot touch it.

**Never create `packages/db` or `packages/types`.** Sharing a schema across apps recreates, at compile time, the coupling the split exists to avoid.

Both rules are enforced by tests, not convention: `packages/design/src/__tests__/boundaries.test.ts` and `apps/landing/lib/__tests__/boundaries.test.ts` fail the build on a cross-boundary import.

## Architecture Notes

- `apps/landing/app/page.tsx` composes four beats: hero, the story, full disclosure, open an account.
- `apps/landing/components/canvas/GuillocheField.tsx` owns the WebGL2 context, the atlas texture, and the rAF loop. It knows nothing about page copy — it finds the story section by its `data-story-scrub` attribute.
- The story is **96 frames in a greyscale sprite atlas**, not a video. Scrubbing a video means seeking per frame, which stutters forwards and is far worse backwards; an atlas cell lookup costs the same in either direction. Artwork is a placeholder — regenerate with `apps/landing/scripts/generate-story-frames.mjs`.
- `apps/landing/lib/story/scrub.ts` and the design package's `split-text.ts` are pure functions with no DOM access, so the canvas and the DOM derive state from the same maths.
- `apps/landing/app/actions/waitlist.ts` is the only writer. A `"use server"` module may only export async functions — shared constants live in `lib/waitlist/state.ts`.
- A repeat waitlist email returns the same success state as a new signup, so the form cannot be used to check whether someone has already applied. Do not "fix" this into a distinct error.

## Role Constraint

The project owner is using this to learn system design. Act as a **Product Manager + System Design Advisor**: favour explaining the *why* behind recommendations, and surface trade-offs rather than burying them. Implement when asked directly — but design decisions get discussed first.
