import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type WaitlistEntry = { handle: string; email: string };

export type AddResult = {
  /** Queue position. Stable, and the same value on a repeat application. */
  position: number;
  duplicate: boolean;
};

export type WaitlistRecord = {
  id: number;
  handle: string;
  email: string;
  created_at: string;
};

export type WaitlistStore = {
  add(entry: WaitlistEntry): AddResult;
  count(): number;
  list(): WaitlistRecord[];
  close(): void;
};

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS waitlist (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    handle     TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );
`;

/**
 * The only module that touches the database.
 *
 * Backed by a local SQLite file — no hosted service, no credentials, and the
 * whole flow is testable offline. Swapping to Postgres later means
 * reimplementing this one factory; nothing else knows how storage works.
 */
export function createWaitlistStore(databasePath: string): WaitlistStore {
  mkdirSync(dirname(databasePath), { recursive: true });

  const db = new DatabaseSync(databasePath);
  // WAL keeps reads from blocking the write that follows a submission, and
  // lets the backup process read a consistent snapshot while the app writes.
  db.exec("PRAGMA journal_mode = WAL;");
  // FULL fsyncs on every commit. The default (NORMAL) can lose the last few
  // transactions if the machine loses power, which for a signup means telling
  // someone they are on the list and then not having them. Signups are rare
  // enough that the cost of an fsync each time is irrelevant.
  db.exec("PRAGMA synchronous = FULL;");
  db.exec(SCHEMA);

  return {
    add({ handle, email }) {
      const existing = db.prepare("SELECT id FROM waitlist WHERE email = ?").get(email) as
        | { id: number }
        | undefined;

      if (existing) {
        return { position: Number(existing.id), duplicate: true };
      }

      const result = db
        .prepare("INSERT INTO waitlist (handle, email, created_at) VALUES (?, ?, ?)")
        .run(handle, email, new Date().toISOString());

      return { position: Number(result.lastInsertRowid), duplicate: false };
    },

    count() {
      const row = db.prepare("SELECT COUNT(*) AS total FROM waitlist").get() as { total: number };
      return Number(row.total);
    },

    list() {
      return db
        .prepare("SELECT id, handle, email, created_at FROM waitlist ORDER BY id")
        .all() as WaitlistRecord[];
    },

    close() {
      db.close();
    },
  };
}

const DEFAULT_DATABASE_PATH = process.env.WAITLIST_DB_PATH ?? "data/waitlist.db";

let singleton: WaitlistStore | undefined;

/** Process-wide store for the running app. Tests build their own instead. */
export function getWaitlistStore(): WaitlistStore {
  singleton ??= createWaitlistStore(DEFAULT_DATABASE_PATH);
  return singleton;
}
