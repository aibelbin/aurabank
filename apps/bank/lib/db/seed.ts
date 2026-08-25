import { hashPasswordSync } from "@/lib/auth/password";
import { RESERVE_HANDLE, RESERVE_OPENING_BALANCE } from "@/lib/cases/amounts";
import type { BankStore } from "./store";

/**
 * Opens the bank's own account, once.
 *
 * Aura issued for a citation comes out of here, which is the whole reason it
 * exists: an award is then an ordinary transfer, the ledger still sums to
 * zero, and `check-ledger` keeps meaning what it says. Without it, issuing
 * would be a number appearing from nowhere.
 *
 * It is not a person. It never signs in — the password hash below matches no
 * password anyone can type — it never files, and it is not in the respondent
 * picker.
 */
export function seedReserve(store: BankStore): void {
  if (store.accounts.reserve()) return;

  store.accounts.insert({
    handle: RESERVE_HANDLE,
    displayName: "AuraBank",
    email: "reserve@aurabank.invalid",
    // Not a hash of anything: `verifyPassword` rejects a malformed record, so
    // no password matches and the account cannot be signed into.
    passwordHash: "unusable",
    role: "reserve",
    openingBalance: RESERVE_OPENING_BALANCE,
  });
  console.log(`[bank] opened the reserve at ${RESERVE_OPENING_BALANCE.toLocaleString("en-US")}`);
}

/**
 * Opens the first account, the judge's, from the environment.
 *
 * There is a bootstrap problem otherwise: an invite code needs an issuer, an
 * issuer needs an account, and an account needs a code. Something has to be
 * outside that loop, and a value set on the host is the smallest something —
 * no CLI to keep working, no "first visitor becomes admin" race on a public URL.
 *
 * Read once, when the accounts table is empty. Leaving these set afterwards
 * does nothing, and changing them does not change an existing password.
 */
export function seedJudge(store: BankStore): void {
  const handle = process.env.BANK_JUDGE_HANDLE?.trim();
  const email = process.env.BANK_JUDGE_EMAIL?.trim().toLowerCase();
  const password = process.env.BANK_JUDGE_PASSWORD;

  if (!handle || !email || !password) return;
  // The reserve is not a member, so it does not count as the bank being open.
  if (store.accounts.list().length > 0) return;

  store.accounts.insert({
    handle,
    displayName: process.env.BANK_JUDGE_NAME?.trim() || handle,
    email,
    passwordHash: hashPasswordSync(password),
    role: "judge",
    // A recognisable number for the bench. Members open from 8 onwards.
    id: Number(process.env.BANK_JUDGE_ID ?? 7),
  });
  console.log(`[bank] opened the judge's account for ${handle}`);
}
