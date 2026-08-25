import { headers } from "next/headers";

/** Who is calling, for rate limiting. Self-hosted and unproxied there is no header at all. */
export async function callerAddress(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}
