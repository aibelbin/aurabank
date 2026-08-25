/**
 * Form state shared between the auth actions and their forms.
 *
 * These live outside the action modules because a `"use server"` file may only
 * export async functions — any constant exported from it is stripped away.
 */

export type SignInState =
  | { status: "idle" }
  | { status: "error"; message: string; handle: string };

export const initialSignInState: SignInState = { status: "idle" };

/** Said once, on the sign-in screen, because there is no way to offer a reset. */
export const NO_RESET_NOTICE =
  "There is no password reset. AuraBank sends no mail. Ask the judge to set a new one.";
