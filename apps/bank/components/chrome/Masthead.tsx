import { MonoLabel } from "@aurabank/design";

/**
 * The head of every document: the institution on the left, what this
 * particular document is on the right, a hairline beneath.
 *
 * This is the app's navigation bar, and it navigates nowhere on purpose. A
 * statement does not carry a menu across the top; it carries a letterhead.
 * Getting between documents is the index in the footer.
 */
export function Masthead({ document }: { document: string }) {
  return (
    <div className="shrink-0">
      <div className="mx-auto flex w-full max-w-[46rem] items-baseline justify-between gap-6 px-6 pt-6 pb-5 md:px-10 md:pt-8">
        <MonoLabel>AuraBank</MonoLabel>
        <MonoLabel muted className="text-right">
          {document}
        </MonoLabel>
      </div>
      <div aria-hidden="true" className="h-px w-full bg-hairline" />
    </div>
  );
}
