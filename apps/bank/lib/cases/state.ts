/**
 * Form state shared between the case actions and their forms.
 *
 * Outside the action modules because a `"use server"` file may only export
 * async functions.
 */

export type FileValues = { respondentId: string; amount: string; statement: string };

export type FileState =
  | { status: "idle" }
  | { status: "error"; message: string; values: FileValues };

export const initialFileState: FileState = { status: "idle" };

export type ReplyState = { status: "idle" } | { status: "error"; message: string; body: string };

export const initialReplyState: ReplyState = { status: "idle" };

export type RulingState = { status: "idle" } | { status: "error"; message: string };

export const initialRulingState: RulingState = { status: "idle" };

/** A statement of claim, and a reply, are both bounded. */
export const STATEMENT_MIN = 20;
export const STATEMENT_MAX = 1200;
