import { MonoLabel } from "@aurabank/design";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import type { Role } from "@/lib/db/types";

type Entry = { href: string; name: string; count?: number };

/**
 * The index of a bound ledger, at the foot of every document.
 *
 * A count appears only where the number means something — cases waiting on
 * your reply, cases waiting on a ruling. An entry with nothing outstanding
 * shows nothing rather than a zero, because a zero reads as a badge too.
 */
export function FooterIndex({
  handle,
  role,
  current,
  awaitingYou = 0,
  awaitingJudgment = 0,
}: {
  handle: string;
  role: Role;
  current: string;
  awaitingYou?: number;
  awaitingJudgment?: number;
}) {
  const entries: Entry[] = [
    { href: "/statement", name: "Statement of account" },
    { href: "/docket", name: "The docket", count: awaitingYou },
    { href: "/file", name: "File a claim" },
  ];

  if (role === "judge") {
    entries.push(
      { href: "/admin", name: "Awaiting judgment", count: awaitingJudgment },
      { href: "/admin/invites", name: "Invite codes" },
    );
  }

  return (
    <footer className="mt-20 border-t border-hairline">
      <div className="mx-auto w-full max-w-[46rem] px-6 py-8 md:px-10">
        <MonoLabel muted>In this ledger</MonoLabel>

        <nav className="mt-5 divide-y divide-hairline border-y border-hairline">
          {entries.map((entry) => {
            const here = entry.href === current;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={here ? "page" : undefined}
                className="flex min-h-11 items-center justify-between gap-4 py-3"
              >
                <span className="flex items-center gap-3">
                  {/* Where you are is marked in ink, not in colour. */}
                  <span
                    aria-hidden="true"
                    className={here ? "h-1.5 w-1.5 bg-ink" : "h-1.5 w-1.5 bg-transparent"}
                  />
                  <MonoLabel className={here ? undefined : "text-ink/70"}>{entry.name}</MonoLabel>
                </span>
                {entry.count ? (
                  <span className="font-mono text-[0.6875rem] tabular-nums">{entry.count}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <MonoLabel muted>Signed in as {handle}</MonoLabel>
          <form action={signOut}>
            <button
              type="submit"
              className="min-h-11 font-mono text-[0.6875rem] tracking-[0.18em] text-ink/60 uppercase underline decoration-ink/25 underline-offset-[6px] hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </footer>
  );
}
