import type { CaseStatus } from "@/lib/db/types";

/**
 * Who someone is *on this case*, which is not the same as what they are in the
 * bank. Party membership is checked before the judge flag, so a judge who is
 * claimant or respondent is never "judge" here — that is invariant 3 expressed
 * as a data structure rather than as an `if` somebody has to remember to write.
 */
export type Actor = "claimant" | "respondent" | "judge" | "stranger";

export type CaseAction = "respond" | "lapse" | "withdraw" | "grant" | "dismiss";

export type CaseSnapshot = {
  status: CaseStatus;
  /** ISO 8601, UTC. Compared as a string, which sorts correctly in this format. */
  responseDeadline: string;
  undefended: boolean;
};

export type Transition =
  | { allowed: true; from: CaseStatus; to: CaseStatus; undefended: boolean }
  | { allowed: false; reason: string };

const TERMINAL: CaseStatus[] = ["granted", "dismissed", "withdrawn"];

export function isTerminal(status: CaseStatus): boolean {
  return TERMINAL.includes(status);
}

export function actorFor(
  legalCase: { claimant_id: number; respondent_id: number },
  account: { id: number; role: string },
): Actor {
  if (account.id === legalCase.claimant_id) return "claimant";
  if (account.id === legalCase.respondent_id) return "respondent";
  if (account.role === "judge") return "judge";
  return "stranger";
}

/**
 * The whole lifecycle, as one pure function of (status, action, actor, now).
 *
 * Pure on purpose. Every rule about who may do what and when lives here and
 * nowhere else, so the rules can be read in one screen and tested exhaustively
 * without a database. The callers' job is to apply the answer inside a
 * transaction, never to second-guess it.
 */
export function transitionFor(
  snapshot: CaseSnapshot,
  action: CaseAction,
  actor: Actor,
  now: Date,
): Transition {
  if (isTerminal(snapshot.status)) {
    return { allowed: false, reason: "This case is closed." };
  }

  const lapsed = snapshot.responseDeadline <= now.toISOString();

  switch (action) {
    case "respond": {
      if (actor !== "respondent") {
        return { allowed: false, reason: "Only the respondent may reply." };
      }
      if (snapshot.status !== "awaiting_response") {
        return { allowed: false, reason: "This case has already been answered." };
      }
      if (lapsed) {
        return { allowed: false, reason: "The window for a reply has closed." };
      }
      return { allowed: true, from: "awaiting_response", to: "under_review", undefended: false };
    }

    case "lapse": {
      // Not somebody's action: the clock's. Applied on read, because this app
      // runs no scheduler and nobody can act on a case without loading it.
      if (snapshot.status !== "awaiting_response") {
        return { allowed: false, reason: "This case is not awaiting a reply." };
      }
      if (!lapsed) {
        return { allowed: false, reason: "The respondent still has time to reply." };
      }
      return { allowed: true, from: "awaiting_response", to: "under_review", undefended: true };
    }

    case "withdraw": {
      if (actor !== "claimant") {
        return { allowed: false, reason: "Only the claimant may withdraw a claim." };
      }
      // Permitted right up to judgment, and the terminal check above is what
      // makes "before judgment" true rather than merely intended.
      return {
        allowed: true,
        from: snapshot.status,
        to: "withdrawn",
        undefended: snapshot.undefended,
      };
    }

    case "grant":
    case "dismiss": {
      if (actor !== "judge") {
        return {
          allowed: false,
          reason:
            actor === "stranger"
              ? "Only a judge may enter judgment."
              : "A judge may not rule on a case they are party to.",
        };
      }
      if (snapshot.status !== "under_review") {
        return { allowed: false, reason: "This case has not been heard yet." };
      }
      return {
        allowed: true,
        from: "under_review",
        to: action === "grant" ? "granted" : "dismissed",
        undefended: snapshot.undefended,
      };
    }
  }
}

/* ── the hearing ─────────────────────────────────────────────────────────── */

/**
 * Whether this actor may speak next.
 *
 * The rule is turn-taking, not a chat room: the two parties alternate, so
 * neither can bury the other under a wall of text, and the judge may speak
 * whenever and as often as they like without spending anyone's turn. The
 * filing counts as the claimant having spoken, which is why a freshly filed
 * case is the respondent's to answer.
 *
 * A citation has no respondent — the reserve does not defend itself — so the
 * judge stands in as the other side: the claimant may add something each time
 * the bench has said something, and not otherwise.
 *
 * Pure, like `transitionFor`, and for the same reason: this is the rule, it is
 * testable without a database, and no caller is entitled to a second opinion.
 */
export function mayRemark(
  legalCase: {
    kind: "claim" | "citation";
    status: CaseStatus;
    claimant_id: number;
    respondent_id: number;
  },
  /** Every remark on the case so far, oldest first. */
  remarks: Array<{ author_id: number }>,
  actor: Actor,
): { allowed: true } | { allowed: false; reason: string } {
  if (isTerminal(legalCase.status)) {
    return { allowed: false, reason: "This case is closed." };
  }
  if (actor === "stranger") {
    return { allowed: false, reason: "Only the parties and the bench may be heard." };
  }
  // The bench is never out of turn.
  if (actor === "judge") return { allowed: true };

  if (legalCase.kind === "citation") {
    if (actor !== "claimant") {
      return { allowed: false, reason: "Only the bench may be heard on a citation." };
    }
    const last = remarks.at(-1);
    // Nothing said since the filing, or since the claimant last spoke.
    if (last === undefined || last.author_id === legalCase.claimant_id) {
      return { allowed: false, reason: "You have spoken. Wait for the bench." };
    }
    return { allowed: true };
  }

  // Who spoke last of the two parties. The filing is the claimant's turn, so
  // an empty record means the claimant has already had it.
  const parties = [legalCase.claimant_id, legalCase.respondent_id];
  const lastParty = [...remarks].reverse().find((remark) => parties.includes(remark.author_id));
  const lastSpeaker = lastParty ? lastParty.author_id : legalCase.claimant_id;

  const speaking = actor === "claimant" ? legalCase.claimant_id : legalCase.respondent_id;
  if (lastSpeaker === speaking) {
    return {
      allowed: false,
      reason:
        actor === "claimant"
          ? "You have been heard. The respondent answers next."
          : "You have been heard. The claimant answers next.",
    };
  }

  return { allowed: true };
}
