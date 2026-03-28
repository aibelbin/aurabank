# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AuraBank is a gamified social fintech app where users trade "Aura" points based on real-life interactions. A Submitter reports an event (specifying a Gainer and Loser), an Admin reviews it via a dashboard, and upon approval Aura is transferred between users' bank accounts.

**Backend:** Supabase (PostgreSQL + Auth), hosted at `ypfcnqtxtasrjygjccms.supabase.co`.

## Repository Structure

Monorepo with two independent modules:

- **`admin/`** — Vite + React + TypeScript admin dashboard for reviewing/approving transaction requests
- **`android/`** — Kotlin + Jetpack Compose Android app (early stage, scaffolded with Material3 theming)

There is no shared code between modules. Each has its own build system.

## Build & Dev Commands

### Admin Panel (`admin/`)

```bash
cd admin && npm install    # install dependencies
npm run dev                # start Vite dev server
npm run build              # production build
npm run lint               # ESLint
npm run test               # run tests (vitest)
npm run test:watch         # run tests in watch mode
```

Requires `admin/.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### Android App (`android/`)

```bash
cd android
./gradlew assembleDebug    # build debug APK
./gradlew test             # run unit tests
./gradlew connectedAndroidTest  # run instrumentation tests
```

Requires Android SDK at path specified in `android/local.properties`. Min SDK 24, target SDK 36, Kotlin 2.2.10.

## Architecture

### Admin Panel

Single-page React app using:
- **React Query** (`@tanstack/react-query`) for all Supabase data fetching and cache management
- **React Router** for routing (currently two routes: `/` dashboard, `*` 404)
- **Shadcn/ui** (Radix primitives + Tailwind) for all UI components in `src/components/ui/`
- Path alias: `@/*` maps to `src/*`

Core data flow lives in `src/pages/Index.tsx`: fetches transactions from Supabase, displays as filterable cards, handles approve/reject mutations that also update the `bank` table's `total_aura`.

Key types are in `src/types/request.ts`. Supabase client is initialized in `src/lib/supabase.ts`.

### Android App

Namespace: `com.example.aurabank`. Currently a scaffold with `MainActivity.kt` using Compose and Material3 dynamic color theming. No navigation, networking, or business logic yet.

## Database Schema (Supabase PostgreSQL)

Three tables:
- **`user`** — identity (id, name, org, total_aura, debt_aura)
- **`bank`** — financial ledger per user (total_aura, aura_debt, FK to user)
- **`transaction`** — aura transfer requests (submitter_id, gainer_id, loser_id, expected_aura, status: pending/approved/rejected, description, video_link)

On approval, `bank.total_aura` is updated for the gainer. The loser deduction logic is not yet implemented.

## Role Constraint

The project owner is using this to learn Kotlin and system design. Act as a **Product Manager + System Design Advisor**. Do not write or implement code unless explicitly asked. Focus on architecture suggestions and explaining the *why* behind recommendations.
