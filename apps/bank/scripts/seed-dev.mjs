#!/usr/bin/env node
/**
 * Opens a few accounts and files a few cases, so the app has something in it
 * to look at.
 *
 * FOR LOCAL DEVELOPMENT ONLY. The accounts it creates use their own handle as
 * their password — five characters, well under the twelve the sign-up form
 * demands. That is possible here only because seeding writes a hash directly
 * and never goes through `/join`. On anything reachable from the internet this
 * would be a full compromise: the judge account can rule on any case, issue
 * invite codes, and move aura. The guards below refuse to run in production,
 * and they are not a substitute for not doing it.
 *
 *   npm run seed-dev --workspace apps/bank
 *   npm run seed-dev --workspace apps/bank -- --reset   # wipe first
 *
 * The password hash comes from the app's own `lib/auth/password.ts`, so these
 * accounts are indistinguishable from real ones rather than a second
 * implementation that could drift out of step with sign-in.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { hashPasswordSync } from "../lib/auth/password.ts";
import { SCHEMA } from "../lib/db/schema.ts";
import { RESERVE_HANDLE, RESERVE_OPENING_BALANCE } from "../lib/cases/amounts.ts";

if (process.env.NODE_ENV === "production") {
  console.error("seed-dev refuses to run with NODE_ENV=production.");
  process.exit(1);
}

const databasePath = process.env.BANK_DB_PATH ?? "apps/bank/data/bank.db";

// A second guard on the path itself: the compose file mounts the live ledger
// at /app/data, and an accident there is not recoverable from a script.
if (databasePath.startsWith("/app/")) {
  console.error(`seed-dev refuses to touch ${databasePath} — that is a deployed volume.`);
  process.exit(1);
}

if (process.argv.includes("--reset")) {
  for (const suffix of ["", "-wal", "-shm"]) rmSync(`${databasePath}${suffix}`, { force: true });
  console.log(`removed ${databasePath}`);
}

mkdirSync(dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(SCHEMA);

const existing = db.prepare("SELECT id FROM accounts WHERE handle = ?").get("naksh");
if (existing) {
  console.log("naksh already holds an account — nothing to do. Pass --reset to start over.");
  db.close();
  process.exit(0);
}

const OPENING = 3000;
const now = new Date();
const iso = (offsetHours = 0) =>
  new Date(now.getTime() + offsetHours * 60 * 60 * 1000).toISOString();

/** Handle doubles as the password. Stated plainly rather than hidden in a hash. */
function openAccount(handle, name, role, { id, openingBalance = 3000, password = handle } = {}) {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO accounts
         (id, handle, display_name, email, password_hash, role, balance, opening_balance, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id ?? null,
      handle,
      name,
      `${handle}@example.test`,
      role === "reserve" ? "unusable" : hashPasswordSync(password),
      role,
      openingBalance,
      openingBalance,
      iso(-24 * 9),
    );
  return id ?? Number(lastInsertRowid);
}

// The bank's own account. Citations are paid out of this, which is what keeps
// issuing aura a transfer rather than a number appearing from nowhere.
openAccount(RESERVE_HANDLE, "AuraBank", "reserve", {
  id: 1,
  openingBalance: RESERVE_OPENING_BALANCE,
});

const naksh = openAccount("naksh", "Naksh", "judge", { id: 7 });
const arjun = openAccount("arjun", "Arjun Menon", "member");
const meera = openAccount("meera", "Meera Nair", "member");

function fileCase({ claimant, respondent, amount, statement, status, filedHoursAgo, undefended = 0 }) {
  const filedAt = iso(-filedHoursAgo);
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO cases
         (claimant_id, respondent_id, amount, statement, status, undefended, filed_at, response_deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      claimant,
      respondent,
      amount,
      statement,
      status,
      undefended,
      filedAt,
      new Date(Date.parse(filedAt) + 24 * 60 * 60 * 1000).toISOString(),
    );
  return Number(lastInsertRowid);
}

// 1. Awaiting a reply from arjun, so the docket badge and the reply form appear.
fileCase({
  claimant: meera,
  respondent: arjun,
  amount: 500,
  statement:
    "The claimant states that the respondent described a documentary about sourdough as " +
    "\"actually insane\" in front of six people, having watched eleven minutes of it.",
  status: "awaiting_response",
  filedHoursAgo: 3,
});

// 2. Heard and waiting on the bench, so /admin has something to rule on.
const heard = fileCase({
  claimant: arjun,
  respondent: meera,
  amount: 100,
  statement:
    "The claimant states that the respondent applauded when the aircraft landed, and then " +
    "looked around the cabin for agreement.",
  status: "under_review",
  filedHoursAgo: 30,
});
// The hearing on that one, so the transcript has more than a filing in it.
const remark = db.prepare(
  "INSERT INTO remarks (case_id, author_id, body, created_at) VALUES (?, ?, ?, ?)",
);
remark.run(
  heard,
  meera,
  "The landing was, by any reasonable standard, difficult. I stand by the applause.",
  iso(-26),
);
remark.run(heard, naksh, "Was the aircraft in fact in difficulty, or merely late?", iso(-25));
remark.run(
  heard,
  arjun,
  "It was neither. It was a Tuesday, and the weather was clear from gate to gate.",
  iso(-24),
);

// 3. Already settled, so a statement has a movement on it and the stamp shows.
const settled = fileCase({
  claimant: arjun,
  respondent: meera,
  amount: 250,
  statement:
    "The claimant states that the respondent replied all to a thread of two hundred and " +
    "eleven people to say \"thanks\".",
  status: "granted",
  filedHoursAgo: 72,
});
db.prepare("UPDATE cases SET ruled_at = ?, ruled_by = ? WHERE id = ?").run(iso(-46), naksh, settled);

// The ledger, written exactly as a ruling writes it: equal and opposite, with
// the balance each party was left holding. `check-ledger` verifies this.
const record = db.prepare(
  `INSERT INTO ledger_entries (case_id, account_id, delta, balance_after, created_at)
   VALUES (?, ?, ?, ?, ?)`,
);
record.run(settled, meera, -250, OPENING - 250, iso(-46));
record.run(settled, arjun, 250, OPENING + 250, iso(-46));
db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(OPENING - 250, meera);
db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(OPENING + 250, arjun);

// A citation before the bench, so the reserve path has something on it too.
const citation = db
  .prepare(
    `INSERT INTO cases
       (kind, claimant_id, respondent_id, amount, statement, status, filed_at, response_deadline)
     VALUES ('citation', ?, 1, 250, ?, 'under_review', ?, ?)`,
  )
  .run(
    meera,
    "The claimant arrived at the festival in full ceremonial dress, on a Wednesday, " +
      "having told nobody she intended to. Three separate people have described it as unwell.",
    iso(-8),
    iso(16),
  );
void citation;

// An invite code sitting unredeemed, so /admin/invites is not an empty page.
db.prepare(
  "INSERT INTO invites (code, issued_to_email, issued_by, created_at) VALUES (?, ?, ?, ?)",
).run("TEST-CODE", "someone@example.test", naksh, iso(-12));

db.close();

console.log(`Seeded ${databasePath}.

  USERNAME  PASSWORD  NAME              ROLE
  naksh     naksh     Naksh             judge   — account #0007, sees /admin
  arjun     arjun     Arjun Menon       member  — a claim awaits his reply
  meera     meera     Meera Nair        member  — 250 down, one before the bench

Plus the reserve (aurabank, #0001) holding 1,000,000. It is not a person and
cannot be signed into; citations are paid out of it.

Four cases: one awaiting a reply, one part-heard, one settled, and one citation
against the reserve. One invite code outstanding: TEST-CODE.

  npm run dev:bank        then sign in at http://localhost:3001/sign-in

These passwords are five characters. Never seed them anywhere reachable.`);
