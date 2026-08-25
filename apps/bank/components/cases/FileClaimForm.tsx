"use client";

import { Amount, Button, Field, MonoLabel, cn, fieldControlClass } from "@aurabank/design";
import { useActionState, useId, useState } from "react";
import { fileClaim } from "@/app/actions/cases";
import { ActionBar } from "@/components/chrome/ActionBar";
import { AMOUNT_SCHEDULE, CITATION_SCHEDULE } from "@/lib/cases/amounts";
import { STATEMENT_MAX, STATEMENT_MIN, initialFileState } from "@/lib/cases/state";
import { MAX_EXHIBITS } from "@/lib/evidence/formats";
import type { Member } from "@/lib/db/types";

export function FileClaimForm({ members }: { members: Member[] }) {
  const [state, submit, pending] = useActionState(fileClaim, initialFileState);
  const values = state.status === "error" ? state.values : { respondentId: "", amount: "", statement: "" };
  const [plates, setPlates] = useState<string[]>([]);
  // With nobody else on the books there is no claim to make, only a citation.
  const [kind, setKind] = useState<"claim" | "citation">(
    members.length === 0 ? "citation" : "claim",
  );
  const scheduleId = useId();

  return (
    <form action={submit} noValidate>
      {/* Which of the two things this is. A radio pair rather than two pages:
          the rest of the form is identical, and the choice is the first thing
          the register needs to know. */}
      <fieldset>
        <legend className="sr-only">What is being filed</legend>
        <MonoLabel muted>Filing</MonoLabel>
        <div className="mt-4 grid grid-cols-2 divide-x divide-hairline border-y border-hairline">
          {(
            [
              ["claim", "A claim", "Against a member"],
              ["citation", "A citation", "Paid from the reserve"],
            ] as const
          ).map(([value, title, note]) => (
            <label
              key={value}
              className="flex min-h-16 cursor-pointer flex-col justify-center gap-1 px-4 py-3 has-checked:bg-ink has-checked:text-paper"
            >
              <input
                type="radio"
                name="kind"
                value={value}
                required
                disabled={value === "claim" && members.length === 0}
                checked={kind === value}
                onChange={() => setKind(value)}
                className="sr-only"
              />
              <span className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase">
                {title}
              </span>
              <span className="font-mono text-[0.625rem] opacity-70">
                {value === "claim" && members.length === 0 ? "Nobody else is open" : note}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "citation" ? (
        <p className="mt-8 max-w-[48ch] font-mono text-[0.6875rem] leading-relaxed text-ink/45">
          A citation names nobody. If the bench grants it, the aura is paid out of AuraBank&rsquo;s
          own reserve — it is not taken from another member.
        </p>
      ) : null}

      <Field id="respondentId" label="Respondent" className={kind === "citation" ? "hidden" : "mt-12"}>
        <select
          id="respondentId"
          name="respondentId"
          required={kind === "claim"}
          disabled={kind === "citation"}
          defaultValue={values.respondentId}
          className={cn(fieldControlClass, "appearance-none")}
        >
          <option value="">
            {members.length === 0 ? "Nobody else holds an account" : "Name the other party"}
          </option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.handle}
            </option>
          ))}
        </select>
      </Field>

      {/* The schedule, set as a schedule: a rate on the left, what it is called
          on the right. Radios rather than a menu, so all four are visible and
          the weight of the top tier is impossible to miss. */}
      <fieldset className="mt-12 border-t border-hairline pt-10">
        <legend className="sr-only">Amount</legend>
        <MonoLabel muted>{kind === "citation" ? "Award sought" : "Amount claimed"}</MonoLabel>

        <div className="mt-5 divide-y divide-hairline border-y border-hairline">
          {(kind === "citation" ? CITATION_SCHEDULE : AMOUNT_SCHEDULE).map((tier) => (
            <label
              key={tier.amount}
              className="flex min-h-14 cursor-pointer items-center justify-between gap-5 py-3 has-checked:bg-ink has-checked:text-paper has-checked:px-4"
            >
              <span className="flex items-center gap-4">
                <input
                  type="radio"
                  name="amount"
                  value={tier.amount}
                  required
                  defaultChecked={values.amount === String(tier.amount)}
                  className="sr-only"
                  aria-describedby={`${scheduleId}-note`}
                />
                <span className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase">
                  {tier.classification}
                </span>
              </span>
              <span className="font-mono text-xl tabular-nums">
                <Amount value={tier.amount} />
              </span>
            </label>
          ))}
        </div>

        <p id={`${scheduleId}-note`} className="mt-3 font-mono text-[0.6875rem] leading-relaxed text-ink/45">
          {kind === "citation"
            ? "Fixed tiers. The bank rewards; it does not ruin."
            : "Fixed tiers. A catastrophic finding is a third of an opening balance."}
        </p>
      </fieldset>

      <div className="mt-12 border-t border-hairline pt-10">
        <Field
          id="statement"
          label={kind === "citation" ? "What happened" : "Statement of claim"}
          hint={
            kind === "citation"
              ? `The moment, and why it deserves aura. ${STATEMENT_MIN}–${STATEMENT_MAX} characters.`
              : `What happened, and why it landed. ${STATEMENT_MIN}–${STATEMENT_MAX} characters.`
          }
        >
          <textarea
            id="statement"
            name="statement"
            required
            rows={6}
            minLength={STATEMENT_MIN}
            maxLength={STATEMENT_MAX}
            defaultValue={values.statement}
            placeholder="Set out the matter plainly."
            className={cn(fieldControlClass, "resize-y text-lg md:text-xl")}
          />
        </Field>
      </div>

      <div className="mt-12 border-t border-hairline pt-10">
        <Field
          id="exhibits"
          label="Exhibits"
          hint={`Up to ${MAX_EXHIBITS} images, 5 MB each. Location and camera data are removed before an exhibit is filed.`}
        >
          <input
            id="exhibits"
            name="exhibits"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) =>
              setPlates(Array.from(event.target.files ?? []).map((file) => file.name))
            }
            className="block w-full font-mono text-[0.8125rem] text-ink/70 file:mr-4 file:min-h-11 file:border file:border-ink/25 file:bg-transparent file:px-5 file:py-3 file:font-mono file:text-[0.6875rem] file:tracking-[0.18em] file:uppercase"
          />
        </Field>

        {plates.length > 0 ? (
          <ol className="mt-5 divide-y divide-hairline border-y border-hairline">
            {plates.map((name, index) => (
              <li key={name} className="flex items-baseline gap-4 py-3">
                <MonoLabel>Exhibit {String(index + 1).padStart(2, "0")}</MonoLabel>
                <span className="truncate font-mono text-[0.8125rem] text-ink/60">{name}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {state.status === "error" ? (
        <p className="mt-10 font-mono text-[0.6875rem] leading-relaxed text-debt" role="alert">
          {state.message}
        </p>
      ) : null}

      {/* Pinned in reach rather than sitting at the end of a long form. It
          lives inside the form so it can know the filing is in flight. */}
      <ActionBar>
        <Button type="submit" block disabled={pending}>
          {pending ? "Filing" : kind === "citation" ? "File a citation" : "File a claim"}
        </Button>
      </ActionBar>
    </form>
  );
}
