import type { Metadata } from "next";
import { DocumentPage } from "@/components/chrome/DocumentPage";
import { FileClaimForm } from "@/components/cases/FileClaimForm";
import { requireAccount } from "@/lib/auth/session";
import { getBankStore } from "@/lib/db/store";

export const metadata: Metadata = { title: "File a claim — AuraBank" };

export default async function FilePage() {
  const claimant = await requireAccount();
  // A claim requires two parties, so the claimant is not among the choices.
  const members = getBankStore()
    .accounts.list()
    .filter((member) => member.id !== claimant.id);

  return (
    <DocumentPage name="Claim form" current="/file" account={claimant} reserveAction>
      <h1 className="max-w-[16ch] text-[clamp(1.75rem,7.5vw,2.75rem)] leading-[1.02] font-semibold tracking-[-0.03em]">
        State your claim.
      </h1>
      <p className="mt-5 max-w-[48ch] leading-[1.55] text-ink/70">
        The respondent has 24 hours to reply. After that the matter may be heard without them.
        Nothing moves until a judgment is entered.
      </p>

      {/* A citation names nobody, so the form still has work to do even when
          yours is the only account open — it is only the claim half that needs
          somebody on the other side. */}
      <div className="mt-12">
        <FileClaimForm members={members} />
      </div>
    </DocumentPage>
  );
}
