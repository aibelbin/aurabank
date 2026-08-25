"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccount, requireJudge } from "@/lib/auth/session";
import { actorFor, mayRemark, transitionFor } from "@/lib/cases/lifecycle";
import { sweepLapsedCases } from "@/lib/cases/sweep";
import { isCitationAmount, isScheduledAmount, responseDeadline } from "@/lib/cases/amounts";
import {
  STATEMENT_MAX,
  STATEMENT_MIN,
  type FileState,
  type FileValues,
  type ReplyState,
  type RulingState,
} from "@/lib/cases/state";
import { transaction } from "@/lib/db/database";
import { enterJudgment, getBankStore } from "@/lib/db/store";
import { acceptExhibit, discardExhibit } from "@/lib/evidence/store";
import { MAX_EXHIBITS } from "@/lib/evidence/formats";
import { filingLimiter, retryMessage } from "@/lib/rate-limit";
import { callerAddress } from "@/lib/request";

export async function fileClaim(_previous: FileState, formData: FormData): Promise<FileState> {
  const claimant = await requireAccount();

  const values: FileValues = {
    respondentId: String(formData.get("respondentId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    statement: String(formData.get("statement") ?? ""),
  };

  const fail = (message: string): FileState => ({ status: "error", message, values });

  const verdict = filingLimiter.consume(`${claimant.id}:${await callerAddress()}`);
  if (!verdict.allowed) {
    return fail(retryMessage(verdict.retryAfterMs, "Filing"));
  }

  const store = getBankStore();
  const kind = String(formData.get("kind") ?? "claim") === "citation" ? "citation" : "claim";
  const amount = Number(values.amount);

  let respondentId: number;

  if (kind === "citation") {
    // Nobody is accused. The bank's own account stands as the counterparty, so
    // the award is a transfer and the ledger still sums to zero.
    const reserve = store.accounts.reserve();
    if (!reserve) return fail("The reserve is not open. No aura can be issued.");
    respondentId = reserve.id;

    if (!isCitationAmount(amount)) {
      return fail("Choose an amount from the citation schedule.");
    }
  } else {
    respondentId = Number(values.respondentId);
    if (!Number.isInteger(respondentId) || respondentId <= 0) {
      return fail("Name the respondent.");
    }
    if (respondentId === claimant.id) {
      return fail("A claim requires two parties.");
    }

    const respondent = store.accounts.byId(respondentId);
    if (!respondent) return fail("That respondent does not hold an account.");
    if (respondent.role === "reserve") {
      return fail("The bank is not a respondent. File a citation instead.");
    }

    if (!isScheduledAmount(amount)) {
      return fail("Choose an amount from the schedule.");
    }
  }

  const statement = values.statement.trim();
  if (statement.length < STATEMENT_MIN) {
    return fail(`State what happened, in at least ${STATEMENT_MIN} characters.`);
  }
  if (statement.length > STATEMENT_MAX) {
    return fail(`A statement may not exceed ${STATEMENT_MAX} characters.`);
  }

  const uploads = formData
    .getAll("exhibits")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (uploads.length > MAX_EXHIBITS) {
    return fail(`A claim may carry at most ${MAX_EXHIBITS} exhibits.`);
  }

  // Written to disk before the case exists, so a rejected upload never leaves
  // a filed case with a missing plate. Anything already written is removed if
  // a later one is refused.
  const stored = [];
  for (const upload of uploads) {
    const result = await acceptExhibit(upload);
    if (!result.ok) {
      await Promise.all(stored.map((exhibit) => discardExhibit(exhibit.filename)));
      return fail(result.message);
    }
    stored.push(result.exhibit);
  }

  const filedAt = new Date();
  let caseId: number;

  try {
    caseId = store.cases.insert({
      kind,
      claimantId: claimant.id,
      respondentId,
      amount,
      statement,
      filedAt: filedAt.toISOString(),
      responseDeadline: responseDeadline(filedAt),
    });

    for (const exhibit of stored) {
      store.exhibits.insert({
        caseId,
        uploadedBy: claimant.id,
        filename: exhibit.filename,
        mime: exhibit.mime,
        bytes: exhibit.bytes,
      });
    }
  } catch (error) {
    await Promise.all(stored.map((exhibit) => discardExhibit(exhibit.filename)));
    console.error("[bank] failed to file a claim", error);
    return fail("The registry is unavailable. Try again shortly.");
  }

  revalidatePath("/docket");
  revalidatePath("/statement");
  redirect(`/case/${caseId}`);
}


/**
 * A turn in the hearing.
 *
 * The turn-taking rule lives in `mayRemark` and is asked here rather than
 * inferred from the form, so a second entry point cannot skip it. The first
 * remark by the respondent is also what closes the reply window and sends the
 * case before the bench — one act, so it happens in one transaction.
 */
export async function postRemark(
  caseId: number,
  _previous: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const account = await requireAccount();
  const body = String(formData.get("body") ?? "").trim();
  const fail = (message: string): ReplyState => ({ status: "error", message, body });

  if (body.length < STATEMENT_MIN) {
    return fail(`Say something, in at least ${STATEMENT_MIN} characters.`);
  }
  if (body.length > STATEMENT_MAX) {
    return fail(`A remark may not exceed ${STATEMENT_MAX} characters.`);
  }

  const store = getBankStore();
  const now = new Date();
  // A reply filed a second after the window closed is late, so the sweep has
  // to have run before the turn is judged.
  sweepLapsedCases(store, now);

  const legalCase = store.cases.rowById(caseId);
  if (!legalCase) return fail("No such case.");

  const actor = actorFor(legalCase, account);
  const turn = mayRemark(legalCase, store.remarks.listForCase(caseId), actor);
  if (!turn.allowed) return fail(turn.reason);

  try {
    transaction(store.db, () => {
      store.remarks.insert({ caseId, authorId: account.id, body });

      // The respondent answering is what ends the waiting, and only that.
      if (actor === "respondent" && legalCase.status === "awaiting_response") {
        const move = transitionFor(
          {
            status: legalCase.status,
            responseDeadline: legalCase.response_deadline,
            undefended: legalCase.undefended === 1,
          },
          "respond",
          actor,
          now,
        );
        if (!move.allowed) throw new Error(move.reason);
        if (!store.cases.transition({ id: caseId, from: move.from, to: move.to })) {
          throw new Error("case moved underneath the reply");
        }
      }
    });
  } catch (error) {
    console.error("[bank] failed to record a remark", error);
    return fail("That could not be filed. Reload the case and try again.");
  }

  revalidatePath(`/case/${caseId}`);
  revalidatePath("/docket");
  return { status: "idle" };
}

/** The claimant's own withdrawal, available right up to judgment. */
export async function withdrawClaim(caseId: number): Promise<void> {
  const account = await requireAccount();
  const store = getBankStore();
  const now = new Date();

  const legalCase = store.cases.rowById(caseId);
  if (!legalCase) return;

  const move = transitionFor(
    {
      status: legalCase.status,
      responseDeadline: legalCase.response_deadline,
      undefended: legalCase.undefended === 1,
    },
    "withdraw",
    actorFor(legalCase, account),
    now,
  );

  if (move.allowed) {
    store.cases.transition({
      id: caseId,
      from: move.from,
      to: move.to,
      ruledAt: now.toISOString(),
    });
    revalidatePath(`/case/${caseId}`);
    revalidatePath("/docket");
  }
}

/**
 * The ruling.
 *
 * The judge check happens here as well as in the admin layout, because a
 * layout does not run for a server action — an action that trusted the page it
 * was rendered on would be no protection at all.
 */
export async function enterRuling(
  caseId: number,
  _previous: RulingState,
  formData: FormData,
): Promise<RulingState> {
  const judge = await requireJudge();

  // Two submit buttons, one form: which one was pressed is the ruling.
  const ruling = String(formData.get("ruling") ?? "");
  if (ruling !== "grant" && ruling !== "dismiss") {
    return { status: "error", message: "Choose to enter judgment or to dismiss." };
  }

  const store = getBankStore();
  sweepLapsedCases(store);

  const outcome = enterJudgment(store, { caseId, judge, grant: ruling === "grant" });
  if (!outcome.ok) return { status: "error", message: outcome.reason };

  revalidatePath(`/case/${caseId}`);
  revalidatePath("/admin");
  revalidatePath("/docket");
  revalidatePath("/statement");
  redirect(`/case/${caseId}`);
}
