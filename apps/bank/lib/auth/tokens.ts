import { randomBytes } from "node:crypto";

/** Thirty days. Long enough that a member is never signed out mid-hearing. */
export const SESSION_TTL_DAYS = 30;

export const SESSION_COOKIE = "aurabank_session";

/**
 * An opaque 256-bit token. It carries no claims and means nothing on its own —
 * the sessions table is what makes it valid, which is what lets sign-out
 * actually revoke it. A signed token would not.
 */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sessionExpiry(now = new Date()): string {
  return new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}
