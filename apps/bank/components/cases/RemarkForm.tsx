"use client";

import { Button, Field, cn, fieldControlClass } from "@aurabank/design";
import { useActionState } from "react";
import { ActionBar } from "@/components/chrome/ActionBar";
import { STATEMENT_MAX, STATEMENT_MIN, initialReplyState, type ReplyState } from "@/lib/cases/state";

export function RemarkForm({
  action,
  label,
  hint,
  submitLabel,
}: {
  action: (previous: ReplyState, formData: FormData) => Promise<ReplyState>;
  /** Whose turn it is, in the margin. */
  label: string;
  hint: string;
  submitLabel: string;
}) {
  const [state, submit, pending] = useActionState(action, initialReplyState);

  return (
    <form action={submit} className="mt-14 border-t border-hairline pt-10" noValidate>
      <Field id="body" label={label} hint={hint}>
        <textarea
          id="body"
          name="body"
          required
          rows={6}
          minLength={STATEMENT_MIN}
          maxLength={STATEMENT_MAX}
          defaultValue={state.status === "error" ? state.body : ""}
          placeholder="Say your piece."
          className={cn(fieldControlClass, "resize-y text-lg md:text-xl")}
        />
      </Field>

      {state.status === "error" ? (
        <p className="mt-6 font-mono text-[0.6875rem] leading-relaxed text-debt" role="alert">
          {state.message}
        </p>
      ) : null}

      <ActionBar>
        <Button type="submit" block disabled={pending}>
          {pending ? "Filing" : submitLabel}
        </Button>
      </ActionBar>
    </form>
  );
}
