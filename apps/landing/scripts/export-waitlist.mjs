#!/usr/bin/env node
/**
 * Prints the waitlist to stdout.
 *
 * This exists so the bank never reads this database. One owner per database:
 * the waitlist belongs to the landing page, and an address reaches the bank by
 * a person copying it into an invite code, not by a second process opening
 * this file. That copy-paste is the whole boundary, and it is worth it — two
 * apps that share a schema are one app with extra steps.
 *
 *   node apps/landing/scripts/export-waitlist.mjs           # a readable table
 *   node apps/landing/scripts/export-waitlist.mjs --csv     # for a spreadsheet
 *   node apps/landing/scripts/export-waitlist.mjs --emails  # addresses alone
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";

const databasePath = process.env.WAITLIST_DB_PATH ?? "apps/landing/data/waitlist.db";

if (!existsSync(databasePath)) {
  console.error(`No waitlist at ${databasePath}. Set WAITLIST_DB_PATH if it lives elsewhere.`);
  process.exit(1);
}

const db = new DatabaseSync(databasePath, { readOnly: true });
const rows = db.prepare("SELECT id, handle, email, created_at FROM waitlist ORDER BY id").all();
db.close();

const mode = process.argv.includes("--csv")
  ? "csv"
  : process.argv.includes("--emails")
    ? "emails"
    : "table";

if (mode === "emails") {
  for (const row of rows) console.log(row.email);
} else if (mode === "csv") {
  console.log("position,handle,email,applied_at");
  for (const row of rows) {
    // Quote-escape, because a handle may contain anything a person typed.
    const cells = [row.id, row.handle, row.email, row.created_at].map(
      (cell) => `"${String(cell).replaceAll('"', '""')}"`,
    );
    console.log(cells.join(","));
  }
} else {
  const width = Math.max(6, ...rows.map((row) => row.handle.length));
  console.log(`${"POS".padEnd(6)}${"HANDLE".padEnd(width + 2)}EMAIL`);
  for (const row of rows) {
    const position = `#${String(row.id).padStart(4, "0")}`;
    console.log(`${position.padEnd(6)}${row.handle.padEnd(width + 2)}${row.email}`);
  }
  console.log(`\n${rows.length} application${rows.length === 1 ? "" : "s"}.`);
}
