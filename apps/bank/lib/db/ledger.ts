import { asNumber, type Database } from "./database";
import type { LedgerRow, Movement } from "./types";

export function ledgerTable(db: Database) {
  return {
    /** Recent movements on a statement, newest first. */
    listForAccount(accountId: number, limit = 20): Movement[] {
      return db
        .prepare(
          `SELECT l.*,
                  CASE WHEN c.claimant_id = l.account_id THEN re.handle ELSE cl.handle END
                    AS counterparty_handle,
                  c.amount AS case_amount
             FROM ledger_entries l
             JOIN cases c ON c.id = l.case_id
             JOIN accounts cl ON cl.id = c.claimant_id
             JOIN accounts re ON re.id = c.respondent_id
            WHERE l.account_id = ?
            ORDER BY l.id DESC
            LIMIT ?`,
        )
        .all(accountId, limit) as Movement[];
    },

    /**
     * Moves the aura. Debit, credit, and both entries, in four statements.
     *
     * MUST be called inside a transaction — on its own it can leave a balance
     * moved and no entry recording it, which is the one state this schema
     * cannot represent honestly.
     *
     * `balance_after` comes back from the UPDATE itself rather than a separate
     * SELECT, so the number written on the entry is the number the row now
     * holds, with nothing in between that could disagree.
     *
     * The pair of inserts is equal and opposite by construction: one `amount`,
     * one sign each. Settlement never creates or destroys aura.
     */
    settle(entry: {
      caseId: number;
      debitAccountId: number;
      creditAccountId: number;
      amount: number;
      at: string;
    }): void {
      const move = db.prepare(
        "UPDATE accounts SET balance = balance + ? WHERE id = ? RETURNING balance",
      );
      const record = db.prepare(
        `INSERT INTO ledger_entries (case_id, account_id, delta, balance_after, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      );

      const debited = move.get(-entry.amount, entry.debitAccountId) as { balance: number };
      const credited = move.get(entry.amount, entry.creditAccountId) as { balance: number };

      // UNIQUE (case_id, account_id) makes a second settlement of the same
      // case throw here rather than pay twice. That constraint is the
      // safeguard; this code being careful is not.
      record.run(entry.caseId, entry.debitAccountId, -entry.amount, debited.balance, entry.at);
      record.run(entry.caseId, entry.creditAccountId, entry.amount, credited.balance, entry.at);
    },

    listForCase(caseId: number): LedgerRow[] {
      return db
        .prepare("SELECT * FROM ledger_entries WHERE case_id = ? ORDER BY id")
        .all(caseId) as LedgerRow[];
    },

    /**
     * Balances re-derived from the ledger alone.
     *
     * `accounts.balance` is a cache of this sum. Anything that disagrees is a
     * bug in a write path, and the consistency script exists to find it before
     * a member does.
     */
    derivedBalances(): Map<number, number> {
      const rows = db
        .prepare("SELECT account_id, SUM(delta) AS total FROM ledger_entries GROUP BY account_id")
        .all() as Array<{ account_id: number; total: number }>;
      return new Map(rows.map((row) => [asNumber(row.account_id), asNumber(row.total)]));
    },

    /** Zero for every settled case, or aura was created out of nothing. */
    caseSums(): Array<{ case_id: number; total: number }> {
      return db
        .prepare("SELECT case_id, SUM(delta) AS total FROM ledger_entries GROUP BY case_id")
        .all() as Array<{ case_id: number; total: number }>;
    },
  };
}

export type LedgerTable = ReturnType<typeof ledgerTable>;
