import { requireJudge } from "@/lib/auth/session";

/**
 * The bench. A member who is not a judge gets a 404 rather than a refusal —
 * there is no reason for them to learn that these routes exist.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireJudge();
  return <>{children}</>;
}
