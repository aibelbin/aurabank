// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { CaseStatus } from "@/lib/db/types";
import {
  actorFor,
  isTerminal,
  transitionFor,
  type Actor,
  type CaseAction,
  type CaseSnapshot,
} from "../lifecycle";

const NOW = new Date("2026-08-25T12:00:00.000Z");
const OPEN = "2026-08-26T12:00:00.000Z"; // deadline still ahead
const LAPSED = "2026-08-24T12:00:00.000Z"; // deadline already behind

const STATUSES: CaseStatus[] = [
  "awaiting_response",
  "under_review",
  "granted",
  "dismissed",
  "withdrawn",
];
const ACTORS: Actor[] = ["claimant", "respondent", "judge", "stranger"];
const ACTIONS: CaseAction[] = ["respond", "lapse", "withdraw", "grant", "dismiss"];

function snapshot(status: CaseStatus, responseDeadline = OPEN, undefended = false): CaseSnapshot {
  return { status, responseDeadline, undefended };
}

/** Every (status, action, actor) triple, so nothing is untested by omission. */
function every(deadline: string) {
  return STATUSES.flatMap((status) =>
    ACTIONS.flatMap((action) =>
      ACTORS.map((actor) => ({
        status,
        action,
        actor,
        result: transitionFor(snapshot(status, deadline), action, actor, NOW),
      })),
    ),
  );
}

const allowed = (deadline: string) =>
  every(deadline)
    .filter((row) => row.result.allowed)
    .map((row) => `${row.status} + ${row.action} by ${row.actor}`)
    .sort();

describe("who someone is on a case", () => {
  const legalCase = { claimant_id: 1, respondent_id: 2 };

  it("names the two parties", () => {
    expect(actorFor(legalCase, { id: 1, role: "member" })).toBe("claimant");
    expect(actorFor(legalCase, { id: 2, role: "member" })).toBe("respondent");
  });

  it("names a judge who is not party to it", () => {
    expect(actorFor(legalCase, { id: 3, role: "judge" })).toBe("judge");
  });

  it("names everyone else a stranger", () => {
    expect(actorFor(legalCase, { id: 3, role: "member" })).toBe("stranger");
  });

  it("calls a judge who is a party a party, so they cannot rule on it", () => {
    expect(actorFor(legalCase, { id: 1, role: "judge" })).toBe("claimant");
    expect(actorFor(legalCase, { id: 2, role: "judge" })).toBe("respondent");
  });
});

describe("the case lifecycle, exhaustively", () => {
  it("permits exactly these moves while the reply window is open", () => {
    expect(allowed(OPEN)).toEqual([
      "awaiting_response + respond by respondent",
      "awaiting_response + withdraw by claimant",
      "under_review + dismiss by judge",
      "under_review + grant by judge",
      "under_review + withdraw by claimant",
    ]);
  });

  it("permits exactly these moves once the reply window has lapsed", () => {
    expect(allowed(LAPSED)).toEqual([
      "awaiting_response + lapse by claimant",
      "awaiting_response + lapse by judge",
      "awaiting_response + lapse by respondent",
      "awaiting_response + lapse by stranger",
      "awaiting_response + withdraw by claimant",
      "under_review + dismiss by judge",
      "under_review + grant by judge",
      "under_review + withdraw by claimant",
    ]);
  });

  it("closes a case for good once it is granted, dismissed or withdrawn", () => {
    for (const status of ["granted", "dismissed", "withdrawn"] as const) {
      expect(isTerminal(status)).toBe(true);
      for (const action of ACTIONS) {
        for (const actor of ACTORS) {
          expect(transitionFor(snapshot(status), action, actor, NOW)).toEqual({
            allowed: false,
            reason: "This case is closed.",
          });
        }
      }
    }
  });
});

describe("the respondent's reply", () => {
  it("moves the case to be heard, defended", () => {
    expect(transitionFor(snapshot("awaiting_response"), "respond", "respondent", NOW)).toEqual({
      allowed: true,
      from: "awaiting_response",
      to: "under_review",
      undefended: false,
    });
  });

  it("is refused after the window closes", () => {
    expect(
      transitionFor(snapshot("awaiting_response", LAPSED), "respond", "respondent", NOW),
    ).toEqual({ allowed: false, reason: "The window for a reply has closed." });
  });

  it("closes exactly at the deadline, not a moment after", () => {
    const deadline = "2026-08-25T12:00:00.000Z";
    expect(
      transitionFor(snapshot("awaiting_response", deadline), "respond", "respondent", NOW).allowed,
    ).toBe(false);

    const aMomentLater = "2026-08-25T12:00:00.001Z";
    expect(
      transitionFor(snapshot("awaiting_response", aMomentLater), "respond", "respondent", NOW)
        .allowed,
    ).toBe(true);
  });

  it("cannot be filed by anyone else", () => {
    for (const actor of ["claimant", "judge", "stranger"] as const) {
      expect(transitionFor(snapshot("awaiting_response"), "respond", actor, NOW)).toEqual({
        allowed: false,
        reason: "Only the respondent may reply.",
      });
    }
  });
});

describe("an unanswered claim", () => {
  it("becomes undefended once the window has passed", () => {
    expect(transitionFor(snapshot("awaiting_response", LAPSED), "lapse", "judge", NOW)).toEqual({
      allowed: true,
      from: "awaiting_response",
      to: "under_review",
      undefended: true,
    });
  });

  it("is not undefended a moment early", () => {
    expect(transitionFor(snapshot("awaiting_response", OPEN), "lapse", "judge", NOW)).toEqual({
      allowed: false,
      reason: "The respondent still has time to reply.",
    });
  });

  it("carries the flag through to the ruling", () => {
    expect(
      transitionFor(snapshot("under_review", LAPSED, true), "grant", "judge", NOW),
    ).toMatchObject({ allowed: true, to: "granted", undefended: true });
  });
});

describe("withdrawal", () => {
  it("is the claimant's alone", () => {
    for (const actor of ["respondent", "judge", "stranger"] as const) {
      expect(transitionFor(snapshot("awaiting_response"), "withdraw", actor, NOW)).toEqual({
        allowed: false,
        reason: "Only the claimant may withdraw a claim.",
      });
    }
  });

  it("is available right up to judgment, from either live status", () => {
    for (const status of ["awaiting_response", "under_review"] as const) {
      expect(transitionFor(snapshot(status), "withdraw", "claimant", NOW)).toMatchObject({
        allowed: true,
        from: status,
        to: "withdrawn",
      });
    }
  });
});

describe("judgment", () => {
  it("grants and dismisses from under review", () => {
    expect(transitionFor(snapshot("under_review"), "grant", "judge", NOW)).toMatchObject({
      allowed: true,
      to: "granted",
    });
    expect(transitionFor(snapshot("under_review"), "dismiss", "judge", NOW)).toMatchObject({
      allowed: true,
      to: "dismissed",
    });
  });

  it("cannot be entered before the case has been heard", () => {
    expect(transitionFor(snapshot("awaiting_response"), "grant", "judge", NOW)).toEqual({
      allowed: false,
      reason: "This case has not been heard yet.",
    });
  });

  it("is refused to a judge who is party to the case", () => {
    for (const actor of ["claimant", "respondent"] as const) {
      expect(transitionFor(snapshot("under_review"), "grant", actor, NOW)).toEqual({
        allowed: false,
        reason: "A judge may not rule on a case they are party to.",
      });
    }
  });

  it("is refused to a member who is not a judge", () => {
    expect(transitionFor(snapshot("under_review"), "dismiss", "stranger", NOW)).toEqual({
      allowed: false,
      reason: "Only a judge may enter judgment.",
    });
  });
});

/* ── the hearing ─────────────────────────────────────────────────────────── */

import { mayRemark } from "../lifecycle";

const CLAIMANT = 1;
const RESPONDENT = 2;

function hearing(overrides: Partial<Parameters<typeof mayRemark>[0]> = {}) {
  return {
    kind: "claim" as const,
    status: "awaiting_response" as CaseStatus,
    claimant_id: CLAIMANT,
    respondent_id: RESPONDENT,
    ...overrides,
  };
}

const said = (...authors: number[]) => authors.map((author_id) => ({ author_id }));

describe("who may speak next", () => {
  it("hands the first turn to the respondent, because filing was a turn", () => {
    expect(mayRemark(hearing(), [], "respondent")).toEqual({ allowed: true });
    expect(mayRemark(hearing(), [], "claimant")).toEqual({
      allowed: false,
      reason: "You have been heard. The respondent answers next.",
    });
  });

  it("alternates the two parties, and never lets one speak twice", () => {
    const after = (...authors: number[]) => hearing({ status: "under_review" });

    // Respondent has answered: the floor returns to the claimant.
    expect(mayRemark(after(), said(RESPONDENT), "claimant")).toEqual({ allowed: true });
    expect(mayRemark(after(), said(RESPONDENT), "respondent")).toMatchObject({ allowed: false });

    // And back again.
    expect(mayRemark(after(), said(RESPONDENT, CLAIMANT), "respondent")).toEqual({ allowed: true });
    expect(mayRemark(after(), said(RESPONDENT, CLAIMANT), "claimant")).toMatchObject({
      allowed: false,
    });
  });

  it("lets the bench speak whenever, without spending anyone's turn", () => {
    const JUDGE = 9;
    const record = said(RESPONDENT, JUDGE, JUDGE);

    // Two judge remarks in a row are fine...
    expect(mayRemark(hearing({ status: "under_review" }), record, "judge")).toEqual({
      allowed: true,
    });
    // ...and they leave the floor exactly where it was: with the claimant.
    expect(mayRemark(hearing({ status: "under_review" }), record, "claimant")).toEqual({
      allowed: true,
    });
    expect(mayRemark(hearing({ status: "under_review" }), record, "respondent")).toMatchObject({
      allowed: false,
    });
  });

  it("gives a citation's claimant a turn only after the bench has spoken", () => {
    const JUDGE = 9;
    const citation = hearing({ kind: "citation", status: "under_review", respondent_id: 3 });

    // Just filed: the claimant has had their say.
    expect(mayRemark(citation, [], "claimant")).toEqual({
      allowed: false,
      reason: "You have spoken. Wait for the bench.",
    });
    // The bench asks something, and the floor opens.
    expect(mayRemark(citation, said(JUDGE), "claimant")).toEqual({ allowed: true });
    // Having answered, they wait again.
    expect(mayRemark(citation, said(JUDGE, CLAIMANT), "claimant")).toMatchObject({
      allowed: false,
    });
  });

  it("admits nobody once the case is closed", () => {
    for (const status of ["granted", "dismissed", "withdrawn"] as const) {
      for (const actor of ACTORS) {
        expect(mayRemark(hearing({ status }), said(RESPONDENT), actor)).toEqual({
          allowed: false,
          reason: "This case is closed.",
        });
      }
    }
  });

  it("admits no stranger", () => {
    expect(mayRemark(hearing({ status: "under_review" }), said(RESPONDENT), "stranger")).toEqual({
      allowed: false,
      reason: "Only the parties and the bench may be heard.",
    });
  });
});
