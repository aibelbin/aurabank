"use client";

import { Button, Field, MonoLabel } from "@aurabank/design";
import { useActionState } from "react";
import { applyForAccount } from "@/app/actions/waitlist";
import { HONEYPOT_FIELD, initialWaitlistState } from "@/lib/waitlist/state";

export function WaitlistForm() {
  const [state, submit, pending] = useActionState(applyForAccount, initialWaitlistState);

  if (state.status === "success") {
    return (
      <div className="border-y border-hairline py-8" role="status">
        <dl className="flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <div>
            <dt>
              <MonoLabel muted>Application</MonoLabel>
            </dt>
            <dd className="mt-2">
              <MonoLabel>Received</MonoLabel>
            </dd>
          </div>
          <div>
            <dt>
              <MonoLabel muted>Position</MonoLabel>
            </dt>
            <dd className="mt-2 font-mono text-3xl tabular-nums md:text-4xl">
              #{String(state.position).padStart(4, "0")}
            </dd>
          </div>
          <div>
            <dt>
              <MonoLabel muted>Status</MonoLabel>
            </dt>
            <dd className="mt-2">
              <MonoLabel className="text-settle">Pending</MonoLabel>
            </dd>
          </div>
        </dl>
        <p className="mt-8 max-w-[48ch] leading-[1.55] text-ink/70">
          Your application is in the queue. Accounts open in order of application.
        </p>
      </div>
    );
  }

  const values = state.status === "error" ? state.values : { handle: "", email: "" };

  return (
    <form action={submit} className="max-w-[36rem]" noValidate>
      <div className="space-y-10">
        <Field
          id="handle"
          label="Handle"
          name="handle"
          type="text"
          required
          autoComplete="nickname"
          maxLength={32}
          defaultValue={values.handle}
          placeholder="how you are known"
        />

        <Field
          id="email"
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          defaultValue={values.email}
          placeholder="where the statement goes"
        />
      </div>

      {/* Honeypot. Positioned off-screen rather than hidden, because bots skip
          display:none fields. Never announced, never focusable. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] opacity-0">
        <label htmlFor={HONEYPOT_FIELD}>Reference code</label>
        <input id={HONEYPOT_FIELD} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === "error" ? (
        <p className="mt-8 font-mono text-sm leading-relaxed text-debt" role="alert">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-12">
        {pending ? "Filing application" : "Apply for an account"}
      </Button>
    </form>
  );
}
