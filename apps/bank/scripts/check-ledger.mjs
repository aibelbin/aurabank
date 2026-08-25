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
import { reconcile } from "./lib/reconcile.mjs";

const databasePath = process.env.BANK_DB_PATH ?? "apps/bank/data/bank.db";

if (!existsSync(databasePath)) {
  console.error(`No ledger at ${databasePath}. Set BANK_DB_PATH if it lives elsewhere.`);
  process.exit(1);
}

const db = new DatabaseSync(databasePath, { readOnly: true });
const { problems, accounts, movements } = reconcile(db);

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
