#!/usr/bin/env node
/**
 * Re-derives every balance from the ledger and checks the bank agrees.
 *
 * `accounts.balance` is a cache. The ledger is the truth. If they ever
 * disagree, a write path is wrong and somebody's aura is a number nobody can
 * account for — which is the one failure this app cannot shrug off. Run it
 * after any restore, and after anything that touched a ruling.
 *
 *   node apps/bank/scripts/check-ledger.mjs
 *
 * Exits non-zero on any discrepancy, so it can be a healthcheck or a cron job.
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";

const databasePath = process.env.BANK_DB_PATH ?? "apps/bank/data/bank.db";

if (!existsSync(databasePath)) {
  console.error(`No ledger at ${databasePath}. Set BANK_DB_PATH if it lives elsewhere.`);
  process.exit(1);
}

const db = new DatabaseSync(databasePath, { readOnly: true });
const problems = [];

// 1. Every balance is its own opening balance plus everything that moved.
//    Own, not a shared constant: a member opens at 3,000 and the reserve at a
//    million, so assuming one number would report the bank as a million out.
const accounts = db
  .prepare("SELECT id, handle, balance, opening_balance FROM accounts ORDER BY id")
  .all();
const movements = new Map(
  db
    .prepare("SELECT account_id, SUM(delta) AS total FROM ledger_entries GROUP BY account_id")
    .all()
    .map((row) => [row.account_id, row.total]),
);

for (const account of accounts) {
  const derived = account.opening_balance + (movements.get(account.id) ?? 0);
  if (derived !== account.balance) {
    problems.push(
      `${account.handle}: holds ${account.balance}, ledger says ${derived} (out by ${account.balance - derived})`,
    );
  }
}

// 2. Settlement never creates or destroys aura, so every case nets to zero.
for (const row of db
  .prepare("SELECT case_id, SUM(delta) AS total, COUNT(*) AS entries FROM ledger_entries GROUP BY case_id")
  .all()) {
  if (row.total !== 0) problems.push(`case ${row.case_id}: entries sum to ${row.total}, not zero`);
  if (row.entries !== 2) problems.push(`case ${row.case_id}: has ${row.entries} entries, not two`);
}

// 3. Aura is still never created: what the reserve has paid out is exactly
//    what everyone else is up on their opening balance.
const reserve = accounts.find((a) => a.opening_balance !== 3000);
if (reserve) {
  const issued = reserve.opening_balance - reserve.balance;
  const received = accounts
    .filter((a) => a.id !== reserve.id)
    .reduce((sum, a) => sum + (a.balance - a.opening_balance), 0);
  if (issued !== received) {
    problems.push(`reserve has paid out ${issued} but members are up ${received}`);
  }
}

// 4. Only a granted case may have moved anything.
for (const row of db
  .prepare(
    `SELECT c.id, c.status FROM cases c
      WHERE c.status <> 'granted'
        AND EXISTS (SELECT 1 FROM ledger_entries l WHERE l.case_id = c.id)`,
  )
  .all()) {
  problems.push(`case ${row.id}: is ${row.status} but moved aura`);
}

for (const row of db
  .prepare(
    `SELECT c.id FROM cases c
      WHERE c.status = 'granted'
        AND NOT EXISTS (SELECT 1 FROM ledger_entries l WHERE l.case_id = c.id)`,
  )
  .all()) {
  problems.push(`case ${row.id}: judgment entered but nothing moved`);
}

// 5. The whole ledger is zero-sum: every movement had a counterparty.
const total = db.prepare("SELECT COALESCE(SUM(delta), 0) AS total FROM ledger_entries").get().total;
if (total !== 0) problems.push(`the ledger as a whole sums to ${total}, not zero`);

const integrity = db.prepare("PRAGMA integrity_check").get().integrity_check;
if (integrity !== "ok") problems.push(`sqlite integrity_check: ${integrity}`);

db.close();

if (problems.length > 0) {
  console.error(`LEDGER INCONSISTENT — ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  · ${problem}`);
  process.exit(1);
}

console.log(
  `Ledger consistent. ${accounts.length} account(s), ${movements.size} with movements, net zero.`,
);
