import type { BankStore } from "@/lib/db/store";
import { transitionFor } from "./lifecycle";

/**
 * Moves every case whose reply window has run out.
 *
 * There is no scheduler in this app and adding one would mean another process
 * to keep alive. Instead the sweep runs on read, which is enough: nobody can
 * see a case, rule on it, or list it without first loading a page that calls
 * this, so no case is ever acted on in a stale state.
 *
 * The decision itself still goes through the lifecycle function — this only
 * chooses when to ask.
 */
export function sweepLapsedCases(store: BankStore, now = new Date()): void {
  for (const row of store.cases.listLapsed(now.toISOString())) {
    const move = transitionFor(
      {
        status: row.status,
        responseDeadline: row.response_deadline,
        undefended: row.undefended === 1,
      },
      "lapse",
      "judge",
      now,
    );

    if (move.allowed) {
      store.cases.transition({
        id: row.id,
        from: move.from,
        to: move.to,
        undefended: move.undefended,
      });
    }
  }
}
