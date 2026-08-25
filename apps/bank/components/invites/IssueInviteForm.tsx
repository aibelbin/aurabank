"use client";

import { Button, Field, MonoLabel } from "@aurabank/design";
import { useActionState } from "react";
import { issueInvite } from "@/app/actions/invites";
import { initialIssueState } from "@/lib/invites/state";

/**
 * Issues a code and shows it once, large enough to read off a phone.
 *
 * There is no send button because the bank sends nothing: the judge copies the
 * code into whatever they already use to talk to the person.
 */
export function IssueInviteForm() {
  const [state, submit, pending] = useActionState(issueInvite, initialIssueState);

  return (
    <div>
      <form action={submit} className="max-w-[34rem]">
        <Field
          id="email"
          label="Issued to"
          name="email"
          type="email"
          autoComplete="off"
          maxLength={254}
          placeholder="optional — a note to yourself"
          hint="Recorded so you can tell your codes apart. It does not bind the code: whoever holds it may use it, once."
        />

        <Button type="submit" disabled={pending} className="mt-9">
          {pending ? "Issuing" : "Issue a code"}
        </Button>
      </form>

      {state.status === "issued" ? (
        <div className="mt-10 border-y border-hairline py-7" role="status">
          <MonoLabel muted>Code issued{state.email ? ` for ${state.email}` : ""}</MonoLabel>
          <p className="mt-3 font-mono text-[clamp(1.75rem,8vw,2.5rem)] tracking-[0.06em] tabular-nums">
            {state.code}
          </p>
          <p className="mt-4 max-w-[46ch] font-mono text-[0.6875rem] leading-relaxed text-ink/45">
            Send it yourself. It is listed below until it is redeemed.
          </p>
        </div>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-8 font-mono text-[0.6875rem] leading-relaxed text-debt" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
