/**
 * Form state shared between the invite actions and their forms.
 *
 * Outside the action modules because a `"use server"` file may only export
 * async functions.
 */

export type JoinValues = { code: string; handle: string; name: string; email: string };

export type JoinState =
  | { status: "idle" }
  | { status: "error"; message: string; values: JoinValues };

export const initialJoinState: JoinState = { status: "idle" };

export type IssueState =
  | { status: "idle" }
  | { status: "issued"; code: string; email: string | null }
  | { status: "error"; message: string };

export const initialIssueState: IssueState = { status: "idle" };
