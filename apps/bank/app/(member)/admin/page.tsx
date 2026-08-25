import { MonoLabel } from "@aurabank/design";
import type { Metadata } from "next";
import { CaseRegister } from "@/components/cases/CaseRegister";
import { DocumentPage } from "@/components/chrome/DocumentPage";
import { requireJudge } from "@/lib/auth/session";
import { sweepLapsedCases } from "@/lib/cases/sweep";
import { getBankStore } from "@/lib/db/store";

export const metadata: Metadata = { title: "Awaiting judgment — AuraBank" };

export default async function AdminPage() {
  const judge = await requireJudge();
  const store = getBankStore();
  sweepLapsedCases(store);

  const queue = store.cases.listAwaitingJudgment();
  // A judge who is party to a case cannot rule on it, so it is not their queue.
  const theirs = queue.filter(
    (legalCase) => legalCase.claimant_id === judge.id || legalCase.respondent_id === judge.id,
  );
  const rulable = queue.filter((legalCase) => !theirs.includes(legalCase));
  const undefended = rulable.filter((legalCase) => legalCase.undefended === 1).length;

  return (
    <DocumentPage name="Awaiting judgment" current="/admin" account={judge}>
      <h1 className="max-w-[16ch] text-[clamp(1.75rem,7.5vw,2.75rem)] leading-[1.02] font-semibold tracking-[-0.03em]">
        Matters for the bench.
      </h1>
      <p className="mt-5 max-w-[48ch] leading-[1.55] text-ink/70">
        Each has been heard, or its window has run out. Nothing moves until a judgment is entered.
        {undefended > 0
          ? ` ${undefended} of them will be entered in the absence of the respondent.`
          : ""}
      </p>

      <section className="mt-12">
        <div className="flex items-baseline justify-between gap-6">
          <MonoLabel>The queue</MonoLabel>
          <MonoLabel muted>
            {rulable.length === 0 ? "Clear" : `${rulable.length} to rule on`}
          </MonoLabel>
        </div>

        {rulable.length === 0 ? (
          <div className="mt-6 border-y border-hairline py-10">
            <p className="text-lg leading-[1.5]">No cases await judgment.</p>
            <p className="mt-2 text-ink/60">The bench is clear.</p>
          </div>
        ) : (
          <div className="mt-6">
            <CaseRegister cases={rulable} accountId={judge.id} />
          </div>
        )}
      </section>

      {theirs.length > 0 ? (
        <section className="mt-14">
          <MonoLabel>Not for you</MonoLabel>
          <p className="mt-3 mb-5 max-w-[48ch] text-ink/70">
            You are party to {theirs.length === 1 ? "this matter" : "these matters"}, so you may not
            rule on {theirs.length === 1 ? "it" : "them"}. {theirs.length === 1 ? "It waits" : "They wait"} for
            another judge.
          </p>
          <CaseRegister cases={theirs} accountId={judge.id} />
        </section>
      ) : null}
    </DocumentPage>
  );
}
