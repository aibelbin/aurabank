import { MonoLabel } from "@aurabank/design";
import { enterRuling, postRemark, withdrawClaim } from "@/app/actions/cases";
import { actorFor, mayRemark } from "@/lib/cases/lifecycle";
import { timeUntil } from "@/lib/format/dates";
import type { AccountRow, CaseListing, RemarkListing } from "@/lib/db/types";
import { RemarkForm } from "./RemarkForm";
import { RulingActions } from "./RulingActions";
import { WithdrawClaim } from "./WithdrawClaim";

/**
 * Whatever this reader may do about this case, and nothing else.
 *
 * The same lifecycle rules that guard the actions decide what is offered here,
 * so a member is never shown a button that would be refused. The actions still
 * check for themselves — this is the courtesy, not the control.
 */
export function CaseActions({
  legalCase,
  remarks,
  account,
}: {
  legalCase: CaseListing;
  remarks: RemarkListing[];
  account: AccountRow;
}) {
  const actor = actorFor(legalCase, account);
  const turn = mayRemark(legalCase, remarks, actor);
  const remaining = timeUntil(legalCase.response_deadline);
  const awaitingFirstReply =
    actor === "respondent" && legalCase.status === "awaiting_response";

  return (
    <>
      {turn.allowed ? (
        <RemarkForm
          action={postRemark.bind(null, legalCase.id)}
          label={actor === "judge" ? "The bench" : "Your turn"}
          submitLabel={awaitingFirstReply ? "Respond" : "Be heard"}
          hint={
            awaitingFirstReply
              ? remaining === "elapsed"
                ? "The window has closed."
                : `${remaining} left before the matter may be heard without you.`
              : actor === "judge"
                ? "The bench may speak at any point, as often as it needs to."
                : "Once filed, the other party answers next."
          }
        />
      ) : null}

      {/* Said plainly rather than by an absent form: a reader who cannot speak
          should know it is turn-taking, not a bug. */}
      {!turn.allowed && (actor === "claimant" || actor === "respondent") ? (
        <div className="mt-14 border-t border-hairline pt-8">
          <MonoLabel muted>{turn.reason}</MonoLabel>
        </div>
      ) : null}

      {actor === "claimant" &&
      (legalCase.status === "awaiting_response" || legalCase.status === "under_review") ? (
        <WithdrawClaim action={withdrawClaim.bind(null, legalCase.id)} />
      ) : null}

      {actor === "judge" && legalCase.status === "under_review" ? (
        <RulingActions
          action={enterRuling.bind(null, legalCase.id)}
          amount={legalCase.amount}
          claimant={legalCase.claimant_handle}
          respondent={legalCase.respondent_handle}
          undefended={legalCase.undefended === 1}
          citation={legalCase.kind === "citation"}
        />
      ) : null}

      {actor === "stranger" ? (
        <div className="mt-14 border-t border-hairline pt-8">
          <MonoLabel muted>
            You are not party to this matter. It is on the docket for members to read.
          </MonoLabel>
        </div>
      ) : null}
    </>
  );
}

/** Whether this reader has anything to do, so the page can reserve the bar. */
export function hasActionBar(
  legalCase: CaseListing,
  remarks: RemarkListing[],
  account: AccountRow,
): boolean {
  const actor = actorFor(legalCase, account);
  if (actor === "judge") return true;
  return mayRemark(legalCase, remarks, actor).allowed;
}
