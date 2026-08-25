// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createBankStore } from "../store";

/**
 * The constraints in the schema are load-bearing, not documentation. Each one
 * below stands in for a bug that would otherwise be caught by being careful,
 * and being careful is not a mechanism.
 */
function store() {
  return createBankStore(":memory:");
}

function member(s: ReturnType<typeof store>, handle: string) {
  return s.accounts.insert({ handle, email: `${handle}@example.test`, passwordHash: "x" });
}

describe("schema", () => {
  it("opens with foreign keys enforced", () => {
    const s = store();
    const row = s.db.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number };
    expect(row.foreign_keys).toBe(1);
    s.close();
  });

  it("opens every account at 3,000 as a member", () => {
    const s = store();
    const id = member(s, "arjun");
    expect(s.accounts.byId(id)).toMatchObject({ balance: 3000, role: "member" });
    s.close();
  });

  it("refuses a second account on the same handle, whatever the case", () => {
    const s = store();
    member(s, "arjun");
    expect(() =>
      s.accounts.insert({ handle: "ARJUN", email: "other@example.test", passwordHash: "x" }),
    ).toThrow();
    s.close();
  });

  it("refuses a case that names the same person twice", () => {
    const s = store();
    const id = member(s, "arjun");
    expect(() =>
      s.cases.insert({
        claimantId: id,
        respondentId: id,
        amount: 100,
        statement: "self-inflicted",
        filedAt: "2026-08-25T00:00:00.000Z",
        responseDeadline: "2026-08-26T00:00:00.000Z",
      }),
    ).toThrow();
    s.close();
  });

  it("refuses a second ledger entry for the same party on the same case", () => {
    const s = store();
    const claimant = member(s, "arjun");
    const respondent = member(s, "meera");
    const caseId = s.cases.insert({
      claimantId: claimant,
      respondentId: respondent,
      amount: 100,
      statement: "in the matter of the reply-all",
      filedAt: "2026-08-25T00:00:00.000Z",
      responseDeadline: "2026-08-26T00:00:00.000Z",
    });

    const write = () =>
      s.db
        .prepare(
          `INSERT INTO ledger_entries (case_id, account_id, delta, balance_after, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(caseId, claimant, 100, 3100, "2026-08-25T00:00:00.000Z");

    write();
    expect(write).toThrow();
    s.close();
  });

  it("refuses a case naming an account that does not exist", () => {
    const s = store();
    const claimant = member(s, "arjun");
    expect(() =>
      s.cases.insert({
        claimantId: claimant,
        respondentId: 9999,
        amount: 100,
        statement: "against a ghost",
        filedAt: "2026-08-25T00:00:00.000Z",
        responseDeadline: "2026-08-26T00:00:00.000Z",
      }),
    ).toThrow();
    s.close();
  });
});
