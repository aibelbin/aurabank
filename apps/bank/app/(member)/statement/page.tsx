import { Amount, MonoLabel, buttonClass } from "@aurabank/design";
import type { Metadata } from "next";
import Link from "next/link";
import { DocumentPage } from "@/components/chrome/DocumentPage";
import { requireAccount } from "@/lib/auth/session";
import { sweepLapsedCases } from "@/lib/cases/sweep";
import { getBankStore } from "@/lib/db/store";
import { formatDay, formatMinute } from "@/lib/format/dates";

export const metadata: Metadata = { title: "Statement of account — AuraBank" };

export default async function StatementPage() {
  const account = await requireAccount();
  const store = getBankStore();
  sweepLapsedCases(store);

  const movements = store.ledger.listForAccount(account.id);
  const awaitingYou = store.cases.countAwaitingResponseFrom(account.id);
  const inArrears = account.balance < 0;

  return (
    <DocumentPage
      name="Statement of account"
      current="/statement"
      account={account}
      action={
        <Link href="/file" className={buttonClass({ block: true })}>
          File a claim
        </Link>
      }
    >
      {/* An enclosure notice, the way a statement carries one. This is the
          only place a member is told a claim needs answering before the window
          runs out, so it sits above everything, not beside it. */}
      {awaitingYou > 0 ? (
        <Link
          href="/docket"
          className="mb-10 flex min-h-14 items-center justify-between gap-5 border-y border-ink py-4"
        >
          <MonoLabel>
            Enclosed — {awaitingYou === 1 ? "a claim awaits" : `${awaitingYou} claims await`} your
            response
          </MonoLabel>
          <MonoLabel muted>Read</MonoLabel>
        </Link>
      ) : null}

      {/* The head of a statement: whose it is, and since when. */}
      <dl className="flex flex-wrap gap-x-12 gap-y-4">
        <div>
          <dt>
            <MonoLabel muted>Account</MonoLabel>
          </dt>
          <dd className="mt-1.5 font-mono text-sm tabular-nums">
            #{String(account.id).padStart(4, "0")}
          </dd>
        </div>
        <div>
          <dt>
            <MonoLabel muted>Held by</MonoLabel>
          </dt>
          {/* The name at the head of the statement, the username beneath it.
              A statement is addressed to a person; a case names a username. */}
          <dd className="mt-1.5 text-sm">{account.display_name}</dd>
        </div>
        <div>
          <dt>
            <MonoLabel muted>Username</MonoLabel>
          </dt>
          <dd className="mt-1.5 font-mono text-sm">{account.handle}</dd>
        </div>
        <div>
          <dt>
            <MonoLabel muted>Opened</MonoLabel>
          </dt>
          <dd className="mt-1.5 font-mono text-sm">{formatDay(account.created_at)}</dd>
        </div>
      </dl>

      <section className="mt-12 border-t border-hairline pt-8">
        <MonoLabel muted>{inArrears ? "Balance — in arrears" : "Balance"}</MonoLabel>
        <p className="mt-4 font-mono text-[clamp(3.25rem,17vw,5.5rem)] leading-[0.85] tracking-[-0.04em]">
          <Amount value={account.balance} tone={inArrears ? "debt" : "ink"} />
        </p>
        <p className="mt-6 max-w-[46ch] font-mono text-[0.6875rem] leading-relaxed tracking-[0.06em] text-ink/45 uppercase">
          As at {formatMinute(new Date().toISOString())}.{" "}
          {inArrears
            ? "Aura debt accrues. It is visible to every member and there is no bankruptcy protection."
            : "Every aura on this statement came from somewhere — another member, or the bank's own reserve. None of it was conjured."}
        </p>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-6">
          <MonoLabel>Movements</MonoLabel>
          <MonoLabel muted>
            {movements.length === 0
              ? "None"
              : `${movements.length} entr${movements.length === 1 ? "y" : "ies"}`}
          </MonoLabel>
        </div>

        {movements.length === 0 ? (
          <div className="mt-6 border-y border-hairline py-10">
            <p className="text-lg leading-[1.5]">No movements.</p>
            <p className="mt-2 text-ink/60">Your aura has not been contested.</p>
          </div>
        ) : (
          <ol className="mt-6 divide-y divide-hairline border-y border-hairline">
            {movements.map((movement) => (
              <li key={movement.id} className="flex items-baseline justify-between gap-6 py-5">
                <div className="min-w-0">
                  <MonoLabel muted>
                    Case {String(movement.case_id).padStart(4, "0")} ·{" "}
                    {formatDay(movement.created_at)}
                  </MonoLabel>
                  <p className="mt-1.5 leading-[1.4]">
                    {movement.delta > 0 ? "In your favour, against " : "Against you, in favour of "}
                    <span className="font-mono text-[0.9375rem]">
                      {movement.counterparty_handle}
                    </span>
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-mono text-lg">
                    <Amount value={movement.delta} signed tone="auto" />
                  </p>
                  <p className="mt-1 font-mono text-[0.6875rem] text-ink/45">
                    <Amount value={movement.balance_after} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </DocumentPage>
  );
}
