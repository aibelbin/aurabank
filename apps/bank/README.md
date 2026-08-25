# AuraBank — The Clearing House

Sub-project 2: the bank itself. Accounts, invite codes, filing a case, the
respondent's reply, the public docket, judgment, and aura moving atomically.

Design spec (source of truth):
[`docs/superpowers/specs/2026-08-25-aurabank-app-design.md`](../../docs/superpowers/specs/2026-08-25-aurabank-app-design.md)

## Running it

```bash
npm run dev:bank      # http://localhost:3001
npm run build:bank
npm run start:bank
```

The bank needs a first account before anyone can sign in. An invite code needs
an issuer, an issuer needs an account, and an account needs a code — something
has to start outside that loop:

```bash
BANK_JUDGE_HANDLE=you \
BANK_JUDGE_EMAIL=you@example.com \
BANK_JUDGE_PASSWORD=something-long \
npm run dev:bank
```

Read once, when the accounts table is empty. Leaving the variables set
afterwards does nothing, and changing them does not change an existing
password.

| Variable | Default | What it is |
|---|---|---|
| `BANK_DB_PATH` | `data/bank.db` | The ledger |
| `BANK_EVIDENCE_DIR` | `evidence` | Exhibits, on disk, never in the database |
| `BANK_JUDGE_*` | — | Opens the first account; see above |

## A test account

For looking around locally, rather than typing a bootstrap every time:

```bash
npm run seed-dev --workspace apps/bank            # add to whatever is there
npm run seed-dev --workspace apps/bank -- --reset # wipe and start over
```

| Handle | Password | Role | |
|---|---|---|---|
| `naksh` | `naksh` | judge | account #0007, sees `/admin` and `/admin/invites` |
| `arjun` | `arjun` | member | has a claim awaiting his reply |
| `meera` | `meera` | member | is 250 down, and has one before the bench |

Plus the reserve — `aurabank`, account #0001, holding 1,000,000. It is not a
person, cannot be signed into, and is not in the respondent picker; citations
are paid out of it.

It also files three cases — one awaiting a reply, one awaiting judgment, one
settled — and leaves an invite code outstanding, so no screen is empty.

**Local only.** These passwords are five characters, well under the twelve the
sign-up form demands; that is possible only because seeding writes a hash
directly and never goes through `/join`. The judge account can rule on any
case, issue codes, and move aura, so on anything reachable this is a full
compromise. The script refuses to run under `NODE_ENV=production` or against a
path under `/app/`, and those guards are not a substitute for not doing it.

## Where things are

```
app/(public)/      sign-in and join — the only routes without a session
app/(member)/      everything else; the layout is the door
app/(member)/admin/  requires role = 'judge'; a member gets a 404, not a refusal
app/exhibit/       serves evidence to members and to nobody else
lib/db/            the only module that writes SQL
lib/cases/         the lifecycle, as a pure function
lib/evidence/      sniffing, metadata stripping, and the file store
components/chrome/ the document frame every screen is set in
```

## The rules that are enforced rather than intended

- **A ruling moves aura exactly once.** `UNIQUE (case_id, account_id)` on the
  ledger, not care in the handler. `lib/db/store.ts` explains the three layers.
- **A judge may not rule on a case they are party to.** `actorFor` checks party
  membership before the judge flag, so such a judge is never "judge" on that
  case. Adding moderators is a data change, not an audit.
- **Issuing aura is still a transfer.** A citation names the reserve as
  respondent, so an award debits the bank and credits the member through the
  same ledger path as any other ruling. Nothing anywhere mints.
- **A hearing takes turns.** `mayRemark` is a pure function: the parties
  alternate, the bench speaks whenever, and the filing is the claimant's first
  turn.
- **An invite code is single use.** A conditional `UPDATE … WHERE redeemed_by
  IS NULL`, never a read-then-write.
- **`accounts.balance` is a cache of the ledger.** `npm run check-ledger
  --workspace apps/bank` re-derives every balance and fails if they disagree.
  Run it after any restore.

## Testing

Deliberately minimal, per §13 of the spec: the ledger transfer, the case state
machine, invite redemption, passwords and session expiry — plus the schema
constraints and metadata stripping, because a GPS leak is as expensive to get
wrong as a balance. No component, layout, or snapshot tests.

```bash
npm test --workspace apps/bank
```

## Offline

There is no offline cache of anybody's pages, deliberately. A copy of a
balance or a case sheet sitting in a service worker cache on a shared phone is
a worse failure than being offline. What the app does instead:

- `experimental.useOffline` detects a dropped connection and **retries the
  blocked navigation or server action** when it returns — a reply filed with
  one bar is sent, not lost.
- The service worker caches only the static `/offline` document and immutable
  build assets, and serves that document when a page cannot be fetched.

## Deploying

Its own compose project, image, and volumes — separate from the landing page so
that deploying one cannot restart the other, and `docker compose down -v` on
one cannot touch the other's data.

```bash
cp .env.example .env        # set BANK_JUDGE_* in it
docker compose -f compose.bank.yaml up -d --build
docker logs aurabank-bank-cloudflared 2>&1 | grep -o 'https://.*trycloudflare.com'
```

The quick tunnel's hostname changes on restart, and sessions are cookies scoped
to a hostname — so a restart signs everybody out. Put a named tunnel in front
before anyone relies on staying signed in.

Backups land in `./backups/bank` on the host, hourly: a `VACUUM INTO` snapshot
of the ledger, integrity-checked **and reconciled** against the ledger before it
is kept, plus a copy of the exhibits under the same timestamp. A restore that
returns the cases without their plates returns a docket nobody can re-read.

## Regenerating the icons

```bash
npm run icons --workspace apps/bank
```

Drawn from nothing by `scripts/generate-icons.mjs` — no icon service, no binary
export nobody can reproduce.
