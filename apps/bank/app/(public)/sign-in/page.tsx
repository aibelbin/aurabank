import { MonoLabel } from "@aurabank/design";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";
import { Masthead } from "@/components/chrome/Masthead";
import { currentAccount } from "@/lib/auth/session";
import { NO_RESET_NOTICE } from "@/lib/auth/state";

export const metadata: Metadata = { title: "Sign in — AuraBank" };

export default async function SignInPage() {
  // Already carrying a session: there is nothing to sign into.
  if (await currentAccount()) redirect("/statement");

  return (
    <div className="flex min-h-svh flex-col">
      <Masthead document="Admission" home={false} />

      <main className="mx-auto flex w-full max-w-[46rem] flex-1 flex-col justify-between gap-16 px-6 pt-12 pb-10 md:px-10 md:pt-16">
        <div>
          <h1 className="max-w-[16ch] text-[clamp(2rem,9vw,3.25rem)] leading-[0.98] font-semibold tracking-[-0.035em]">
            Members only beyond this point.
          </h1>
          <p className="mt-6 max-w-[42ch] leading-[1.55] text-ink/70">
            Claims are filed, heard, and settled inside. Admission is by invitation.
          </p>
        </div>

        <SignInForm />

        <div className="space-y-5">
          <div aria-hidden="true" className="h-px w-full bg-hairline" />
          <p className="max-w-[52ch] font-mono text-[0.6875rem] leading-relaxed tracking-[0.06em] text-ink/45 uppercase">
            {NO_RESET_NOTICE}
          </p>
          <p>
            <Link
              href="/join"
              className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase underline decoration-ink/25 underline-offset-[6px] hover:decoration-ink"
            >
              Holding an invite code — redeem it
            </Link>
          </p>
          <MonoLabel muted>AuraBank — Established 2026</MonoLabel>
        </div>
      </main>
    </div>
  );
}
