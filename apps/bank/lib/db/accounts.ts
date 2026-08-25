import { asNumber, type Database } from "./database";
import { OPENING_BALANCE } from "@/lib/cases/amounts";
import type { AccountRow, Member, Role } from "./types";

const SELECT_ALL =
  "SELECT id, handle, display_name, email, password_hash, role, balance, opening_balance, created_at FROM accounts";

export function accountsTable(db: Database) {
  return {
    /**
     * Opens an account. The 3,000 opening balance is the column default, so
     * it is stated once, in the schema, rather than at every call site.
     */
    insert(entry: {
      handle: string;
      /** What they are called. Falls back to the handle when not given. */
      displayName?: string;
      email: string;
      passwordHash: string;
      role?: Role;
      /** Only the reserve opens with anything other than the member default. */
      openingBalance?: number;
      /** Fixed id, for seeding accounts that need a particular number. */
      id?: number;
    }): number {
      const opening = entry.openingBalance ?? OPENING_BALANCE;
      const result = db
        .prepare(
          `INSERT INTO accounts
             (id, handle, display_name, email, password_hash, role, balance, opening_balance, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          entry.id ?? null,
          entry.handle,
          entry.displayName?.trim() || entry.handle,
          entry.email,
          entry.passwordHash,
          entry.role ?? "member",
          opening,
          opening,
          new Date().toISOString(),
        );
      return entry.id ?? asNumber(result.lastInsertRowid);
    },

    /**
     * The bank's own account.
     *
     * Issuing aura is a transfer out of this, not a number appearing from
     * nowhere — which is what keeps the ledger summing to zero and keeps
     * `check-ledger` meaningful. There is exactly one, and it is not a person.
     */
    reserve(): AccountRow | undefined {
      return db.prepare(`${SELECT_ALL} WHERE role = 'reserve'`).get() as AccountRow | undefined;
    },

    byId(id: number): AccountRow | undefined {
      return db.prepare(`${SELECT_ALL} WHERE id = ?`).get(id) as AccountRow | undefined;
    },

    // COLLATE NOCASE on the column means a handle typed in any case finds it.
    byHandle(handle: string): AccountRow | undefined {
      return db.prepare(`${SELECT_ALL} WHERE handle = ?`).get(handle) as AccountRow | undefined;
    },

    byEmail(email: string): AccountRow | undefined {
      return db.prepare(`${SELECT_ALL} WHERE email = ?`).get(email) as AccountRow | undefined;
    },

    /** The membership, for the respondent picker and the docket. Never the reserve. */
    list(): Member[] {
      return db
        .prepare(
          `SELECT id, handle, display_name, role, balance FROM accounts
            WHERE role <> 'reserve' ORDER BY handle COLLATE NOCASE`,
        )
        .all() as Member[];
    },

    count(): number {
      const row = db.prepare("SELECT COUNT(*) AS total FROM accounts").get() as { total: number };
      return asNumber(row.total);
    },

    /** There is no reset email to send, so a judge sets a password by hand. */
    setPasswordHash(id: number, passwordHash: string): boolean {
      const result = db
        .prepare("UPDATE accounts SET password_hash = ? WHERE id = ?")
        .run(passwordHash, id);
      return result.changes > 0;
    },
  };
}

export type AccountsTable = ReturnType<typeof accountsTable>;
