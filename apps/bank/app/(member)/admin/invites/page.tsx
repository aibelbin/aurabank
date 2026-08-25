import { MonoLabel, SectionHead, Status } from "@aurabank/design";
import type { Metadata } from "next";
import { DocumentPage } from "@/components/chrome/DocumentPage";
import { IssueInviteForm } from "@/components/invites/IssueInviteForm";
import { requireJudge } from "@/lib/auth/session";
import { getBankStore } from "@/lib/db/store";

export const metadata: Metadata = { title: "Invite codes — AuraBank" };

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default async function InvitesPage() {
  const judge = await requireJudge();
  const invites = getBankStore().invites.list();
  const outstanding = invites.filter((invite) => invite.redeemed_by === null).length;

  return (
    <DocumentPage name="Invite codes" current="/admin/invites" account={judge}>
      <h1 className="max-w-[18ch] text-[clamp(1.75rem,7.5vw,2.75rem)] leading-[1.02] font-semibold tracking-[-0.03em]">
        Admission is by code.
      </h1>
      <p className="mt-5 max-w-[48ch] leading-[1.55] text-ink/70">
        Each code admits one person once. AuraBank sends no mail — issue a code here and pass it on
        yourself.
      </p>

      <div className="mt-12">
        <IssueInviteForm />
      </div>

      <section className="mt-16">
        <SectionHead aside={`${outstanding} outstanding of ${invites.length}`}>
          Register of codes
        </SectionHead>

        {invites.length === 0 ? (
          <p className="mt-6 border-y border-hairline py-8 text-ink/60">
            No codes issued. Nobody can open an account until one is.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
            {invites.map((invite) => (
              <li
                key={invite.code}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-4"
              >
                <div>
                  <p className="font-mono text-lg tracking-[0.06em]">{invite.code}</p>
                  <p className="mt-1 font-mono text-[0.6875rem] text-ink/45">
                    {invite.issued_to_email ?? "no address recorded"} ·{" "}
                    {DATE.format(new Date(invite.created_at))}
                  </p>
                </div>

                {invite.redeemed_by === null ? (
                  <Status tone="outline">Outstanding</Status>
                ) : (
                  <Status tone="muted">Redeemed by {invite.redeemed_by_handle}</Status>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </DocumentPage>
  );
}
