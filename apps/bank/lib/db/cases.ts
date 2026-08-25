import { asNumber, type Database } from "./database";
import type {
  CaseKind,
  CaseListing,
  CaseRow,
  CaseStatus,
  ExhibitRow,
  RemarkListing,
} from "./types";

const SELECT_LISTING = `
  SELECT c.*,
         cl.handle AS claimant_handle,
         cl.display_name AS claimant_name,
         re.handle AS respondent_handle,
         re.display_name AS respondent_name,
         re.role AS respondent_role,
         ju.handle AS ruled_by_handle
    FROM cases c
    JOIN accounts cl ON cl.id = c.claimant_id
    JOIN accounts re ON re.id = c.respondent_id
    LEFT JOIN accounts ju ON ju.id = c.ruled_by
`;

export function casesTable(db: Database) {
  return {
    insert(entry: {
      kind?: CaseKind;
      claimantId: number;
      respondentId: number;
      amount: number;
      statement: string;
      filedAt: string;
      responseDeadline: string;
    }): number {
      const kind = entry.kind ?? "claim";
      // A citation has no respondent to hear from — the reserve does not
      // defend itself — so it goes straight before the bench.
      const status: CaseStatus = kind === "citation" ? "under_review" : "awaiting_response";
      const result = db
        .prepare(
          `INSERT INTO cases
             (kind, claimant_id, respondent_id, amount, statement, status, filed_at, response_deadline)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          kind,
          entry.claimantId,
          entry.respondentId,
          entry.amount,
          entry.statement,
          status,
          entry.filedAt,
          entry.responseDeadline,
        );
      return asNumber(result.lastInsertRowid);
    },

    byId(id: number): CaseListing | undefined {
      return db.prepare(`${SELECT_LISTING} WHERE c.id = ?`).get(id) as CaseListing | undefined;
    },

    /** Raw row, for use inside a transaction where joins are dead weight. */
    rowById(id: number): CaseRow | undefined {
      return db.prepare("SELECT * FROM cases WHERE id = ?").get(id) as CaseRow | undefined;
    },

    /** The docket: every case, newest first. Visible to any signed-in member. */
    listAll(): CaseListing[] {
      return db.prepare(`${SELECT_LISTING} ORDER BY c.id DESC`).all() as CaseListing[];
    },

    /** Every case an account is party to, either side. */
    listForAccount(accountId: number): CaseListing[] {
      return db
        .prepare(
          `${SELECT_LISTING} WHERE c.claimant_id = ? OR c.respondent_id = ? ORDER BY c.id DESC`,
        )
        .all(accountId, accountId) as CaseListing[];
    },

    /** The admin queue. Cases whose hearing is over and whose ruling is not. */
    listAwaitingJudgment(): CaseListing[] {
      return db
        .prepare(`${SELECT_LISTING} WHERE c.status = 'under_review' ORDER BY c.id ASC`)
        .all() as CaseListing[];
    },

    /**
     * Cases whose reply window has lapsed. Marking them is a scheduled sweep
     * in spirit, but this app has no scheduler: it runs on read, which is
     * enough because nobody can act on a case without first loading it.
     */
    listLapsed(now: string): CaseRow[] {
      return db
        .prepare(
          "SELECT * FROM cases WHERE status = 'awaiting_response' AND response_deadline <= ?",
        )
        .all(now) as CaseRow[];
    },

    /** The size of the admin queue, for the index in the footer. */
    countAwaitingJudgment(): number {
      const row = db
        .prepare("SELECT COUNT(*) AS total FROM cases WHERE status = 'under_review'")
        .get() as { total: number };
      return asNumber(row.total);
    },

    /** Cases waiting on this member's reply — the docket's unread badge. */
    countAwaitingResponseFrom(accountId: number): number {
      const row = db
        .prepare(
          "SELECT COUNT(*) AS total FROM cases WHERE respondent_id = ? AND status = 'awaiting_response'",
        )
        .get(accountId) as { total: number };
      return asNumber(row.total);
    },

    /**
     * Moves a case, and only from where the caller believed it was.
     *
     * Every write to `status` goes through here with a `from` guard, so a
     * double-submitted form changes one row the first time and none the
     * second. The state machine decides *whether*; this decides *once*.
     */
    transition(entry: {
      id: number;
      from: CaseStatus;
      to: CaseStatus;
      undefended?: boolean;
      ruledAt?: string | null;
      ruledBy?: number | null;
    }): boolean {
      const result = db
        .prepare(
          `UPDATE cases
              SET status = ?,
                  undefended = COALESCE(?, undefended),
                  ruled_at = COALESCE(?, ruled_at),
                  ruled_by = COALESCE(?, ruled_by)
            WHERE id = ? AND status = ?`,
        )
        .run(
          entry.to,
          entry.undefended === undefined ? null : Number(entry.undefended),
          entry.ruledAt ?? null,
          entry.ruledBy ?? null,
          entry.id,
          entry.from,
        );
      return result.changes > 0;
    },
  };
}

export function remarksTable(db: Database) {
  return {
    insert(entry: { caseId: number; authorId: number; body: string }): void {
      db.prepare(
        "INSERT INTO remarks (case_id, author_id, body, created_at) VALUES (?, ?, ?, ?)",
      ).run(entry.caseId, entry.authorId, entry.body, new Date().toISOString());
    },

    /** The hearing in the order it happened. */
    listForCase(caseId: number): RemarkListing[] {
      return db
        .prepare(
          `SELECT r.*, a.handle AS author_handle, a.display_name AS author_name, a.role AS author_role
             FROM remarks r
             JOIN accounts a ON a.id = r.author_id
            WHERE r.case_id = ?
            ORDER BY r.id`,
        )
        .all(caseId) as RemarkListing[];
    },

    /** Whether the respondent has answered at all — what closes the window. */
    hasReplyFrom(caseId: number, accountId: number): boolean {
      const row = db
        .prepare("SELECT 1 AS found FROM remarks WHERE case_id = ? AND author_id = ? LIMIT 1")
        .get(caseId, accountId) as { found: number } | undefined;
      return row !== undefined;
    },
  };
}

export function exhibitsTable(db: Database) {
  return {
    insert(entry: {
      caseId: number;
      uploadedBy: number;
      filename: string;
      mime: string;
      bytes: number;
    }): number {
      const result = db
        .prepare(
          `INSERT INTO exhibits (case_id, uploaded_by, filename, mime, bytes, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          entry.caseId,
          entry.uploadedBy,
          entry.filename,
          entry.mime,
          entry.bytes,
          new Date().toISOString(),
        );
      return asNumber(result.lastInsertRowid);
    },

    listForCase(caseId: number): ExhibitRow[] {
      return db
        .prepare("SELECT * FROM exhibits WHERE case_id = ? ORDER BY id")
        .all(caseId) as ExhibitRow[];
    },

    byFilename(filename: string): ExhibitRow | undefined {
      return db.prepare("SELECT * FROM exhibits WHERE filename = ?").get(filename) as
        | ExhibitRow
        | undefined;
    },
  };
}

export type CasesTable = ReturnType<typeof casesTable>;
export type RemarksTable = ReturnType<typeof remarksTable>;
export type ExhibitsTable = ReturnType<typeof exhibitsTable>;
