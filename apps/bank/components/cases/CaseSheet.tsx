import { Amount, MonoLabel, SectionHead, Stamp, Status } from "@aurabank/design";
import Image from "next/image";
import type { CaseListing, ExhibitRow, RemarkListing } from "@/lib/db/types";
import { formatDay, formatMinute, timeUntil } from "@/lib/format/dates";
import { caseNumber, caseTitle, classification, statusLabel, statusTone } from "@/lib/cases/presentation";
import { Hearing } from "./Hearing";

const STAMP: Record<string, { text: string; tone: "solid" | "outline" }> = {
  granted: { text: "Judgment entered", tone: "solid" },
  dismissed: { text: "Dismissed", tone: "outline" },
  withdrawn: { text: "Withdrawn", tone: "outline" },
};

/**
 * The case sheet: the signature document of the bank.
 *
 * Claimant and respondent as facing blocks with a hairline spine between them,
 * because a hearing has two sides and a stacked list has one. On a phone the
 * spine turns and becomes the rule between them — the side-by-side sheet is
 * the laptop variant, not the default.
 */
export function CaseSheet({
  legalCase,
  remarks,
  exhibits,
  children,
}: {
  legalCase: CaseListing;
  remarks: RemarkListing[];
  exhibits: ExhibitRow[];
  /** Whatever this reader may do about it: reply, withdraw, rule. */
  children?: React.ReactNode;
}) {
  const stamp = STAMP[legalCase.status];
  const citation = legalCase.kind === "citation";

  return (
    <article>
      <header className="relative">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
          <MonoLabel>{caseNumber(legalCase.id)}</MonoLabel>
          {/* The stamp says this once a case is ruled; twice is a form that
              does not trust its own stamp. */}
          {stamp ? null : (
            <Status tone={statusTone(legalCase.status)}>{statusLabel(legalCase)}</Status>
          )}
        </div>

        <MonoLabel muted className="mt-8 block">
          {citation ? "Citation in favour of" : "In the matter of"}
        </MonoLabel>
        <h1 className="mt-3 text-[clamp(1.75rem,8vw,3rem)] leading-[1.02] font-semibold tracking-[-0.035em]">
          {citation ? (
            legalCase.claimant_name
          ) : (
            <>
              {legalCase.claimant_handle}{" "}
              <span className="font-mono text-[0.55em] tracking-[0.06em] text-ink/40 italic">
                v
              </span>{" "}
              {legalCase.respondent_handle}
            </>
          )}
        </h1>

        {/* The stamp lands across the head of the sheet, over the rule. */}
        {stamp ? (
          <div className="pointer-events-none mt-7 flex md:absolute md:top-2 md:right-0 md:mt-0">
            <Stamp
              tone={stamp.tone}
              note={legalCase.undefended === 1 ? "respondent absent" : undefined}
            >
              {stamp.text}
            </Stamp>
          </div>
        ) : null}
      </header>

      <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-4 border-y border-hairline py-5">
        <div>
          <dt>
            <MonoLabel muted>Filed</MonoLabel>
          </dt>
          <dd className="mt-1.5 font-mono text-sm">{formatDay(legalCase.filed_at)}</dd>
        </div>
        <div>
          <dt>
            <MonoLabel muted>Classification</MonoLabel>
          </dt>
          <dd className="mt-1.5 font-mono text-sm">
            {classification(legalCase.amount, legalCase.kind)}
          </dd>
        </div>
        <div>
          <dt>
            <MonoLabel muted>Amount claimed</MonoLabel>
          </dt>
          <dd className="mt-1.5 font-mono text-lg">
            <Amount value={legalCase.amount} />
          </dd>
        </div>
        {legalCase.ruled_at ? (
          <div>
            <dt>
              <MonoLabel muted>Ruled</MonoLabel>
            </dt>
            <dd className="mt-1.5 font-mono text-sm">
              {formatDay(legalCase.ruled_at)} by {legalCase.ruled_by_handle}
            </dd>
          </div>
        ) : null}
      </dl>

      {citation ? (
        <p className="mt-9 max-w-[52ch] leading-[1.55] text-ink/70">
          No respondent. A citation is answered by the bank itself: if it is granted, the aura is
          paid out of the reserve rather than taken from anybody.
        </p>
      ) : null}

      <Hearing legalCase={legalCase} remarks={remarks} />

      <section className="mt-14">
        <SectionHead
          aside={exhibits.length === 0 ? "None submitted" : `${exhibits.length} in evidence`}
        >
          Exhibits
        </SectionHead>

        {exhibits.length === 0 ? (
          <p className="mt-5 border-y border-hairline py-8 text-ink/60">
            The claim rests on its statement alone.
          </p>
        ) : (
          <ol className="mt-5 space-y-8">
            {exhibits.map((exhibit, index) => (
              <li key={exhibit.id}>
                <div className="flex items-baseline justify-between gap-6 border-b border-hairline pb-3">
                  <MonoLabel>Exhibit {String(index + 1).padStart(2, "0")}</MonoLabel>
                  <MonoLabel muted>{Math.ceil(exhibit.bytes / 1024)} KB</MonoLabel>
                </div>
                {/* Unoptimised: the route is session-gated, and Next's optimiser
                    would need to fetch it as an anonymous caller. */}
                <Image
                  src={`/exhibit/${exhibit.filename}`}
                  alt={`Exhibit ${index + 1} in ${caseTitle(legalCase)}`}
                  width={1200}
                  height={1600}
                  unoptimized
                  className="mt-4 h-auto w-full border border-hairline"
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      {children}
    </article>
  );
}
