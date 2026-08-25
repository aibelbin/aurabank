import { MonoLabel, SectionHead } from "@aurabank/design";
import { formatMinute } from "@/lib/format/dates";
import type { CaseListing, RemarkListing } from "@/lib/db/types";

/**
 * The hearing, in the order it happened.
 *
 * A transcript, not a chat: no bubbles, no sides, no timestamps floating in
 * the margin. Every turn is a speaker and what they said, ruled off from the
 * one before it — which is how a hearing is actually written down, and the
 * only format in which "the claimant answers next" makes any sense.
 */
export function Hearing({
  legalCase,
  remarks,
}: {
  legalCase: CaseListing;
  remarks: RemarkListing[];
}) {
  const role = (authorId: number, authorRole: string) => {
    if (authorId === legalCase.claimant_id) return "Claimant";
    if (authorId === legalCase.respondent_id) return "Respondent";
    return authorRole === "judge" ? "The bench" : "Member";
  };

  return (
    <section className="mt-14">
      <SectionHead aside={remarks.length === 0 ? "Filing only" : `${remarks.length + 1} on the record`}>
        The hearing
      </SectionHead>

      <ol className="mt-5 divide-y divide-hairline border-y border-hairline">
        {/* The filing is the first thing said, and always the claimant's. */}
        <li className="py-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
            <MonoLabel>
              Claimant — {legalCase.claimant_name}
            </MonoLabel>
            <MonoLabel muted>{formatMinute(legalCase.filed_at)}</MonoLabel>
          </div>
          <p className="mt-3 leading-[1.6] whitespace-pre-line text-ink/85">
            {legalCase.statement}
          </p>
        </li>

        {remarks.map((remark) => (
          <li key={remark.id} className="py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
              {/* The bench is set in full ink; the parties in the muted weight,
                  so a long exchange still reads as a document with a chair. */}
              <MonoLabel muted={remark.author_role !== "judge"}>
                {role(remark.author_id, remark.author_role)} — {remark.author_name}
              </MonoLabel>
              <MonoLabel muted>{formatMinute(remark.created_at)}</MonoLabel>
            </div>
            <p className="mt-3 leading-[1.6] whitespace-pre-line text-ink/85">{remark.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
