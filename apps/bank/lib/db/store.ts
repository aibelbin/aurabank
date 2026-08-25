import { accountsTable } from "./accounts";
import { casesTable, exhibitsTable, remarksTable } from "./cases";
import { openDatabase, transaction, type Database } from "./database";
import { invitesTable } from "./invites";
import { ledgerTable } from "./ledger";
import { actorFor, transitionFor } from "@/lib/cases/lifecycle";
import { seedJudge, seedReserve } from "./seed";
import { sessionsTable } from "./sessions";

/**
 * The clearing house's one database, and the only door into it.
 *
 * Nothing outside `lib/db` writes SQL. That is not tidiness: the ledger's
 * correctness rests on a handful of transactions and conditional updates, and
 * they can only be trusted if there is one place they can be read.
 *
 * This database belongs to this app alone. The landing page's waitlist is a
 * separate file with a separate owner; invited addresses arrive here by a
 * copy-paste from its export command, never by a second reader.
 */
export type BankStore = {
  accounts: ReturnType<typeof accountsTable>;
  sessions: ReturnType<typeof sessionsTable>;
  invites: ReturnType<typeof invitesTable>;
  cases: ReturnType<typeof casesTable>;
  remarks: ReturnType<typeof remarksTable>;
  exhibits: ReturnType<typeof exhibitsTable>;
  ledger: ReturnType<typeof ledgerTable>;
  /** For the cross-table transactions in `lib/db` only. */
  db: Database;
  close(): void;
};

export function createBankStore(databasePath: string): BankStore {
  const db = openDatabase(databasePath);

  return {
    accounts: accountsTable(db),
    sessions: sessionsTable(db),
    invites: invitesTable(db),
    cases: casesTable(db),
    remarks: remarksTable(db),
    exhibits: exhibitsTable(db),
    ledger: ledgerTable(db),
    db,
    close() {
      db.close();
    },
  };
}

export type RedeemOutcome =
  | { ok: true; accountId: number }
  | { ok: false; reason: "unknown_code" | "already_redeemed" | "handle_taken" | "email_taken" };

/** Thrown only to roll the transaction back; never escapes `redeemInvite`. */
class InviteRaceLost extends Error {}

/**
 * Spends a code and opens the account it admits, or neither.
 *
 * These have to happen together. The account cannot be created first — an
 * abandoned half-signup would hold a handle nobody uses. The code cannot be
 * spent first — `redeemed_by` names an account that would not exist yet.
 *
 * Two safeguards, not one. The transaction makes the pair atomic; the
 * conditional UPDATE inside `invites.redeem` makes the code single-use even if
 * two callers both read it as unspent before either wrote.
 */
export function redeemInvite(
  store: BankStore,
  entry: {
    code: string;
    handle: string;
    displayName: string;
    email: string;
    passwordHash: string;
  },
): RedeemOutcome {
  try {
    return transaction(store.db, (): RedeemOutcome => {
      const invite = store.invites.get(entry.code);
      if (!invite) return { ok: false, reason: "unknown_code" };
      if (invite.redeemed_by !== null) return { ok: false, reason: "already_redeemed" };

      // Checked before inserting so the applicant is told which field to
      // change, rather than being handed a constraint violation.
      if (store.accounts.byHandle(entry.handle)) return { ok: false, reason: "handle_taken" };
      if (store.accounts.byEmail(entry.email)) return { ok: false, reason: "email_taken" };

      const accountId = store.accounts.insert({
        handle: entry.handle,
        displayName: entry.displayName,
        email: entry.email,
        passwordHash: entry.passwordHash,
      });

      if (!store.invites.redeem(entry.code, accountId)) {
        // Somebody spent it in the gap. Roll the new account back with it.
        throw new InviteRaceLost();
      }

      return { ok: true, accountId };
    });
  } catch (error) {
    if (error instanceof InviteRaceLost) return { ok: false, reason: "already_redeemed" };
    throw error;
  }
}

export type JudgmentOutcome =
  | { ok: true; status: "granted" | "dismissed"; moved: number }
  | { ok: false; reason: string };

/**
 * Enters a judgment, and moves the aura if it is a finding.
 *
 * Everything here happens in one transaction, so a ruling either lands whole
 * or not at all. Three separate things stop a case being paid twice, and the
 * order is deliberate:
 *
 *  1. The lifecycle function decides whether this actor may rule at all. It is
 *     asked here rather than in the handler, so a second entry point cannot
 *     skip it.
 *  2. `cases.transition` moves the row only `WHERE status = 'under_review'`.
 *     A double-submitted form changes one row the first time and none the
 *     second, and the second attempt ends here.
 *  3. `UNIQUE (case_id, account_id)` on the ledger. If both of the above were
 *     somehow passed, the insert throws and the transaction rolls back. This
 *     is the guarantee — the first two are how the member gets a sentence
 *     instead of a stack trace.
 */
export function enterJudgment(
  store: BankStore,
  entry: { caseId: number; judge: { id: number; role: string }; grant: boolean; now?: Date },
): JudgmentOutcome {
  const now = entry.now ?? new Date();

  return transaction(store.db, (): JudgmentOutcome => {
    // Re-read under the write lock: whatever the page rendered may be stale.
    const legalCase = store.cases.rowById(entry.caseId);
    if (!legalCase) return { ok: false, reason: "No such case." };

    const move = transitionFor(
      {
        status: legalCase.status,
        responseDeadline: legalCase.response_deadline,
        undefended: legalCase.undefended === 1,
      },
      entry.grant ? "grant" : "dismiss",
      actorFor(legalCase, entry.judge),
      now,
    );

    if (!move.allowed) return { ok: false, reason: move.reason };

    const moved = store.cases.transition({
      id: legalCase.id,
      from: move.from,
      to: move.to,
      undefended: move.undefended,
      ruledAt: now.toISOString(),
      ruledBy: entry.judge.id,
    });

    if (!moved) return { ok: false, reason: "This case has already been ruled on." };

    if (move.to === "granted") {
      store.ledger.settle({
        caseId: legalCase.id,
        debitAccountId: legalCase.respondent_id,
        creditAccountId: legalCase.claimant_id,
        amount: legalCase.amount,
        at: now.toISOString(),
      });
    }

    return {
      ok: true,
      status: move.to === "granted" ? "granted" : "dismissed",
      moved: move.to === "granted" ? legalCase.amount : 0,
    };
  });
}

const DEFAULT_DATABASE_PATH = process.env.BANK_DB_PATH ?? "data/bank.db";

let singleton: BankStore | undefined;

/** Process-wide store for the running app. Tests build their own instead. */
export function getBankStore(): BankStore {
  if (!singleton) {
    singleton = createBankStore(DEFAULT_DATABASE_PATH);
    // The reserve first: the bench is opened against a bank that already has
    // somewhere to pay awards from.
    seedReserve(singleton);
    seedJudge(singleton);
  }
  return singleton;
}
