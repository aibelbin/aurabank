import { MonoLabel } from "@aurabank/design";
import type { Metadata } from "next";
import { Masthead } from "@/components/chrome/Masthead";

export const metadata: Metadata = { title: "No connection — AuraBank" };

/**
 * The document the service worker serves when a page cannot be fetched.
 *
 * Static on purpose: it holds nothing about anybody, which is what makes it
 * safe to keep in a cache on a phone that other people pick up.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <Masthead document="No connection" />

      <main className="mx-auto flex w-full max-w-[46rem] flex-1 flex-col justify-between gap-16 px-6 pt-12 pb-10 md:px-10 md:pt-16">
        <div>
          <h1 className="max-w-[16ch] text-[clamp(2rem,9vw,3.25rem)] leading-[0.98] font-semibold tracking-[-0.035em]">
            The desk is unreachable.
          </h1>
          <p className="mt-6 max-w-[44ch] leading-[1.55] text-ink/70">
            Your device has no connection to the clearing house. Nothing has been lost — the ledger
            is held on the server, and anything you were part-way through submitting will be sent
            when the connection returns.
          </p>
        </div>

        <MonoLabel muted>With love, Aibel Bin Zacariah.</MonoLabel>
      </main>
    </div>
  );
}
