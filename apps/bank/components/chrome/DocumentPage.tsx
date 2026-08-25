import { cn } from "@aurabank/design";
import { getBankStore } from "@/lib/db/store";
import type { AccountRow } from "@/lib/db/types";
import { ActionBar } from "./ActionBar";
import { FooterIndex } from "./FooterIndex";
import { Masthead } from "./Masthead";

/**
 * The frame every screen in the bank is set in.
 *
 * One measure for every document — a bank does not print its statements at one
 * width and its case sheets at another — a letterhead above, the ledger's index
 * below, and the single action pinned in reach at the bottom.
 */
export function DocumentPage({
  name,
  current,
  account,
  action,
  reserveAction = false,
  children,
}: {
  /** What this document is, printed in the letterhead. */
  name: string;
  /** Route of this document, so the index can mark where you are. */
  current: string;
  account: AccountRow;
  /** The one thing this document wants you to do, if it wants anything. */
  action?: React.ReactNode;
  /**
   * Set when a child renders its own action bar — a form's submit has to live
   * inside the form to know whether it is pending. The page still has to leave
   * room for it, and that is what this does.
   */
  reserveAction?: boolean;
  children: React.ReactNode;
}) {
  const store = getBankStore();
  const awaitingYou = store.cases.countAwaitingResponseFrom(account.id);
  const awaitingJudgment = account.role === "judge" ? store.cases.countAwaitingJudgment() : 0;

  return (
    <div className={cn("flex min-h-svh flex-col", action || reserveAction ? "pb-24" : undefined)}>
      <Masthead document={name} />

      <main className="mx-auto w-full max-w-[46rem] flex-1 px-6 pt-10 pb-4 md:px-10 md:pt-14">
        {children}
      </main>

      <FooterIndex
        handle={account.handle}
        role={account.role}
        current={current}
        awaitingYou={awaitingYou}
        awaitingJudgment={awaitingJudgment}
      />

      {action ? <ActionBar>{action}</ActionBar> : null}
    </div>
  );
}
