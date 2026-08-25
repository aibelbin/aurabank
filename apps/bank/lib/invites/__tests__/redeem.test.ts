// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBankStore, redeemInvite, type BankStore } from "@/lib/db/store";
import { newInviteCode, normaliseCode } from "../code";

const open: BankStore[] = [];
let directory: string | undefined;

function store(path = ":memory:") {
  const instance = createBankStore(path);
  open.push(instance);
  return instance;
}

/** A file rather than memory, so two connections can see the same invite. */
function sharedPath() {
  directory ??= mkdtempSync(join(tmpdir(), "aurabank-"));
  return join(directory, "bank.db");
}

function judgeWithCode(s: BankStore) {
  const judgeId = s.accounts.insert({
    handle: "aibel",
    email: "aibel@example.test",
    passwordHash: "x",
    role: "judge",
  });
  const code = newInviteCode();
  s.invites.issue({ code, issuedToEmail: null, issuedBy: judgeId });
  return code;
}

const applicant = {
  handle: "meera",
  displayName: "Meera Nair",
  email: "meera@example.test",
  passwordHash: "x",
};

afterEach(() => {
  for (const instance of open.splice(0)) instance.close();
  if (directory) {
    rmSync(directory, { recursive: true, force: true });
    directory = undefined;
  }
});

describe("invite codes", () => {
  it("reads back whatever spelling someone typed", () => {
    const code = newInviteCode();
    expect(normaliseCode(code.toLowerCase())).toBe(code);
    expect(normaliseCode(code.replace("-", ""))).toBe(code);
    expect(normaliseCode(` ${code.replace("-", " ")} `)).toBe(code);
  });

  it("refuses anything that is not a code", () => {
    expect(normaliseCode("")).toBe("");
    expect(normaliseCode("TOO-SHORT-BY-FAR-AND-MORE")).toBe("");
    // I, L, O and U are not in the alphabet, so a code full of them is nothing.
    expect(normaliseCode("IIII-LLLL")).toBe("");
  });

  it("admits the holder and opens their account at 3,000", () => {
    const s = store();
    const code = judgeWithCode(s);

    const outcome = redeemInvite(s, { code, ...applicant });

    expect(outcome).toEqual({ ok: true, accountId: expect.any(Number) });
    expect(s.accounts.byHandle("meera")).toMatchObject({ balance: 3000, role: "member" });
    expect(s.invites.get(code)).toMatchObject({ redeemed_by: 2 });
  });

  it("will not spend a code twice", () => {
    const s = store();
    const code = judgeWithCode(s);
    redeemInvite(s, { code, ...applicant });

    const second = redeemInvite(s, {
      code,
      handle: "vikram",
      displayName: "Vikram Rao",
      email: "vikram@example.test",
      passwordHash: "x",
    });

    expect(second).toEqual({ ok: false, reason: "already_redeemed" });
    expect(s.accounts.byHandle("vikram")).toBeUndefined();
  });

  it("cannot be spent twice by two connections that both saw it unused", () => {
    const path = sharedPath();
    const a = store(path);
    const b = store(path);
    const code = judgeWithCode(a);

    const applicantA = a.accounts.insert({ handle: "one", email: "1@x.test", passwordHash: "x" });
    const applicantB = a.accounts.insert({ handle: "two", email: "2@x.test", passwordHash: "x" });

    // Both readers see an unspent code — the read-then-write race, reproduced.
    expect(a.invites.get(code)?.redeemed_by).toBeNull();
    expect(b.invites.get(code)?.redeemed_by).toBeNull();

    // Only the conditional UPDATE decides which of them actually spent it.
    const results = [a.invites.redeem(code, applicantA), b.invites.redeem(code, applicantB)];

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("opens no account when the code is unknown", () => {
    const s = store();
    judgeWithCode(s);
    expect(redeemInvite(s, { code: "ZZZZ-ZZZZ", ...applicant })).toEqual({
      ok: false,
      reason: "unknown_code",
    });
    expect(s.accounts.count()).toBe(1);
  });

  it("keeps the code unspent when the handle is already taken", () => {
    const s = store();
    const code = judgeWithCode(s);
    s.accounts.insert({ handle: "meera", email: "other@example.test", passwordHash: "x" });

    expect(redeemInvite(s, { code, ...applicant })).toEqual({ ok: false, reason: "handle_taken" });
    expect(s.invites.get(code)?.redeemed_by).toBeNull();
  });

  it("keeps the code unspent when the email is already on an account", () => {
    const s = store();
    const code = judgeWithCode(s);
    s.accounts.insert({ handle: "other", email: "meera@example.test", passwordHash: "x" });

    expect(redeemInvite(s, { code, ...applicant })).toEqual({ ok: false, reason: "email_taken" });
    expect(s.invites.get(code)?.redeemed_by).toBeNull();
  });

  it("issues codes that do not collide", () => {
    const codes = new Set(Array.from({ length: 500 }, newInviteCode));
    expect(codes.size).toBe(500);
  });
});
