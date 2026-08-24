"use server";

import { headers } from "next/headers";
import { waitlistInputSchema } from "@/lib/waitlist/schema";
import { waitlistRateLimiter } from "@/lib/waitlist/rate-limit";
import { getWaitlistStore } from "@/lib/waitlist/store";
import { HONEYPOT_FIELD, type WaitlistState } from "@/lib/waitlist/state";

async function callerAddress(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  // Self-hosted and unproxied, there is no forwarding header at all.
  return forwarded?.split(",")[0]?.trim() || "local";
}

export async function applyForAccount(
  _previous: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const values = {
    handle: String(formData.get("handle") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  const store = getWaitlistStore();

  // Honeypot: report success and store nothing, so bots learn nothing.
  if (String(formData.get(HONEYPOT_FIELD) ?? "").length > 0) {
    return { status: "success", position: store.count() + 1 };
  }

  const parsed = waitlistInputSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "That application could not be processed.",
      values,
    };
  }

  // Quota is only spent on well-formed applications, so typos never lock
  // anyone out — but a bot submitting valid data still gets throttled.
  const verdict = waitlistRateLimiter.consume(await callerAddress());
  if (!verdict.allowed) {
    const minutes = Math.max(1, Math.ceil(verdict.retryAfterMs / 60_000));
    return {
      status: "error",
      message: `Too many applications from this address. The desk reopens in ${minutes} minute${
        minutes === 1 ? "" : "s"
      }.`,
      values,
    };
  }

  try {
    // A repeat application returns its original position, so the form cannot
    // be used to test whether a given address is already on the list.
    const { position } = store.add(parsed.data);
    return { status: "success", position };
  } catch (error) {
    console.error("[waitlist] failed to record application", error);
    return {
      status: "error",
      message: "Our ledger is unavailable. Try again shortly.",
      values,
    };
  }
}
