"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth/password";
import {
  displayNameSchema,
  emailSchema,
  handleSchema,
  passwordSchema,
} from "@/lib/auth/schema";
import { requireJudge, startSession } from "@/lib/auth/session";
import { getBankStore, redeemInvite } from "@/lib/db/store";
import { newInviteCode, normaliseCode } from "@/lib/invites/code";
import type { IssueState, JoinState, JoinValues } from "@/lib/invites/state";
import { redemptionLimiter, retryMessage } from "@/lib/rate-limit";
import { callerAddress } from "@/lib/request";

const REASON_MESSAGE = {
  unknown_code: "That code is not one of ours.",
  already_redeemed: "That code has already been redeemed.",
  handle_taken: "That username is taken. Choose another.",
  email_taken: "That address is already on an account.",
} as const;

export async function redeemAndOpenAccount(
  _previous: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const values: JoinValues = {
    code: String(formData.get("code") ?? ""),
    handle: String(formData.get("handle") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  const verdict = redemptionLimiter.consume(await callerAddress());
  if (!verdict.allowed) {
    return { status: "error", message: retryMessage(verdict.retryAfterMs, "The desk"), values };
  }

  const code = normaliseCode(values.code);
  if (!code) {
    return { status: "error", message: "A code is eight characters, as issued.", values };
  }

  const handle = handleSchema.safeParse(values.handle);
  if (!handle.success) {
    return { status: "error", message: handle.error.issues[0].message, values };
  }

  const name = displayNameSchema.safeParse(values.name);
  if (!name.success) {
    return { status: "error", message: name.error.issues[0].message, values };
  }

  const email = emailSchema.safeParse(values.email);
  if (!email.success) {
    return { status: "error", message: email.error.issues[0].message, values };
  }

  const password = passwordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!password.success) {
    return { status: "error", message: password.error.issues[0].message, values };
  }

  const outcome = redeemInvite(getBankStore(), {
    code,
    handle: handle.data,
    displayName: name.data,
    email: email.data,
    passwordHash: await hashPassword(password.data),
  });

  if (!outcome.ok) {
    return { status: "error", message: REASON_MESSAGE[outcome.reason], values };
  }

  // Admitted: the account is open, so there is nothing to sign in for.
  await startSession(outcome.accountId);
  redirect("/statement");
}

export async function issueInvite(_previous: IssueState, formData: FormData): Promise<IssueState> {
  const judge = await requireJudge();

  const raw = String(formData.get("email") ?? "").trim();
  // The address is a note to the issuer, not a lock on the code — see §11.
  const note = raw.length > 0 ? raw.toLowerCase() : null;
  if (note && (note.length > 254 || !note.includes("@"))) {
    return { status: "error", message: "That does not look like an address. Leave it blank." };
  }

  const code = newInviteCode();
  getBankStore().invites.issue({ code, issuedToEmail: note, issuedBy: judge.id });
  revalidatePath("/admin/invites");

  return { status: "issued", code, email: note };
}
