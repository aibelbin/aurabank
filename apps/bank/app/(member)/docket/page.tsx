import { MonoLabel } from "@aurabank/design";
import type { Metadata } from "next";
import { CaseRegister } from "@/components/cases/CaseRegister";
import { DocumentPage } from "@/components/chrome/DocumentPage";
import { requireAccount } from "@/lib/auth/session";
import { sweepLapsedCases } from "@/lib/cases/sweep";
import { getBankStore } from "@/lib/db/store";

export const metadata: Metadata = { title: "The docket — AuraBank" };

export default async function DocketPage() {
  const account = await requireAccount();
  const store = getBankStore();
  sweepLapsedCases(store);

  const cases = store.cases.listAll();
  const awaitingYou = cases.filter(
    (legalCase) =>
      legalCase.respondent_id === account.id && legalCase.status === "awaiting_response",
  );
  const open = cases.filter(
    (legalCase) =>
      legalCase.status === "awaiting_response" || legalCase.status === "under_review",
  ).length;

  return (
    <DocumentPage name="The docket" current="/docket" account={account}>
      <h1 className="max-w-[16ch] text-[clamp(1.75rem,7.5vw,2.75rem)] leading-[1.02] font-semibold tracking-[-0.03em]">
        Every matter, on the record.
      </h1>
      <p className="mt-5 max-w-[48ch] leading-[1.55] text-ink/70">
        Open to members, and to nobody outside. A verdict nobody witnessed is only an
        administrative note.
      </p>

      {awaitingYou.length > 0 ? (
        <section className="mt-12">
          <MonoLabel>
            {awaitingYou.length === 1
              ? "A claim awaits your reply"
              : `${awaitingYou.length} claims await your reply`}
          </MonoLabel>
          <p className="mt-3 mb-5 max-w-[48ch] text-ink/70">
            Answer within the window, or the matter may be heard without you.
          </p>
          <CaseRegister cases={awaitingYou} accountId={account.id} />
        </section>
      ) : null}

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-6">
          <MonoLabel>Register</MonoLabel>
          <MonoLabel muted>
            {cases.length === 0 ? "Nothing filed" : `${open} open of ${cases.length}`}
          </MonoLabel>
        </div>

        {cases.length === 0 ? (
          <div className="mt-6 border-y border-hairline py-10">
            <p className="text-lg leading-[1.5]">The docket is clear.</p>
            <p className="mt-2 text-ink/60">No claim has been filed against anyone.</p>
          </div>
        ) : (
          <div className="mt-6">
            <CaseRegister cases={cases} accountId={account.id} />
          </div>
        )}
      </section>
    </DocumentPage>
  );
}
