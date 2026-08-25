import { MonoLabel } from "@aurabank/design";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Masthead } from "@/components/chrome/Masthead";
import { JoinForm } from "@/components/invites/JoinForm";
import { currentAccount } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Redeem an invite — AuraBank" };

export default async function JoinPage() {
  if (await currentAccount()) redirect("/statement");

  return (
    <div className="flex min-h-svh flex-col">
      <Masthead document="Redemption" />

      <main className="mx-auto w-full max-w-[46rem] flex-1 px-6 pt-12 pb-14 md:px-10 md:pt-16">
        <h1 className="max-w-[18ch] text-[clamp(2rem,9vw,3.25rem)] leading-[0.98] font-semibold tracking-[-0.035em]">
          Present your code.
        </h1>
        <p className="mt-6 max-w-[46ch] leading-[1.55] text-ink/70">
          A code admits one person once. It does not say who you are — that part is
          below, and it is yours to choose.
        </p>

        <div className="mt-14">
          <JoinForm />
        </div>

        <div className="mt-14 space-y-5 border-t border-hairline pt-8">
          <p className="max-w-[52ch] font-mono text-[0.6875rem] leading-relaxed tracking-[0.06em] text-ink/45 uppercase">
            Every account opens at 3,000 aura. AuraBank issues none of it — a balance moves only
            when a claim is granted against someone else, and it may go below zero.
          </p>
          <p>
            <Link
              href="/sign-in"
              className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase underline decoration-ink/25 underline-offset-[6px] hover:decoration-ink"
            >
              Already a member — sign in
            </Link>
          </p>
          <MonoLabel muted>With love, Aibel Bin Zacariah.</MonoLabel>
        </div>
      </main>
    </div>
  );
}
