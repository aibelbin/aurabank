"use client";

import { useActionState } from "react";
import { applyForAccount } from "@/app/actions/waitlist";
import { HONEYPOT_FIELD, initialWaitlistState } from "@/lib/waitlist/state";
import { MonoLabel } from "@/components/ui/MonoLabel";

const FIELD_CLASS =
  "w-full border-b border-ink/25 bg-transparent pb-3 text-xl tracking-[-0.01em] " +
  "placeholder:text-ink/30 focus:border-ink focus:outline-none md:text-2xl";

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
        <div>
          <label htmlFor="handle" className="block">
            <MonoLabel muted>Handle</MonoLabel>
          </label>
          <input
            id="handle"
            name="handle"
            type="text"
            required
            autoComplete="nickname"
            maxLength={32}
            defaultValue={values.handle}
            placeholder="how you are known"
            className={`mt-4 ${FIELD_CLASS}`}
          />
        </div>

        <div>
          <label htmlFor="email" className="block">
            <MonoLabel muted>Email</MonoLabel>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
            defaultValue={values.email}
            placeholder="where the statement goes"
            className={`mt-4 ${FIELD_CLASS}`}
          />
        </div>
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

      <button
        type="submit"
        disabled={pending}
        className="mt-12 inline-flex items-center gap-3 bg-ink px-7 py-4 font-mono text-[0.6875rem] tracking-[0.18em] text-paper uppercase transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Filing application" : "Apply for an account"}
      </button>
    </form>
  );
}
