"use client";

import { Amount, Button, MonoLabel, SectionHead } from "@aurabank/design";
import { useActionState } from "react";
import { ActionBar } from "@/components/chrome/ActionBar";
import { initialRulingState, type RulingState } from "@/lib/cases/state";

/**
 * The bench's two options, on one form.
 *
 * Both are submit buttons with the same name, so which was pressed is the
 * ruling — no client state deciding what the server is about to be told.
 */
export function RulingActions({
  action,
  amount,
  claimant,
  respondent,
  undefended,
  citation,
}: {
  action: (previous: RulingState, formData: FormData) => Promise<RulingState>;
  amount: number;
  claimant: string;
  respondent: string;
  undefended: boolean;
  /** A citation is paid from the reserve; nobody is debited. */
  citation: boolean;
}) {
  const [state, submit, pending] = useActionState(action, initialRulingState);

  return (
    <form action={submit} className="mt-14 border-t border-hairline pt-10">
      <SectionHead>The ruling</SectionHead>
      <p className="mt-4 max-w-[52ch] leading-[1.55] text-ink/70">
        {citation ? (
          <>
            Granting pays {claimant}{" "}
            <span className="font-mono">
              <Amount value={amount} />
            </span>{" "}
            out of the reserve, at once and only once. Nobody is debited. Dismissing moves nothing.
          </>
        ) : (
          <>
            Entering judgment debits {respondent} and credits {claimant}{" "}
            <span className="font-mono">
              <Amount value={amount} />
            </span>
            , at once and only once. Dismissing moves nothing.
            {undefended
              ? " The respondent filed no reply; this will be recorded on the judgment."
              : ""}
          </>
        )}
      </p>

      {state.status === "error" ? (
        <p className="mt-6 font-mono text-[0.6875rem] leading-relaxed text-debt" role="alert">
          {state.message}
        </p>
      ) : null}

      <ActionBar>
        <div className="flex gap-3">
          <Button
            type="submit"
            name="ruling"
            value="dismiss"
            tone="outline"
            disabled={pending}
            className="flex-1"
          >
            {citation ? "Refuse" : "Dismiss the claim"}
          </Button>
          <Button type="submit" name="ruling" value="grant" disabled={pending} className="flex-1">
            {pending ? "Entering" : citation ? "Grant the citation" : "Enter judgment"}
          </Button>
        </div>
      </ActionBar>
    </form>
  );
}
