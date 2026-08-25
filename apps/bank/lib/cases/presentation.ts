import type { StatusTone } from "@aurabank/design";
import type { CaseKind, CaseListing, CaseStatus } from "@/lib/db/types";
import { classify, classifyCitation } from "./amounts";

/**
 * How a case describes itself.
 *
 * The vocabulary is doing work. "Respondent" tells the accused they have a
 * right of reply rather than that a moderator has acted on them, and
 * "judgment entered" makes a ruling read as a finding rather than a decision
 * somebody made about them. Keeping the words in one table is what stops the
 * register drifting screen by screen.
 */
const LABEL: Record<CaseStatus, string> = {
  awaiting_response: "Awaiting response",
  under_review: "Under review",
  granted: "Judgment entered",
  dismissed: "Dismissed",
  withdrawn: "Withdrawn",
};

/** Solid where the case wants something, outline while live, muted once over. */
const TONE: Record<CaseStatus, StatusTone> = {
  awaiting_response: "solid",
  under_review: "outline",
  granted: "muted",
  dismissed: "muted",
  withdrawn: "muted",
};

export function statusLabel(legalCase: { status: CaseStatus; undefended: number }): string {
  if (legalCase.status === "under_review" && legalCase.undefended === 1) {
    return "Undefended";
  }
  return LABEL[legalCase.status];
}

export function statusTone(status: CaseStatus): StatusTone {
  return TONE[status];
}

/** "Case 0007". Padded, because a register's numbers line up. */
export function caseNumber(id: number): string {
  return `Case ${String(id).padStart(4, "0")}`;
}

export function caseTitle(legalCase: CaseListing): string {
  // A citation is not adversarial: nobody is being sued by the bank.
  return legalCase.kind === "citation"
    ? `In re ${legalCase.claimant_handle}`
    : `${legalCase.claimant_handle} v ${legalCase.respondent_handle}`;
}

/** "Material · 250" — the tier, then the figure it stands for. */
export function classification(amount: number, kind: CaseKind = "claim"): string {
  return kind === "citation" ? classifyCitation(amount) : classify(amount);
}
