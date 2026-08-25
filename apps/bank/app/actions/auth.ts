"use server";

import { redirect } from "next/navigation";
import { burnVerifyTime, verifyPassword } from "@/lib/auth/password";
import { signInSchema } from "@/lib/auth/schema";
import { endSession, startSession } from "@/lib/auth/session";
import type { SignInState } from "@/lib/auth/state";
import { getBankStore } from "@/lib/db/store";
import { retryMessage, signInLimiter } from "@/lib/rate-limit";
import { callerAddress } from "@/lib/request";

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    handle: String(formData.get("handle") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  const handle = parsed.success ? parsed.data.handle : String(formData.get("handle") ?? "");

  const verdict = signInLimiter.consume(await callerAddress());
  if (!verdict.allowed) {
    return { status: "error", message: retryMessage(verdict.retryAfterMs, "The desk"), handle };
  }

  if (!parsed.success) {
    return { status: "error", message: "Those credentials do not match an account.", handle };
  }

  const account = getBankStore().accounts.byHandle(parsed.data.handle);

  // One message for an unknown handle and for a wrong password, so the form
  // cannot be used to find out which handles exist.
  let matches = false;
  if (account) {
    matches = await verifyPassword(parsed.data.password, account.password_hash);
  } else {
    await burnVerifyTime(parsed.data.password);
  }

  if (!account || !matches) {
    return { status: "error", message: "Those credentials do not match an account.", handle };
  }

  await startSession(account.id);
  redirect("/statement");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/sign-in");
}
