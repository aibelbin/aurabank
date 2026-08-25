# AuraBank — The Clearing House

**Date:** 2026-08-25
**Status:** Approved design, ready to build
**Sub-project:** 2 of N — the bank app itself

> **Read this first if you are starting cold.** This document is written to be
> built from without the conversation that produced it. Every decision below was
> made deliberately; where a decision has a reason that is not obvious, the
> reason is stated. Do not re-litigate them — change them if the user asks.

---

## 0. How to build this

**Invoke the `frontend-design` skill before building any screen.** The visual
language is already established by the landing page and by `packages/design`;
that skill is what keeps new screens from drifting into generic defaults.

**The user has asked to keep token spend low.** That has three consequences and
they are deliberate, not laziness:

- **No implementation plan document.** Build straight from §14's build order.
- **Tests only where being wrong is expensive.** §13 lists exactly which tests
  are non-negotiable and says what to skip. Aura is money in this app; the
  ledger gets tests. A layout does not.
- **Do not restate this spec back to the user.** Build, then show what works.

## 1. Context

AuraBank is a gamified social fintech app where Person A roasts Person B, files
a claim with evidence, and on approval the aura debits B and credits A.

The repository is a monorepo on npm workspaces:

```
apps/landing/      sub-project 1, shipped and deployed
packages/design/   shared design system — tokens, type and motion primitives
apps/bank/         THIS SPEC — does not exist yet
```

`apps/landing` is live on the `fox` server behind a Cloudflare tunnel. Read its
`README.md` and `CLAUDE.md` before starting; the constraints there apply here.

**Inherited hard constraints — all of these still hold:**

- **Everything is local.** No CDN, no external fonts, no analytics, no hosted
  database, no third-party services at runtime. Fonts are bundled woff2.
- **No dark mode.** The design is ink on paper.
- **Accent colours only on figures.** Settlement green and debt red appear on
  numbers, never on body text or chrome.
- **Deadpan voice.** Institutional bank language applied to absurd subject
  matter. The joke never winks.
- **Every animation gated** behind `prefers-reduced-motion`.
- **One owner per database.** `apps/bank` never reads the landing page's
  waitlist file. See §11.
- **No `packages/db`, no `packages/types`.** Sharing a schema across apps
  recreates at compile time the coupling the split exists to avoid.

## 2. Scope

**In scope:** accounts and sign-in, invite codes, filing a case, the respondent's
reply, the public docket, your ruling, and aura moving atomically.

**Out of scope, each getting its own spec later:** the leaderboard (a route in
this app reading a precomputed snapshot table — never a live aggregate), push
notifications, full statement history and exports, appeals, org scoping.

**Designed for but not built:** moderators. The `role` column and the
"a judge may not rule on their own case" check exist from day one. Retrofitting
authorization is where authorization bugs live.

## 3. Locked decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Sign-in | Handle + password, no email at all | Sending mail needs an external service, which breaks local-only |
| Access | Invite code, single use | Aura is zero-sum, so open signup is an aura-farming vector |
| Invite delivery | The user emails codes from their own mail client | The app never sends mail; the constraint survives |
| Account creation | Code redemption still collects email, handle, password | The code grants entry, it does not carry an identity |
| Opening balance | 3,000, may go negative | Debt is part of the product |
| Claim amount | Fixed schedule, not free entry | Makes claims comparable and the ruling a yes/no |
| Evidence | Screenshots plus a written account | A screenshot alone rarely shows why it landed |
| Adjudication | A hearing: claimant, respondent, judge | Gives the accused a right of reply |
| Case visibility | Public gallery to signed-in members | A verdict nobody witnessed is just an admin queue |
| No response | Undefended after 24 hours, judge may then rule | Stops one silent person freezing a claim forever |
| Judges | The owner only, moderators later | Single admin flag now, model ready for more |

**Known accepted inconsistency:** the landing page states "We do not issue aura.
We hold no reserves" and shows `Aura issued by AuraBank — 0`. A 3,000 opening
balance contradicts this. The user has decided it does not matter. Recorded here
so it is not rediscovered as a bug and silently "fixed".

## 4. The concept

**A bank that holds hearings.** Not an admin queue with jokes painted on it — a
court, in the same deadpan institutional register as the landing page.

The vocabulary does real work. It tells the accused they are a **respondent**
with a right of reply rather than the victim of a moderator action, and it makes
approve/reject read as a **ruling** rather than moderation.

Use throughout: *In the matter of A vs B* · claimant · respondent · exhibit ·
the docket · undefended · judgment entered · dismissed.

## 5. Visual direction

### Consistency is a hard requirement

Every colour, typeface and primitive comes from `packages/design`. **Never
redefine a token in the app.** If a screen needs something the design package
does not have, add it to the design package — that is what it is for.

Already available and to be used as-is: `MonoLabel`, `Rule`, `Figure`,
`Section`, `Mantra`, `SplitHeadline`, `cn`, `useInView`, `useReducedMotion`.

**Extract to `packages/design` as part of this build**, because the app needs
them and consistency depends on them being shared rather than reimplemented:

- `Button` — the ink block with mono uppercase label, as on the waitlist form
- `Field` — label plus underlined input, as on the waitlist form
- `Status` — a mono pill for case state

Refactor `apps/landing/components/sections/WaitlistForm.tsx` to consume the
extracted `Button` and `Field`. That is the proof the extraction is faithful: if
the landing page still looks identical afterwards, the primitives are right.

### The organising metaphor

**Every screen is a document.** Home is a statement. A case is a case sheet. The
docket is a register. Nothing is a "dashboard" and nothing is a "card".

### Signature element — the case sheet

Claimant and respondent as **facing blocks with a hairline spine between them**,
the exhibits pinned below as numbered plates (`EXHIBIT 01`), and the ruling
landing as a **stamp** across the head of the sheet.

That stamp is **the single orchestrated motion in the entire app.** Everything
else is instant. Spend the boldness in one place, and gate the stamp behind
`prefers-reduced-motion` like everything else.

On phones the facing blocks stack vertically and the spine becomes a rule
between them. The side-by-side sheet is the *laptop* variant, not the default.

## 6. Mobile-first, concretely

The phone is the design target; the laptop is the adaptation. Non-negotiable:

- **Single column by default.** Multi-column layouts appear at `md` and up only.
- **Primary action within thumb reach** — a fixed bottom action bar
  (`File a claim`, `Respond`, `Enter judgment`), never a top-right button.
- **No hover-dependent affordance anywhere.** Everything works on first tap.
- **Minimum 44×44px touch targets.**
- **`svh` units**, never `vh`, for anything full-height.
- **Upload straight from the camera roll**, `accept="image/*"`.
- **Installable PWA** — manifest and icons. **No push notifications:** iOS makes
  them unreliable enough that promising them is worse than not having them.
  Unread state is an in-app badge on the docket.
- Test every screen at 390×844 before considering it done.

## 7. Screens

| Route | Purpose |
|---|---|
| `/sign-in` | Handle + password |
| `/join` | Redeem an invite code, then create the account |
| `/statement` | Home. Balance figure, recent movements, primary action |
| `/file` | File a case: respondent, amount, account, exhibits |
| `/docket` | Register of cases, open and ruled — visible to any signed-in member, not to the internet |
| `/case/[id]` | The case sheet: parties, statements, exhibits, ruling |
| `/admin` | Cases awaiting judgment |
| `/admin/invites` | Issue and track invite codes |

Signed-out visitors reaching anything other than `/sign-in` or `/join` are
redirected to `/sign-in`. `/admin*` requires `role = 'judge'`.

## 8. The case lifecycle

```
filed ──▶ awaiting_response ──(24h elapsed)──▶ under_review ──▶ granted
              │                                    ▲             └─▶ dismissed
              └── respondent replies ──────────────┘

claimant may withdraw at any point before judgment ──▶ withdrawn
```

A case whose window lapsed is flagged `undefended` and may be ruled without the
respondent. This is a status **on the record**, not a silent default — "judgment
entered in the absence of the respondent" is the voice.

Implement the transition rules as a **pure function** over
`(status, action, actor, now)`. It is the one piece of logic worth unit-testing
exhaustively, and keeping it pure makes that cheap.

## 9. Data model

SQLite via `node:sqlite`, same as the landing page. `journal_mode = WAL`,
`synchronous = FULL`, `foreign_keys = ON`.

```sql
CREATE TABLE accounts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  handle        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','judge')),
  balance       INTEGER NOT NULL DEFAULT 3000,
  created_at    TEXT NOT NULL
);

CREATE TABLE invites (
  code            TEXT PRIMARY KEY,
  issued_to_email TEXT,                                   -- optional note
  issued_by       INTEGER NOT NULL REFERENCES accounts(id),
  created_at      TEXT NOT NULL,
  redeemed_by     INTEGER REFERENCES accounts(id),        -- NULL = unused
  redeemed_at     TEXT
);

CREATE TABLE cases (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  claimant_id       INTEGER NOT NULL REFERENCES accounts(id),
  respondent_id     INTEGER NOT NULL REFERENCES accounts(id),
  amount            INTEGER NOT NULL,
  statement         TEXT NOT NULL,
  status            TEXT NOT NULL
                    CHECK (status IN ('awaiting_response','under_review',
                                      'granted','dismissed','withdrawn')),
  undefended        INTEGER NOT NULL DEFAULT 0,
  filed_at          TEXT NOT NULL,
  response_deadline TEXT NOT NULL,
  ruled_at          TEXT,
  ruled_by          INTEGER REFERENCES accounts(id),
  CHECK (claimant_id <> respondent_id)                    -- no self-dealing
);

CREATE TABLE responses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id    INTEGER NOT NULL UNIQUE REFERENCES cases(id), -- one reply per case
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE exhibits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id     INTEGER NOT NULL REFERENCES cases(id),
  uploaded_by INTEGER NOT NULL REFERENCES accounts(id),
  filename    TEXT NOT NULL,          -- name on disk, not the original name
  mime        TEXT NOT NULL,
  bytes       INTEGER NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE ledger_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id       INTEGER NOT NULL REFERENCES cases(id),
  account_id    INTEGER NOT NULL REFERENCES accounts(id),
  delta         INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at    TEXT NOT NULL,
  UNIQUE (case_id, account_id)        -- makes double-payment impossible
);

CREATE TABLE sessions (
  token      TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
```

**The ledger is the truth; `accounts.balance` is a cache of it.** Every ruling
writes both ledger entries and updates both balances inside one transaction. A
consistency check that re-derives every balance by summing the ledger must
agree — worth a script, and worth running after any restore.

## 10. Correctness invariants

These are the things that must not be wrong. Everything else is cosmetic.

1. **A ruling moves aura exactly once.** Two clicks, a double-submitted form, a
   retry after a timeout — none may double-pay. This is enforced by
   `UNIQUE (case_id, account_id)` on the ledger, **not** by being careful in the
   handler. Wrap the whole ruling in one SQLite transaction.
2. **Debit and credit are equal and opposite.** `SUM(delta)` across a case is
   exactly zero. Settlement never creates or destroys aura.
3. **A judge may not rule on a case they are party to.** Trivially true while
   there is one judge; the check exists now so that adding moderators is a data
   change, not an audit.
4. **A case may not name the same person twice.** Enforced by a table CHECK.
5. **An invite code is single use.** Redemption must be a conditional update
   (`WHERE redeemed_by IS NULL`) and not a read-then-write.

## 11. Invites and the waitlist boundary

`apps/bank` **must not read** the landing page's waitlist database. Instead:

- `apps/landing` gains a small export command that prints waitlist applications
  (handle, email, position) to stdout.
- The user runs it, copies an address, and issues a code in `/admin/invites`
  with that address recorded in `issued_to_email` as a note.
- Codes may also be issued with no address at all, for handing out directly.

One copy-paste, and the two apps stay independent. Codes are single-use and are
**not** bound to the address they were sent to — binding would block someone
signing up with a different address than they joined the waitlist with, and
single use already limits how far a code can spread.

## 12. Auth, evidence, and abuse

**Passwords:** `scrypt` from `node:crypto` with a per-account random salt. No
dependency, no native module, nothing to keep patched. Store `salt:hash`.

**Sessions:** opaque random token in an `httpOnly`, `sameSite=lax`, `secure`
cookie; 30 day expiry; row deleted on sign-out.

**No password reset flow.** There is no email to send one through. The user
resets a password by hand as judge. Say so on the sign-in screen rather than
offering a "forgot password" link that cannot work.

**Evidence:** files on disk in their own volume, never in the database. Cap at
5 MB, allowlist `image/png` `image/jpeg` `image/webp`, generate the stored
filename rather than trusting the uploaded one, and **strip EXIF on upload** —
phone photos carry GPS. Serve through a route that requires a session, so
exhibits are visible to members and not to the open internet.

**Backups must cover the evidence volume too**, or a restore returns cases whose
exhibits are gone. Follow `apps/landing`'s backup pattern: `VACUUM INTO` for the
database, integrity-checked, plus the files, written to a host directory.

**Rate limits:** filing a case, redeeming a code, and signing in. Reuse the
approach in `apps/landing/lib/waitlist/rate-limit.ts`.

## 13. Testing — deliberately minimal

The user has asked for few tests. Write these and stop:

- **The ledger transfer.** Grants move exactly the right amount, both balances
  agree with the ledger, and ruling the same case twice does not pay twice.
  This is money; it gets real tests.
- **The case state machine.** The pure transition function, across every status
  and actor combination, including undefended timeout and withdrawal.
- **Invite redemption.** A code cannot be used twice, including concurrently.
- **Password hash and session expiry.** Verify accepts the right password,
  rejects the wrong one, and an expired session is not a valid session.

**Skip:** component rendering tests, layout tests, copy assertions, snapshot
tests. If a screen looks wrong the user will see it immediately; if the ledger
is wrong nobody sees it until the numbers are already wrong.

## 14. Build order

Each step should leave the app runnable. Verify with `npm run dev` and a phone
viewport as you go rather than at the end.

1. **Scaffold `apps/bank`** by copying the landing app's config shape: Next 16,
   `output: "standalone"`, `transpilePackages: ["@aurabank/design"]`,
   `outputFileTracingRoot` at the repo root, its own `tsconfig`, its own vitest.
   Add the boundary test that forbids importing another app.
2. **Extract `Button`, `Field`, `Status`** into `packages/design` and refactor
   the landing waitlist form onto them. The landing page must look unchanged.
3. **Schema and store.** All tables, WAL, `synchronous = FULL`, foreign keys on.
   One module owns the database, as `lib/waitlist/store.ts` does today.
4. **Auth**: scrypt hashing, sessions, `/sign-in`, sign-out, route protection.
5. **Invites**: issue and redeem, `/join`, `/admin/invites`, the landing-side
   waitlist export command.
6. **Statement**: balance figure and recent movements. First real screen —
   invoke `frontend-design` here and set the document language for everything
   after it.
7. **Filing**: `/file` with respondent picker, amount schedule, statement,
   exhibit upload.
8. **The case sheet**: `/case/[id]` with facing parties, exhibits, and status.
   The signature screen. Build the ruling stamp here.
9. **Response**: the respondent's reply, the 24-hour window, undefended marking.
10. **Judgment**: `/admin`, the ruling action, and the atomic ledger transfer.
11. **The docket**: `/docket`, the public register.
12. **PWA manifest, icons, offline shell.**
13. **Deploy**: own compose project, own image, own volumes for database and
    evidence, own backup sidecar, own Cloudflare tunnel.

## 15. The amount schedule

Fixed tiers, defined in one constant so they can be tuned without a migration.
Named in the register of a fee schedule, not a game:

| Amount | Classification |
|---|---|
| 100 | Minor |
| 250 | Material |
| 500 | Severe |
| 1,000 | Catastrophic |

Against a 3,000 opening balance, a catastrophic finding is a third of everything
you have. That is the intended weight.

## 16. Copy and empty states

Errors do not apologise and are never vague. An empty screen is an invitation to
act, in the bank's voice:

- Empty statement: *No movements. Your aura has not been contested.*
- Empty docket: *The docket is clear.*
- Empty admin queue: *No cases await judgment.*
- Wrong password: *Those credentials do not match an account.*
- Used invite code: *That code has already been redeemed.*
- Self-claim attempt: *A claim requires two parties.*

Buttons say what happens and keep the same word through the flow: `File a claim`
produces `Claim filed`; `Enter judgment` produces `Judgment entered`.

## 17. Accessibility and performance floor

Inherited from the landing page and not negotiable: visible keyboard focus,
every animation gated behind `prefers-reduced-motion`, forms fully keyboard
operable with labelled inputs, ink on paper exceeding WCAG AA, and accent colour
never the sole carrier of meaning.

The app is behind a login and so may ship more JavaScript than the landing page,
but the same instinct applies: server-render everything that can be, and reach
for a client component only where interaction demands it.
