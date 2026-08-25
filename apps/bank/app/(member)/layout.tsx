import { requireAccount } from "@/lib/auth/session";

/**
 * The door. Everything beneath this layout is members-only.
 *
 * The guard lives here so no page can forget it, but it is not the only guard:
 * layouts do not run for server actions, so every action checks for itself.
 */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  await requireAccount();
  return <>{children}</>;
}
