import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA } from "./schema";

export type SqlValue = string | number | bigint | null | Uint8Array;

export type Statement = {
  get(...params: SqlValue[]): unknown;
  all(...params: SqlValue[]): unknown[];
  /** `changes` is normalised to a number: every caller compares it to zero. */
  run(...params: SqlValue[]): { changes: number; lastInsertRowid: number | bigint };
};

export type Database = {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  close(): void;
};

/**
 * `node:sqlite` returns rows with a null prototype.
 *
 * React refuses to send one of those from a server component to a client
 * component — it cannot tell a null-prototype object from a class instance,
 * and neither is safe to serialise. Converting here rather than at each call
 * site means a row cannot reach a component still carrying it, which is a
 * failure that only shows up on the one page that happens to pass rows down.
 *
 * Rows are flat, so a shallow copy is the whole conversion.
 */
function plain(row: unknown): unknown {
  return row === undefined || row === null ? row : { ...(row as object) };
}

/**
 * Opens the ledger and puts it in the state the rest of the app assumes.
 *
 * The three pragmas are not tuning knobs, they are correctness:
 *  - WAL so a read never blocks the write behind it, and so the backup
 *    sidecar can snapshot a live database.
 *  - FULL fsyncs every commit. Aura is money here; a power cut that loses the
 *    last transaction loses a judgment somebody was told had been entered.
 *  - foreign_keys is OFF by default in SQLite, so every REFERENCES in the
 *    schema is decoration until this runs.
 */
export function openDatabase(databasePath: string): Database {
  if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });

  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = FULL;");
  db.exec("PRAGMA foreign_keys = ON;");
  // The backup sidecar and the app hold separate connections to the same WAL
  // file. Without a timeout, a writer that meets a held lock fails instantly
  // rather than waiting the few milliseconds the other transaction needs.
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);

  return {
    prepare(sql) {
      const statement = db.prepare(sql);
      return {
        get: (...params) => plain(statement.get(...params)),
        all: (...params) => statement.all(...params).map(plain),
        run: (...params) => {
          const result = statement.run(...params);
          return { changes: Number(result.changes), lastInsertRowid: result.lastInsertRowid };
        },
      };
    },
    exec: (sql) => db.exec(sql),
    close: () => db.close(),
  };
}

/**
 * Runs `body` inside one transaction, rolling back if it throws.
 *
 * `node:sqlite` has no transaction helper, and a ruling that writes two ledger
 * entries and two balances without one can leave aura half-moved. IMMEDIATE
 * takes the write lock up front rather than upgrading mid-transaction, which
 * is what turns two concurrent rulings into a clean lock error instead of a
 * partially applied one.
 */
export function transaction<T>(db: Database, body: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = body();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** SQLite hands back bigint for rowids; the app counts in numbers. */
export function asNumber(value: number | bigint): number {
  return Number(value);
}
