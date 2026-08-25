/**
 * Re-derives every balance from the ledger and reports what disagrees.
 *
 * Shared by `check-ledger.mjs` and the backup sidecar on purpose. They had
 * separate copies once, and when the reserve arrived — opening at a million
 * rather than the member's 3,000 — only one of them learned about it. The
 * backup then refused every snapshot as inconsistent, which is the right
 * failure but for the wrong reason. One implementation, two callers.
 */

/** What a member's account opens with. The reserve opens with far more. */
export const MEMBER_OPENING_BALANCE = 3000;

export function reconcile(db) {
  const problems = [];

  // Each account against its OWN opening figure. Assuming a shared constant is
  // what broke this before: the reserve would read as a million out.
  const accounts = db
    .prepare("SELECT id, handle, balance, opening_balance FROM accounts ORDER BY id")
    .all();

  const movements = new Map(
    db
      .prepare("SELECT account_id, SUM(delta) AS total FROM ledger_entries GROUP BY account_id")
      .all()
      .map((row) => [row.account_id, row.total]),
  );

  for (const account of accounts) {
    const derived = account.opening_balance + (movements.get(account.id) ?? 0);
    if (derived !== account.balance) {
      problems.push(
        `${account.handle}: holds ${account.balance}, ledger says ${derived} ` +
          `(out by ${account.balance - derived})`,
      );
    }
  }

  // Settlement never creates or destroys aura: every case nets to zero, on
  // exactly two entries — one debit, one credit.
  for (const row of db
    .prepare(
      "SELECT case_id, SUM(delta) AS total, COUNT(*) AS entries FROM ledger_entries GROUP BY case_id",
    )
    .all()) {
    if (row.total !== 0) problems.push(`case ${row.case_id}: entries sum to ${row.total}, not zero`);
    if (row.entries !== 2) problems.push(`case ${row.case_id}: has ${row.entries} entries, not two`);
  }

  // What the reserve has paid out is exactly what everyone else is up. This is
  // the issuing claim, checked: aura leaves the bank, it is not conjured.
  const reserve = accounts.find((account) => account.opening_balance !== MEMBER_OPENING_BALANCE);
  if (reserve) {
    const issued = reserve.opening_balance - reserve.balance;
    const received = accounts
      .filter((account) => account.id !== reserve.id)
      .reduce((sum, account) => sum + (account.balance - account.opening_balance), 0);
    if (issued !== received) {
      problems.push(`reserve has paid out ${issued} but members are up ${received}`);
    }
  }

  // Only a granted case may have moved anything, and every granted one must.
  for (const row of db
    .prepare(
      `SELECT c.id, c.status FROM cases c
        WHERE c.status <> 'granted'
          AND EXISTS (SELECT 1 FROM ledger_entries l WHERE l.case_id = c.id)`,
    )
    .all()) {
    problems.push(`case ${row.id}: is ${row.status} but moved aura`);
  }

  for (const row of db
    .prepare(
      `SELECT c.id FROM cases c
        WHERE c.status = 'granted'
          AND NOT EXISTS (SELECT 1 FROM ledger_entries l WHERE l.case_id = c.id)`,
    )
    .all()) {
    problems.push(`case ${row.id}: judgment entered but nothing moved`);
  }

  // The ledger as a whole: every movement had a counterparty.
  const { total } = db
    .prepare("SELECT COALESCE(SUM(delta), 0) AS total FROM ledger_entries")
    .get();
  if (total !== 0) problems.push(`the ledger as a whole sums to ${total}, not zero`);

  return { problems, accounts, movements };
}
