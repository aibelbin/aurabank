import { MonoLabel } from "@aurabank/design";
import Link from "next/link";

/**
 * The head of every document: the institution on the left, what this
 * particular document is on the right, a hairline beneath.
 *
 * Sticky, and the wordmark is the way home. The index at the foot of the page
 * is the right place to *browse* the ledger, but it is the wrong place to be
 * the only way out of a long case sheet — you had to scroll a whole hearing to
 * get anywhere. One tap on the letterhead now returns to the statement, which
 * is what a masthead does on paper too: it tells you whose document you are
 * holding.
 */
export function Masthead({ document, home = true }: { document: string; home?: boolean }) {
  return (
    <div className="sticky top-0 z-30 shrink-0 bg-paper">
      <div className="mx-auto flex w-full max-w-[46rem] items-baseline justify-between gap-6 px-6 pt-6 pb-5 md:px-10 md:pt-8">
        {home ? (
          <Link
            href="/statement"
            className="pressable -mx-2 -my-1 flex min-h-11 items-center gap-2 px-2 py-1"
          >
            {/* The mark that says this is a way back, not a label. */}
            <span aria-hidden="true" className="row-arrow font-mono text-[0.75rem]">
              ←
            </span>
            <MonoLabel>AuraBank</MonoLabel>
          </Link>
        ) : (
          <MonoLabel>AuraBank</MonoLabel>
        )}
        <MonoLabel muted className="text-right">
          {document}
        </MonoLabel>
      </div>
      <div aria-hidden="true" className="h-px w-full bg-hairline" />
    </div>
  );
}
