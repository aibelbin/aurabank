# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AuraBank is a gamified social fintech app where users trade "Aura" points based on real-life interactions. Person A roasts Person B, files a claim with evidence, and on approval the aura debits B's balance and credits A's. Aura is never minted — only transferred.

Rebuilt from scratch in August 2026 as a **web app** (v1 was Kotlin/Compose Android, preserved at tag `pre-rebuild-2026-08-23`). Web, because it reaches iPhone users without App Store or Xcode overhead.

**The primary requirement is visual appeal.** This must not look like a normal everyday website.

## Current Scope

The repository contains **sub-project 1: the landing page** — one scrolling page ending in a waitlist. Authentication, accounts, balances, filing claims, and the admin clearing queue are all future sub-projects, each getting its own spec.

Design spec (source of truth): `docs/superpowers/specs/2026-08-23-aurabank-landing-design.md`

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Vitest · SQLite via `node:sqlite`

Requires Node 24+ for the built-in SQLite. Path alias `@/*` maps to the repo root.

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm start            # serve the production build
npm test             # full suite
npm run test:watch   # watch mode
npm run typecheck    # tsc --noEmit

node scripts/generate-story-frames.mjs   # redraw the story atlas
```

## Hard Constraints

**Everything is local.** The page makes zero external requests at runtime — no CDN, no Google Fonts, no analytics, no hosted database. Fonts are bundled woff2 served by the app. `lib/__tests__/local-only.test.ts` fails if that regresses; do not add an external host to get around it.

**No dark mode.** The design is ink on paper — printed stationery, not a webpage. Do not add a dark variant.

**Accent colours only on figures.** Settlement green and debt red appear on numbers, never on body text or chrome.

**Deadpan voice.** The joke never winks. Institutional bank language applied to absurd subject matter; if it reads like a meme page, the joke dies.

**Every animation gated** behind `prefers-reduced-motion`, and the page must read correctly with no JavaScript and no WebGL. The story's captions fall back to a plain numbered list.

**Waitlist storage is a local SQLite file** at `data/waitlist.db` (gitignored, `WAITLIST_DB_PATH` overrides). This needs a persistent Node process — on a serverless host the filesystem is ephemeral and signups vanish silently. Migrating to Postgres touches only `lib/waitlist/store.ts`.

## Architecture Notes

- `app/page.tsx` composes four beats: hero, the story, full disclosure, open an account.
- `components/canvas/GuillocheField.tsx` owns the WebGL2 context, the atlas texture, and the rAF loop. It knows nothing about page copy — it finds the story section by its `data-story-scrub` attribute.
- The story is **96 frames in a greyscale sprite atlas**, not a video. Scrubbing a video means seeking per frame, which stutters forwards and is far worse backwards; an atlas cell lookup costs the same in either direction. Artwork is a placeholder — regenerate with `scripts/generate-story-frames.mjs`.
- `lib/story/scrub.ts` and `lib/motion/split-text.ts` are pure functions with no DOM access, so the canvas and the DOM derive state from the same maths.
- `app/actions/waitlist.ts` is the only writer. A `"use server"` module may only export async functions — shared constants live in `lib/waitlist/state.ts`.
- A repeat waitlist email returns the same success state as a new signup, so the form cannot be used to check whether someone has already applied. Do not "fix" this into a distinct error.

## Role Constraint

The project owner is using this to learn system design. Act as a **Product Manager + System Design Advisor**: favour explaining the *why* behind recommendations, and surface trade-offs rather than burying them. Implement when asked directly — but design decisions get discussed first.
