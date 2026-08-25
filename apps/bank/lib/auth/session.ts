import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getBankStore } from "@/lib/db/store";
import type { AccountRow } from "@/lib/db/types";
import { SESSION_COOKIE, SESSION_TTL_DAYS, newSessionToken, sessionExpiry } from "./tokens";

/**
 * Who is asking, according to the session cookie. Null if nobody.
 *
 * Every protected surface funnels through here or through `requireAccount`.
 * A layout guard alone would not be enough: layouts do not run for server
 * actions, so each action checks for itself.
 */
export async function currentAccount(): Promise<AccountRow | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getBankStore().sessions.accountFor(token) ?? null;
}

/** The signed-in member, or a trip to the sign-in screen. */
export async function requireAccount(): Promise<AccountRow> {
  const account = await currentAccount();
  if (!account) redirect("/sign-in");
  return account;
}

/**
 * The judge, or a 404.
 *
 * Not a redirect and not a 403: a member who is not a judge should not learn
 * that `/admin` is a route at all.
 */
export async function requireJudge(): Promise<AccountRow> {
  const account = await requireAccount();
  if (account.role !== "judge") notFound();
  return account;
}

export async function startSession(accountId: number): Promise<void> {
  const token = newSessionToken();
  getBankStore().sessions.insert({ accountId, token, expiresAt: sessionExpiry() });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Served over HTTPS through the tunnel in production; plain HTTP locally.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

/** Signing out deletes the row, so the token is dead even if the cookie survives. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) getBankStore().sessions.destroy(token);
  jar.delete(SESSION_COOKIE);
}
