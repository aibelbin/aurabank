import type { Database } from "./database";
import type { InviteListing, InviteRow } from "./types";

export function invitesTable(db: Database) {
  return {
    issue(entry: { code: string; issuedToEmail: string | null; issuedBy: number }): void {
      db.prepare(
        "INSERT INTO invites (code, issued_to_email, issued_by, created_at) VALUES (?, ?, ?, ?)",
      ).run(entry.code, entry.issuedToEmail, entry.issuedBy, new Date().toISOString());
    },

    get(code: string): InviteRow | undefined {
      return db.prepare("SELECT * FROM invites WHERE code = ?").get(code) as InviteRow | undefined;
    },

    /**
     * Spends a code, and reports whether it was this call that spent it.
     *
     * The `redeemed_by IS NULL` predicate is the whole safety property: two
     * concurrent redemptions both run this UPDATE, and exactly one of them
     * sees a row change. Reading first and writing second would let both
     * through the gap between the two statements.
     */
    redeem(code: string, accountId: number): boolean {
      const result = db
        .prepare(
          "UPDATE invites SET redeemed_by = ?, redeemed_at = ? WHERE code = ? AND redeemed_by IS NULL",
        )
        .run(accountId, new Date().toISOString(), code);
      return result.changes > 0;
    },

    list(): InviteListing[] {
      return db
        .prepare(
          `SELECT i.*, a.handle AS redeemed_by_handle
             FROM invites i
             LEFT JOIN accounts a ON a.id = i.redeemed_by
            ORDER BY i.created_at DESC`,
        )
        .all() as InviteListing[];
    },
  };
}

export type InvitesTable = ReturnType<typeof invitesTable>;
