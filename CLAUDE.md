# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AuraBank is a gamified social fintech app where users trade "Aura" points based on real-life interactions. Person A roasts Person B, files a claim with evidence, and on approval the aura debits B's balance and credits A's. Aura is never minted — only transferred.

Rebuilt from scratch in August 2026 as a **web app** (v1 was Kotlin/Compose Android, preserved at tag `pre-rebuild-2026-08-23`). Web, because it reaches iPhone users without App Store or Xcode overhead.

**The primary requirement is visual appeal.** This must not look like a normal everyday website.

## Current Scope

A monorepo (npm workspaces) with two sub-projects built:

```
apps/landing/      sub-project 1: one scrolling page ending in a waitlist
apps/bank/         sub-project 2: the clearing house — accounts, cases, the ledger
packages/design/   shared design system: tokens, type and motion primitives
```

Still future, each getting its own spec: the leaderboard (a route inside the bank reading a precomputed snapshot table — never a live aggregate), push notifications, statement history and exports, appeals, org scoping. Moderators are *designed for but not built*: the `role` column and the "a judge may not rule on their own case" check exist already.

Design specs (source of truth):
- `docs/superpowers/specs/2026-08-23-aurabank-landing-design.md`
- `docs/superpowers/specs/2026-08-25-aurabank-app-design.md`

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Vitest · SQLite via `node:sqlite`

Requires Node 24+ for the built-in SQLite. Inside `apps/landing`, the path alias `@/*` maps to that app's root; the shared package is imported as `@aurabank/design`.

## Commands

Run from the repository root; they fan out across workspaces.

```bash
npm run dev          # landing dev server        (:3000)
npm run dev:bank     # bank dev server           (:3001)
npm run build        # landing production build
npm run build:bank   # bank production build
npm start            # serve the landing build
npm start:bank       # serve the bank build
npm test             # every workspace's suite
npm run typecheck    # every workspace

npm run export-waitlist                               # waitlist, for issuing invites
node apps/landing/scripts/generate-story-frames.mjs   # redraw the story atlas
node apps/landing/scripts/generate-duel-frames.mjs    # redraw the duel loop
npm run check-ledger --workspace apps/bank            # re-derive every balance
npm run icons --workspace apps/bank                   # redraw the PWA icons
```

The bank needs `BANK_JUDGE_HANDLE`, `BANK_JUDGE_EMAIL` and `BANK_JUDGE_PASSWORD` set the first time it runs, to open the first account. See `apps/bank/README.md`.

## Hard Constraints

**Everything is local.** The page makes zero external requests at runtime — no CDN, no Google Fonts, no analytics, no hosted database. Fonts are bundled woff2 served by the app. `apps/landing/lib/__tests__/local-only.test.ts` fails if that regresses; do not add an external host to get around it.

**No dark mode.** The design is ink on paper — printed stationery, not a webpage. Do not add a dark variant.

**Accent colours only on figures.** Settlement green and debt red appear on numbers, never on body text or chrome.

**Deadpan voice.** The joke never winks. Institutional bank language applied to absurd subject matter; if it reads like a meme page, the joke dies.

**Every animation gated** behind `prefers-reduced-motion`, and the page must read correctly with no JavaScript and no WebGL. The story's captions fall back to a plain numbered list.

**Storage is local SQLite.** The waitlist at `apps/landing/data/waitlist.db` (`WAITLIST_DB_PATH`); the ledger at `apps/bank/data/bank.db` (`BANK_DB_PATH`); exhibits as files under `apps/bank/evidence` (`BANK_EVIDENCE_DIR`). All gitignored. This needs a persistent Node process — on a serverless host the filesystem is ephemeral and data vanishes silently. Migrating to Postgres touches only `apps/landing/lib/waitlist/store.ts` and `apps/bank/lib/db/`.

**Tailwind must be told to scan `packages/design`.** Automatic source detection stops at the app, so a class used *only* by a shared primitive silently renders as nothing — no error, just an unstyled button. The `@source "../../../packages/design/src"` line in each app's `globals.css` is what prevents it, and a test in each app asserts the path resolves.

**Durability is deliberate.** `synchronous = FULL` fsyncs every commit, so a power cut cannot lose an acknowledged signup. A backup sidecar takes hourly `VACUUM INTO` snapshots — the only safe way to copy a live WAL database — integrity-checks each one, and writes them to a host directory rather than a Docker volume, so `docker compose down -v` cannot destroy them.

## Monorepo Rules

**One owner per database.** Apps never read each other's tables. If two apps need the same data, they talk over HTTP. The waitlist belongs to the landing page; when auth exists, those emails move into the bank app by a one-time import script, not by the bank reading the landing page's file.

**`packages/design` holds presentational leaf code only** — no data access, no domain rules, no knowledge of any app. It is safe to share precisely because changing how aura settles cannot touch it. If a screen needs something it does not have, add it there rather than redefining a token in the app.

**Never create `packages/db` or `packages/types`.** Sharing a schema across apps recreates, at compile time, the coupling the split exists to avoid.

Both rules are enforced by tests, not convention: `packages/design/src/__tests__/boundaries.test.ts` and `apps/landing/lib/__tests__/boundaries.test.ts` fail the build on a cross-boundary import.

## Architecture Notes — the bank

- **Aura is issued only from the reserve, and issuing is still a transfer.** `accounts` holds one `role = 'reserve'` account (the bank's own, opened at 1,000,000). A *citation* names it as respondent instead of a person, so an award debits the reserve and credits the claimant through the same ledger path as any ruling — `SUM(delta)` is still zero and invariant 2 survives. There is no minting path anywhere, and adding one would break `check-ledger` by design.
- **`accounts.opening_balance` exists because not everyone starts at 3,000.** Reconciliation adds each account's own opening figure, not a shared constant; assuming one would report the bank as a million out.
- **A hearing is a thread with turns, not a chat.** `remarks` is one row per turn; `mayRemark` in `lib/cases/lifecycle.ts` is the pure rule — the two parties alternate, the judge speaks whenever and never spends a turn, and the filing counts as the claimant's first turn. Tested exhaustively, like `transitionFor`.
- **A username is unique; a name is not.** `handle` is the login and what a case names; `display_name` is what a statement is addressed to. Both are collected at `/join`.
- **The ledger is the truth; `accounts.balance` is a cache of it.** `npm run check-ledger --workspace apps/bank` re-derives every balance and exits non-zero on any disagreement. Run it after any restore.
- **A ruling moves aura exactly once**, enforced by `UNIQUE (case_id, account_id)` on `ledger_entries` — not by care in the handler. `apps/bank/lib/db/store.ts` documents the three layers.
- **The case lifecycle is one pure function** over `(status, action, actor, now)` in `apps/bank/lib/cases/lifecycle.ts`, tested exhaustively across every combination. `actorFor` checks party membership *before* the judge flag, so a judge who is claimant or respondent is never "judge" on that case — invariant 3 as a data structure rather than an `if`.
- **`apps/bank/lib/db/` is the only place that writes SQL**, and `openDatabase` wraps `node:sqlite` to return plain objects: raw rows have a null prototype, which React refuses to pass to a client component.
- **The lapse sweep runs on read**, not on a schedule. There is no scheduler, and nobody can act on a case without loading a page that sweeps first.
- **Exhibits have their metadata stripped on upload** (`lib/evidence/strip.ts`) — phone photos carry GPS. The stored filename is generated, never the uploaded one.
- **A `"use server"` module may only export async functions**, so form-state constants live in `lib/*/state.ts`.
- **A layout guard is not enough**: layouts do not run for server actions, so every action re-checks the session and the role for itself.

## Architecture Notes — the landing page

- `apps/landing/app/page.tsx` composes four beats: hero, the story, full disclosure, open an account.
- `apps/landing/components/canvas/GuillocheField.tsx` owns the WebGL2 context, the atlas texture, and the rAF loop. It knows nothing about page copy — it finds the story section by its `data-story-scrub` attribute.
- The story is **96 frames in a greyscale sprite atlas**, not a video. Scrubbing a video means seeking per frame, which stutters forwards and is far worse backwards; an atlas cell lookup costs the same in either direction. Artwork is a placeholder — regenerate with `apps/landing/scripts/generate-story-frames.mjs`.
- Section 03's duel is a **48-frame sprite sheet stepped by CSS**, not a GIF or a video. A GIF cannot be stopped for `prefers-reduced-motion` and a video needs JavaScript; two `steps(n, jump-none)` animations — one per axis — honour the preference in the stylesheet and rest on frame 0. Words are drawn from a stencil alphabet in `scripts/lib/letters.mjs`, because there is no font rasteriser and a text engine would dwarf the eight words it would serve. Regenerate with `scripts/generate-duel-frames.mjs`.
- **The duel is stepped by painting `background-position`, never by transforming an oversized image.** The obvious build — a big `<img>` slid inside an overflow-hidden window — promotes a composited layer of `columns × rows` frames: measured at **23 megapixels**, on a page that already runs a WebGL canvas. Painting a background keeps the element one frame in size (0.5 Mpx). A test asserts this, because the expensive version looks identical in a screenshot.
- **Artwork weight is a budget, not an afterthought.** The story atlas already holds ~50MB decoded. The duel sheet is composed at full size and resampled down to 0.7 on the way out (~26MB, ~7MB on phones) — the generator prints the decoded cost of every sheet it writes, so a change that doubles it is visible immediately.
- `apps/landing/lib/story/scrub.ts` and the design package's `split-text.ts` are pure functions with no DOM access, so the canvas and the DOM derive state from the same maths.
- `apps/landing/app/actions/waitlist.ts` is the only writer. A `"use server"` module may only export async functions — shared constants live in `lib/waitlist/state.ts`.
- A repeat waitlist email returns the same success state as a new signup, so the form cannot be used to check whether someone has already applied. Do not "fix" this into a distinct error.

## Role Constraint

The project owner is using this to learn system design. Act as a **Product Manager + System Design Advisor**: favour explaining the *why* behind recommendations, and surface trade-offs rather than burying them. Implement when asked directly — but design decisions get discussed first.
