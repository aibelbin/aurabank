import { Amount, MonoLabel, Status } from "@aurabank/design";
import Link from "next/link";
import { caseNumber, statusLabel, statusTone } from "@/lib/cases/presentation";
import { formatRegisterDay } from "@/lib/format/dates";
import type { CaseListing } from "@/lib/db/types";

/**
 * A register of cases: one line each, in the order they were filed.
 *
 * A register, not a set of cards. Rows separated by hairlines let the eye run
 * down a column of parties and a column of figures, which is what a list of
 * cases is for — a card grid makes each case an advertisement for itself.
 */
export function CaseRegister({
  cases,
  /** Marks the rows this reader is party to, so their own matters stand out. */
  accountId,
}: {
  cases: CaseListing[];
  accountId: number;
}) {
  return (
    <ol className="divide-y divide-hairline border-y border-hairline">
      {cases.map((legalCase) => {
        const involved =
          legalCase.claimant_id === accountId || legalCase.respondent_id === accountId;

        return (
          <li key={legalCase.id}>
            <Link
              href={`/case/${legalCase.id}`}
              className="flex min-h-16 items-center justify-between gap-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span
                    className={involved ? "h-1.5 w-1.5 shrink-0 bg-ink" : "h-1.5 w-1.5 shrink-0"}
                  >
                    <span className="sr-only">{involved ? "You are party to this matter." : ""}</span>
                  </span>
                  {/* The ink square already says this one is yours; saying it
                      again in words wraps the line on a phone. */}
                  <MonoLabel muted className="whitespace-nowrap">
                    {caseNumber(legalCase.id)} · {formatRegisterDay(legalCase.filed_at)}
                  </MonoLabel>
                </div>
                <p className="mt-1.5 ml-[1.125rem] truncate">
                  {legalCase.claimant_handle}{" "}
                  <span className="font-mono text-[0.8em] text-ink/40 italic">v</span>{" "}
                  {legalCase.respondent_handle}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="font-mono text-base">
                  <Amount value={legalCase.amount} />
                </span>
                <Status tone={statusTone(legalCase.status)}>{statusLabel(legalCase)}</Status>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
