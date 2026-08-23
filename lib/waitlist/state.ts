/**
 * Form state shared between the server action and the form.
 *
 * These live outside the action module because a `"use server"` file may only
 * export async functions — any constant exported from it is stripped away.
 */

export type WaitlistState =
  | { status: "idle" }
  | { status: "success"; position: number }
  | {
      status: "error";
      message: string;
      /** Echoed back so a rejected form keeps what the visitor typed. */
      values: { handle: string; email: string };
    };

export const initialWaitlistState: WaitlistState = { status: "idle" };

/** Name of the hidden field bots fill in and humans never see. */
export const HONEYPOT_FIELD = "reference_code";
