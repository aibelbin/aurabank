# AuraBank — Landing Page Design

**Date:** 2026-08-23
**Status:** Approved 2026-08-23 — implementation plan next
**Sub-project:** 1 of N (landing page only)

---

## 1. Context

AuraBank v1 was a Kotlin/Compose Android app plus a Supabase backend, built for fun and abandoned. It is being rebuilt from scratch as a **web app**, because a website reaches iPhone users without App Store or Xcode overhead. The old code is deleted; history is preserved at tag `pre-rebuild-2026-08-23`.

The product: a bank whose currency is aura. Person A roasts Person B. A files a claim, attaches evidence, and if the claim clears, aura debits B's balance and credits A's. Aura is never minted — only transferred.

**The primary requirement is visual appeal.** This must not look like a normal everyday website.

## 2. Scope

This spec covers **the landing page only**: one scrolling page ending in a waitlist.

**In scope:** the scroll experience, the canvas background, the copy, waitlist capture stored locally.

**Out of scope (future sub-projects):** authentication, user accounts, aura balances, filing claims, evidence upload, the admin clearing queue, leaderboards, notifications.

## 3. Locked decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Platform | Web app, mobile-first | Reaches iPhone without App Store |
| Landing page job | Hype front door, waitlist at end of scroll | Ships something beautiful before the app exists |
| Stack | Next.js + TypeScript + Tailwind | Server layer ready for the real app; React is already known |
| Hero visual | Generated in-canvas, no video file | No assets to source; tiny payload; fully tweakable |
| Background motif | Animated guilloché (currency-note engraving) | Reads as "money" instantly; pure math |
| Voice | Deadpan institutional | Funny because it never admits it's a joke; matches the premium look |
| Waitlist storage | Local SQLite file | No credentials, testable end-to-end, first table of the real schema |
| Hosting model | Fully local / self-hosted, no third-party runtime deps | Runs in house, offline-capable, nothing to sign up for |
| Story medium | Scroll-scrubbed frame atlas, not a video file | Frame-accurate both directions; seeking an h264 file stutters, and backwards is far worse |
| Story content | Cartoon of the mechanic: roast → claim → settlement | Shows the mechanic instead of describing it, which is what let the prose be cut |
| Page length | Four beats, down from seven | Less to read before the waitlist; the story carries what the prose used to |
| Claim adjudication (future) | Admin reviews everything | Total control, no abuse; deferred to a later sub-project |

## 4. Design concept

**A central bank that takes aura completely seriously.** The joke never winks. Every visual and verbal decision is borrowed from real financial institutions — hairline rules, monospaced statement figures, footnotes, disclosure language, zero-sum accounting. The absurdity comes entirely from *what* is being accounted for.

Restraint is load-bearing. If the page looks like a meme page, the joke dies.

### Local-only constraint

Everything runs in house. At runtime the page makes **zero external network requests**.

- **Fonts are self-hosted.** Downloaded once during setup into `public/fonts/` and loaded via `next/font/local`. No `fonts.googleapis.com`, no `fonts.gstatic.com`. Every face declares a system fallback stack.
- **No CDN.** All CSS and JS is bundled and served by the app itself.
- **No third-party analytics, error reporting, embeds, captcha, or email service.**
- **No hosted database.** SQLite file on local disk.
- The one-time exceptions are `npm install` and the initial font download — both at setup time, never at runtime.
- Consequence: `npm run dev` works with networking fully disabled, which also means the whole thing is testable end to end without credentials.

### Visual system

- **Palette:** paper `#FAFAF8`, ink `#0A0A0A`, hairline `#E4E4E1`. Exactly two accents, used **only** on numeric figures: settlement green, debt red. No other colour anywhere.
- **Type:** tight grotesque for headlines at large sizes with hard weight contrast (bold headline against regular body). Small monospace for labels, figures, section numbers, and footnotes — monospace is what makes text read as a *statement* rather than a webpage. Concretely: **Inter Tight** (OFL) for headings and body, **JetBrains Mono** (OFL) for mono. Both self-hosted as woff2, subset to Latin, `font-display: swap`.
- **Layout:** left-aligned single column, generous whitespace, horizontal rules as the only decoration. Section numbers (`01`, `02`) in mono in the margin.
- Dark mode is **not** supported. This is printed paper.

### Motion system

- **Guilloché canvas.** Fullscreen fixed WebGL2 canvas behind all content. A fragment shader superimposes sinusoidal polar curves to produce rotating rosette interference patterns, thresholded into crisp hairlines with an ordered-dither pass for engraved-print texture. Ink on paper at low contrast (~8% opacity) so text stays fully readable.
  - Reacts to scroll velocity (rotation speed) and pointer (rosette centre offset). Both subtle.
  - DPR capped at 2. Resolution scales down if frame time degrades.
  - rAF loop pauses when the canvas is offscreen or the tab is blurred.
- **Split-character headlines.** Headline text is exploded into line → word → char. Each char carries its own CSS custom properties and rises out of a clip mask on a stagger, triggered by IntersectionObserver.
- **The story, engraved.** While the story section is on screen, the current frame of the toon is sampled from a sprite atlas and fed into the same field. Dark artwork lays down a fourth, much finer plate inside the silhouette — that density is what makes the figure read as an engraved portrait rather than a pasted-on cartoon. The plate cross-fades in and out at the section's edges so it never appears behind the hero or the disclosure copy. It is deliberately restrained: the captions carry the meaning, so the artwork must never compete with the type in front of it.
- **The plate fades up on first paint** rather than snapping in, so the engraving resolves into the page instead of appearing behind it.
- **Portrait viewports enlarge the artwork and crop it.** Contain-fitting a 16:9 frame into a 390×844 phone leaves the artwork about a quarter of the screen height — a thin strip. The frame's upper area is mostly empty, so portrait scales it up (capped at 1.7×) and lets the top crop, bringing it up to roughly 44% of the screen — near the middle — with figures large enough to read.

  The two are linked: filling more height on a portrait screen means seeing less of the frame's width, so the cap and the artwork's own layout are one decision. At full zoom only the central ~59% of the frame is visible, which is why the ledger sits well inside it. The gauges are narrower and closer in than they would otherwise be, and each ends up beneath the figure it belongs to.
- **Phones fetch a half-resolution atlas** (1920×1620, 133 KB) instead of the full sheet, which a browser would decode to tens of megabytes of texture. The shader addresses cells in normalised coordinates, so it neither knows nor cares which it gets. Small screens also cap the device pixel ratio at 1.5 and skip pointer tracking, which a touch device only reports mid-drag anyway.
- **The artwork is anchored to the bottom of the viewport**, not centred in it. The balance bars run along the frame's bottom edge, and bottom-anchoring keeps them pinned to the bottom of the screen at every aspect ratio — centring would float them up into the captions on any viewport narrower than the frame.
- **Scroll drives the story, not time.** The frame index is a pure function of scroll position, so scrolling up runs the story backwards at no extra cost. The displayed frame eases toward the target to give the scrub weight.
- **Hairline rules** draw left-to-right on entry.
- **Aura figures** count up when scrolled into view.
- **`prefers-reduced-motion`:** canvas renders a single static frame; all stagger, draw-on, and count-up animations are replaced by their final state. No motion at all.

## 5. Page structure and copy

Four beats. The mantra **"You roast. We verify. The aura moves."** closes the page as a refrain.

### 01 — Hero
> **AURABANK**
> The central bank of aura.
> Aura is not created. It is transferred.

Mono label: `ESTABLISHED 2026`. Scroll cue below the fold.

### 02 — How settlement works (the story)
A section four viewport-heights tall. The first height pins it; the remaining three scrub the toon.

**Type explains the mechanic; the artwork is atmosphere.** An engraving at low opacity behind text can carry mood but cannot carry information — a first attempt at making the artwork more explanatory made it cluttered and no clearer, and was reverted. Real typography at real size always wins, so the words do the work:

| | Headline | Explanation |
|---|---|---|
| `01` | Person A roasts Person B. | Two accounts. Watch their balances at the bottom of the screen. |
| `02` | Person B now owes aura. | Owed from the moment it landed. Nothing has moved yet. |
| `03` | Person A files a claim. | Naming Person B, the amount owed, and evidence of the roast. |
| `04` | Person B's aura moves to Person A. | Underwriters approve by hand. Aura is never created — only transferred. |

**Named actors are what make this legible to a newcomer.** An earlier version wrote the same steps in the second person — "you roast someone", "it lands" — and it did not land, because nothing bound the words to the two anonymous figures on screen. Naming Person A and Person B, labelling the two balance gauges `A` and `B` in the artwork, and putting them on the same sides as the figures gives the reader a mapping they never have to be taught. Step 01's explanation points at the gauges explicitly, so the instrument is introduced before it starts moving.

One step shows at a time, cross-faded, over a soft paper wash that keeps type crisp where it crosses the engraving.

On phones the captions sit directly under the section header and the artwork takes the lower third; from `md` up they drop to the bottom left and share the frame with the artwork, which is wide enough to carry them. The scrub is also shorter on phones — 2.8 viewport-heights against 4 — because dragging a small picture through four screens is a long way. `scrubProgress` reads the section's real height, so the frame mapping follows automatically.

**Nothing else is on screen while the story runs.** A step rail and a tape-position readout were both tried and removed: they collided with the artwork's balance bars and split attention three ways. During the scrub the viewport holds the artwork, the current step, and nothing more.

The **balance gauges drawn into the artwork are the only instrumentation**, and they carry the information that matters — aura leaving one account and arriving in another. They are outlined rather than plain bars, because a near-white track disappears once engraved, and each is labelled with its account (`A` left, `B` right) in drawn stencil letterforms, since the rasteriser has no font. The pinned band at the bottom of the section reserves clear space for them so no DOM element ever sits on top of the ledger.

Without JavaScript, or under reduced motion, every step renders as a plain numbered list with its explanation — the most informative state of the page, readable with no scrolling at all.

### 03 — Full disclosure
> Aura is zero-sum. Your gain is someone's loss. There is no aura printer.
>
> We do not issue aura. We hold no reserves. We move what already exists, between the people who earned and lost it.
>
> A balance can go below zero. We call this aura debt. It accrues, it is visible to everyone, and there is no bankruptcy protection.

Alongside, a ledger: `Aura issued by AuraBank — 0`, `Reserves held — 0`, `Specimen balance — in arrears — −1,240`.

### 04 — Open an account
> AuraBank is not yet accepting deposits.
> Join the waitlist. Accounts open in order of application.

Fields: handle, email. Submit: **Apply for an account.** Success renders as a statement receipt:
> `APPLICATION RECEIVED` · `POSITION #0042` · `STATUS: PENDING`

### Footer
Hairline rule, mono small print:
> AuraBank is not a bank. Not FDIC insured. Not insured in any way. Aura balances have no cash value and never will.

### Cut in revision
The standalone thesis section (folded into the hero), the prose settlement steps (now the story's captions), the aura debt section (merged into disclosure), and the four-question FAQ (dropped). Reading time is down by more than half; served markup fell from 52 KB to 31 KB.

## 6. Architecture

Each module has one job and is understandable without reading the others.

```
app/
  page.tsx                  composes sections in order; no logic
  layout.tsx                fonts, metadata, OG image
  actions/waitlist.ts       server action: validate -> rate-limit -> store
components/
  sections/                 one file per beat + Footer; presentational only
  sections/StoryScrub.tsx   owns the scroll captions and the tape readout
  canvas/GuillocheField.tsx client component; owns GL context, atlas texture, rAF loop
  canvas/guilloche-shaders.ts the GLSL, kept apart from the component that runs it
  motion/SplitHeadline.tsx  renders split-text output, applies stagger
  ui/                       Rule, MonoLabel, Figure, Mantra, Section
lib/
  motion/split-text.ts      pure: string -> Line[] -> Word[] -> Char[]. No DOM
  motion/use-reduced-motion.ts
  story/scrub.ts            pure: scroll position -> progress, frame, caption, fit
  story/atlas.ts            generated atlas geometry
  waitlist/store.ts         the only module that touches the database
  waitlist/schema.ts        zod schema for the signup payload
  waitlist/rate-limit.ts    in-memory per-IP counter
  waitlist/state.ts         form state shared by the action and the form
scripts/
  generate-story-frames.mjs draws the toon and packs the atlas
  lib/                      PNG encoder, rasteriser, the toon itself
public/story/story-atlas.png generated sprite sheet
data/waitlist.db            gitignored
```

**Module contracts:**

- `splitText(text: string): Line[]` — pure function, no DOM access, trivially unit-testable.
- `store.add({ handle, email }): { position: number; duplicate: boolean }`
- `store.count(): number`
- `store.list(): Entry[]`
- `GuillocheField` takes no content props. It knows nothing about page copy; it finds the story section by its `data-story-scrub` attribute.
- `scrubProgress(top, sectionHeight, viewportHeight)`, `frameForProgress(progress, frameCount)`, `captionForProgress(progress, captionCount)`, `storyScale(width, height, frameAspect)` — all pure, so the canvas and the caption track derive their state from the same maths and cannot disagree about where in the story the reader is.

Sections never import from `lib/waitlist/`. Only the server action does.

## 7. Waitlist data and flow

SQLite file at `data/waitlist.db`. One table:

| column | type | notes |
|---|---|---|
| `id` | integer pk | autoincrement; doubles as queue position |
| `handle` | text not null | display name / social handle |
| `email` | text not null unique | case-normalised before insert |
| `created_at` | text not null | ISO timestamp |

**Flow:** form submits to the server action → zod validates shape and email format → honeypot field must be empty → per-IP rate limit (5 per hour) → insert → return position.

**Abuse and privacy:**
- A duplicate email returns the **same success state** as a new signup, so the form cannot be used to test whether someone is already on the list.
- Honeypot field catches naive bots without a captcha.
- Rate limiting is in-memory and resets on server restart. Acceptable for a waitlist; noted as a known limitation.
- No email is ever displayed on the page. The public count, if shown, is a count only.

## 7a. The story atlas

96 frames — 8 seconds on twos, the traditional cartoon cadence — drawn at 480×270 and packed into one 8×12 greyscale PNG (3840×3240, ~290 KB). Greyscale because the shader reads luminance only.

Why an atlas rather than a video file: scrubbing a video means setting `currentTime`, which forces a decode-and-seek. Normal h264 carries keyframes seconds apart, so arbitrary seeks stutter, and reverse is far worse — the decoder must walk back to the previous keyframe and re-decode forward every time. Selecting an atlas cell is a texture lookup: no decode, no seek, and backwards costs exactly what forwards costs. Flat cartoon artwork also compresses far better as PNG than an all-keyframe video would (~290 KB against several MB).

The artwork is a placeholder: four acts of 24 frames — the roast crossing the frame, the impact, the claim filed with evidence, settlement crossing back while the ledger bars swap. Replacing it means regenerating the atlas with real frames at the same geometry:

```bash
node scripts/generate-story-frames.mjs   # rewrites the atlas and lib/story/atlas.ts
```

Frames pack left-to-right, top-to-bottom. If the geometry changes, the generator rewrites `lib/story/atlas.ts` to match, so nothing needs editing by hand.

## 8. Error handling

- **No WebGL2** → canvas is skipped entirely; page renders as clean editorial typography. This is a fully acceptable state, not a broken one.
- **Atlas fails to load** → the ambient engraving keeps running and the story simply never appears. The captions still tell the story in text.
- **Atlas not yet loaded** → a 1×1 white texture stands in, so early frames sample defined memory and render ambient-only.
- **Frame time degrades** → resolution scale drops before the animation is dropped.
- **Waitlist submit fails** (validation) → inline message under the field, in the bank's voice, form state preserved.
- **Waitlist submit fails** (server/disk) → generic failure message, error logged server-side, no stack trace exposed.
- **JavaScript disabled** → all copy is server-rendered and readable. Only motion and the canvas are lost.

## 9. Accessibility

- Every animation gated behind `prefers-reduced-motion`.
- Canvas is `aria-hidden` — it is decoration, never content.
- Split-char headlines must expose the intact string to screen readers, not a sequence of single letters.
- Waitlist form is keyboard-complete with visible focus rings and labelled inputs.
- Ink on paper exceeds WCAG AA. Accent colours are never the sole carrier of meaning.

## 10. Performance budget

- Initial JS: **176 KB gzipped, measured**. The original 120 KB target was set before the framework floor was known — Next 16 with React 19 accounts for the bulk of it, and the page's own code is a minority share. Revised rather than pretended.
- Story atlas: 290 KB, fetched once, cached, and never blocking first paint.
- LCP < 1.8s on a throttled 4G connection.
- 60fps desktop; 30fps floor on a mid-range phone, enforced by resolution scaling.
- No web fonts blocking first paint; fallback stack declared for every face.
- Zero runtime network requests to any external host — verifiable by loading the page with the network offline.

## 11. Testing

- **Unit:** `split-text` structure and edge cases (empty string, multiple spaces, punctuation); zod schema accept/reject; `store` insert, dedupe, and position numbering against a temp database file.
- **Component:** `GuillocheField` mounts and degrades cleanly when `getContext` returns null — which is exactly what happens under jsdom, so the fallback path is covered by default. Reduced-motion path asserts no rAF loop starts.
- **Manual pass before shipping:** mobile viewport, keyboard-only signup, CPU throttled 4×, reduced-motion enabled, JavaScript disabled.

## 12. Deployment assumption

SQLite on local disk requires a **persistent Node process**, not serverless — a serverless host's filesystem is ephemeral and would silently discard signups. Assumption: self-hosted Node on the user's own server. Backup is a file copy. Migrating to Postgres later touches only `lib/waitlist/store.ts`.

## 13. Deferred questions

- Domain name.
- Whether the public signup count is displayed (needs a floor before it flatters rather than embarrasses).
- Whether the future app is org-scoped or one global aura economy.
- OG image: static or generated per visitor.

## 14. What comes after this

Later sub-projects, each with its own spec: authentication and accounts → filing claims with evidence → the admin clearing queue → balances, statements, and aura debt → leaderboards.
