// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { OPENING_BALANCE } from "@/lib/cases/amounts";
import { createBankStore, enterJudgment, type BankStore } from "../store";

/**
 * Aura is money in this app. These are the tests that matter: the amount
 * moved, both balances agreeing with the ledger, and a ruling that cannot pay
 * twice however many times it is submitted.
 */

const NOW = new Date("2026-08-26T12:00:00.000Z");
const FILED = "2026-08-25T00:00:00.000Z";
const DEADLINE = "2026-08-26T00:00:00.000Z"; // already behind NOW

const open: BankStore[] = [];

afterEach(() => {
  for (const store of open.splice(0)) store.close();
});

function bench(amount = 250) {
  const store = createBankStore(":memory:");
  open.push(store);

  const claimant = store.accounts.insert({
    handle: "arjun",
    email: "arjun@example.test",
    passwordHash: "x",
  });
  const respondent = store.accounts.insert({
    handle: "meera",
    email: "meera@example.test",
    passwordHash: "x",
  });
  const judge = {
    id: store.accounts.insert({
      handle: "aibel",
      email: "aibel@example.test",
      passwordHash: "x",
      role: "judge",
    }),
    role: "judge",
  };

  const caseId = store.cases.insert({
    claimantId: claimant,
    respondentId: respondent,
    amount,
    statement: "in the matter of the reply-all",
    filedAt: FILED,
    responseDeadline: DEADLINE,
  });

  // Heard, and waiting on a ruling.
  store.cases.transition({ id: caseId, from: "awaiting_response", to: "under_review" });

  return { store, caseId, claimant, respondent, judge };
}

/** Balances rebuilt from the ledger alone, which the cache must agree with. */
function reconcile(store: BankStore) {
  const derived = store.ledger.derivedBalances();
  return store.accounts.list().map((account) => ({
    handle: account.handle,
    cached: account.balance,
    fromLedger: OPENING_BALANCE + (derived.get(account.id) ?? 0),
  }));
}

describe("granting a claim", () => {
  it("moves exactly the amount, from the respondent to the claimant", () => {
    const { store, caseId, claimant, respondent, judge } = bench(250);

    expect(enterJudgment(store, { caseId, judge, grant: true, now: NOW })).toEqual({
      ok: true,
      status: "granted",
      moved: 250,
    });

    expect(store.accounts.byId(claimant)?.balance).toBe(3250);
    expect(store.accounts.byId(respondent)?.balance).toBe(2750);
  });

  it("writes two entries that cancel out — settlement creates no aura", () => {
    const { store, caseId, judge } = bench(500);
    enterJudgment(store, { caseId, judge, grant: true, now: NOW });

    const entries = store.ledger.listForCase(caseId);
    expect(entries).toHaveLength(2);
    expect(entries.reduce((sum, entry) => sum + entry.delta, 0)).toBe(0);
    expect(store.ledger.caseSums()).toEqual([{ case_id: caseId, total: 0 }]);
  });

  it("records the balance each party was left holding", () => {
    const { store, caseId, claimant, respondent, judge } = bench(1000);
    enterJudgment(store, { caseId, judge, grant: true, now: NOW });

    const byAccount = new Map(
      store.ledger.listForCase(caseId).map((entry) => [entry.account_id, entry]),
    );
    expect(byAccount.get(claimant)).toMatchObject({ delta: 1000, balance_after: 4000 });
    expect(byAccount.get(respondent)).toMatchObject({ delta: -1000, balance_after: 2000 });
  });

  it("leaves every cached balance agreeing with the ledger", () => {
    const { store, caseId, judge } = bench(100);
    enterJudgment(store, { caseId, judge, grant: true, now: NOW });

    for (const row of reconcile(store)) {
      expect({ ...row, cached: row.fromLedger }).toEqual(row);
    }
  });

  it("takes a balance below zero rather than refusing — debt is the product", () => {
    const { store, caseId, respondent, judge } = bench(1000);
    store.db.prepare("UPDATE accounts SET balance = 200 WHERE id = ?").run(respondent);

    expect(enterJudgment(store, { caseId, judge, grant: true, now: NOW }).ok).toBe(true);
    expect(store.accounts.byId(respondent)?.balance).toBe(-800);
  });

  it("stamps the record with who ruled, and when", () => {
    const { store, caseId, judge } = bench();
    enterJudgment(store, { caseId, judge, grant: true, now: NOW });

    expect(store.cases.byId(caseId)).toMatchObject({
      status: "granted",
      ruled_at: NOW.toISOString(),
      ruled_by: judge.id,
      ruled_by_handle: "aibel",
    });
  });
});

describe("a ruling pays once", () => {
  it("refuses the second submission of the same judgment", () => {
    const { store, caseId, claimant, respondent, judge } = bench(250);

    const first = enterJudgment(store, { caseId, judge, grant: true, now: NOW });
    const second = enterJudgment(store, { caseId, judge, grant: true, now: NOW });

    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, reason: "This case is closed." });
    expect(store.accounts.byId(claimant)?.balance).toBe(3250);
    expect(store.accounts.byId(respondent)?.balance).toBe(2750);
    expect(store.ledger.listForCase(caseId)).toHaveLength(2);
  });

  it("pays nothing when the ledger constraint rejects a repeat", () => {
    const { store, caseId, claimant, respondent, judge } = bench(250);
    enterJudgment(store, { caseId, judge, grant: true, now: NOW });

    // Force the state guard open, leaving only UNIQUE (case_id, account_id)
    // between a retry and a double payment. This is the last line, tested.
    store.db.prepare("UPDATE cases SET status = 'under_review' WHERE id = ?").run(caseId);

    expect(() => enterJudgment(store, { caseId, judge, grant: true, now: NOW })).toThrow();
    expect(store.accounts.byId(claimant)?.balance).toBe(3250);
    expect(store.accounts.byId(respondent)?.balance).toBe(2750);
    expect(store.ledger.listForCase(caseId)).toHaveLength(2);
    expect(store.cases.rowById(caseId)?.status).toBe("under_review");
  });
});

describe("dismissing a claim", () => {
  it("moves no aura at all", () => {
    const { store, caseId, claimant, respondent, judge } = bench(500);

    expect(enterJudgment(store, { caseId, judge, grant: false, now: NOW })).toEqual({
      ok: true,
      status: "dismissed",
      moved: 0,
    });

    expect(store.accounts.byId(claimant)?.balance).toBe(3000);
    expect(store.accounts.byId(respondent)?.balance).toBe(3000);
    expect(store.ledger.listForCase(caseId)).toEqual([]);
  });
});

describe("who may enter a judgment", () => {
  it("refuses a member who is not a judge, and moves nothing", () => {
    const { store, caseId, claimant } = bench();
    const stranger = store.accounts.insert({
      handle: "vikram",
      email: "vikram@example.test",
      passwordHash: "x",
    });

    expect(
      enterJudgment(store, { caseId, judge: { id: stranger, role: "member" }, grant: true, now: NOW }),
    ).toEqual({ ok: false, reason: "Only a judge may enter judgment." });

    expect(store.accounts.byId(claimant)?.balance).toBe(3000);
    expect(store.ledger.listForCase(caseId)).toEqual([]);
  });

  it("refuses a claimant reaching for their own case, judge or not", () => {
    const { store, caseId, claimant } = bench();

    expect(
      enterJudgment(store, { caseId, judge: { id: claimant, role: "member" }, grant: true, now: NOW }),
    ).toEqual({ ok: false, reason: "A judge may not rule on a case they are party to." });

    expect(store.accounts.byId(claimant)?.balance).toBe(3000);
  });

  it("refuses a judge who is party to the case", () => {
    const { store, caseId, claimant, respondent } = bench();
    store.db.prepare("UPDATE accounts SET role = 'judge' WHERE id = ?").run(claimant);

    expect(
      enterJudgment(store, { caseId, judge: { id: claimant, role: "judge" }, grant: true, now: NOW }),
    ).toEqual({ ok: false, reason: "A judge may not rule on a case they are party to." });

    expect(store.accounts.byId(claimant)?.balance).toBe(3000);
    expect(store.accounts.byId(respondent)?.balance).toBe(3000);
    expect(store.ledger.listForCase(caseId)).toEqual([]);
  });

  it("refuses a case that has not been heard yet", () => {
    const { store, caseId, judge } = bench();
    store.db.prepare("UPDATE cases SET status = 'awaiting_response' WHERE id = ?").run(caseId);

    expect(enterJudgment(store, { caseId, judge, grant: true, now: NOW })).toEqual({
      ok: false,
      reason: "This case has not been heard yet.",
    });
    expect(store.ledger.listForCase(caseId)).toEqual([]);
  });

  it("refuses a case that does not exist", () => {
    const { store, judge } = bench();
    expect(enterJudgment(store, { caseId: 999, judge, grant: true, now: NOW })).toEqual({
      ok: false,
      reason: "No such case.",
    });
  });
});

/* ── citations ───────────────────────────────────────────────────────────── */

import { RESERVE_HANDLE, RESERVE_OPENING_BALANCE } from "@/lib/cases/amounts";

/**
 * Issuing aura is the one thing the bank said it would never do, and it is
 * still not doing it: a citation is a transfer out of the bank's own account.
 * These check that the money comes from somewhere real.
 */
function commendation() {
  const store = createBankStore(":memory:");
  open.push(store);

  const reserve = store.accounts.insert({
    handle: RESERVE_HANDLE,
    displayName: "AuraBank",
    email: "reserve@aurabank.invalid",
    passwordHash: "unusable",
    role: "reserve",
    openingBalance: RESERVE_OPENING_BALANCE,
  });
  const claimant = store.accounts.insert({
    handle: "meera",
    displayName: "Meera Nair",
    email: "meera@example.test",
    passwordHash: "x",
  });
  const judge = {
    id: store.accounts.insert({
      handle: "aibel",
      displayName: "Aibel Bin Zacariah",
      email: "aibel@example.test",
      passwordHash: "x",
      role: "judge",
    }),
    role: "judge",
  };

  const caseId = store.cases.insert({
    kind: "citation",
    claimantId: claimant,
    respondentId: reserve,
    amount: 250,
    statement: "arrived at the festival in full ceremonial dress, on a Wednesday",
    filedAt: FILED,
    responseDeadline: DEADLINE,
  });

  return { store, caseId, reserve, claimant, judge };
}

describe("granting a citation", () => {
  it("goes straight before the bench — the reserve does not defend itself", () => {
    const { store, caseId } = commendation();
    expect(store.cases.rowById(caseId)).toMatchObject({
      kind: "citation",
      status: "under_review",
    });
  });

  it("pays the claimant out of the reserve, and debits nobody else", () => {
    const { store, caseId, reserve, claimant, judge } = commendation();

    expect(enterJudgment(store, { caseId, judge, grant: true, now: NOW })).toEqual({
      ok: true,
      status: "granted",
      moved: 250,
    });

    expect(store.accounts.byId(claimant)?.balance).toBe(OPENING_BALANCE + 250);
    expect(store.accounts.byId(reserve)?.balance).toBe(RESERVE_OPENING_BALANCE - 250);
  });

  it("still sums to zero — the aura came from somewhere", () => {
    const { store, caseId, judge } = commendation();
    enterJudgment(store, { caseId, judge, grant: true, now: NOW });

    const entries = store.ledger.listForCase(caseId);
    expect(entries).toHaveLength(2);
    expect(entries.reduce((sum, entry) => sum + entry.delta, 0)).toBe(0);
  });

  it("reconciles every balance against its own opening figure", () => {
    const { store, caseId, judge } = commendation();
    enterJudgment(store, { caseId, judge, grant: true, now: NOW });

    const derived = store.ledger.derivedBalances();
    for (const account of [...store.accounts.list(), store.accounts.reserve()!]) {
      const row = store.accounts.byId(account.id)!;
      expect({ handle: row.handle, balance: row.balance }).toEqual({
        handle: row.handle,
        balance: row.opening_balance + (derived.get(row.id) ?? 0),
      });
    }
  });

  it("pays once, however many times it is submitted", () => {
    const { store, caseId, reserve, claimant, judge } = commendation();
    enterJudgment(store, { caseId, judge, grant: true, now: NOW });
    const second = enterJudgment(store, { caseId, judge, grant: true, now: NOW });

    expect(second).toEqual({ ok: false, reason: "This case is closed." });
    expect(store.accounts.byId(claimant)?.balance).toBe(OPENING_BALANCE + 250);
    expect(store.accounts.byId(reserve)?.balance).toBe(RESERVE_OPENING_BALANCE - 250);
  });

  it("moves nothing when refused", () => {
    const { store, caseId, reserve, claimant, judge } = commendation();

    expect(enterJudgment(store, { caseId, judge, grant: false, now: NOW })).toMatchObject({
      ok: true,
      status: "dismissed",
      moved: 0,
    });
    expect(store.accounts.byId(claimant)?.balance).toBe(OPENING_BALANCE);
    expect(store.accounts.byId(reserve)?.balance).toBe(RESERVE_OPENING_BALANCE);
  });
});
