import type { Database } from "./database";
import type { AccountRow } from "./types";

export function sessionsTable(db: Database) {
  return {
    insert(entry: { token: string; accountId: number; expiresAt: string }): void {
      db.prepare(
        "INSERT INTO sessions (token, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
      ).run(entry.token, entry.accountId, new Date().toISOString(), entry.expiresAt);
    },

    /**
     * The account behind a token, or nothing.
     *
     * Expiry is applied in the WHERE clause rather than checked afterwards, so
     * there is no path through this function where a stale row is honoured.
     * ISO 8601 in UTC sorts lexicographically, which is why a TEXT comparison
     * is a real comparison.
     */
    accountFor(token: string, now = new Date()): AccountRow | undefined {
      return db
        .prepare(
          `SELECT a.id, a.handle, a.display_name, a.email, a.password_hash,
                  a.role, a.balance, a.opening_balance, a.created_at
             FROM sessions s
             JOIN accounts a ON a.id = s.account_id
            WHERE s.token = ? AND s.expires_at > ?`,
        )
        .get(token, now.toISOString()) as AccountRow | undefined;
    },

    destroy(token: string): void {
      db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    },

    /** Signing out everywhere, which is also what a password reset should do. */
    destroyAllFor(accountId: number): void {
      db.prepare("DELETE FROM sessions WHERE account_id = ?").run(accountId);
    },

    purgeExpired(now = new Date()): number {
      return db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now.toISOString())
        .changes;
    },
  };
}

export type SessionsTable = ReturnType<typeof sessionsTable>;
