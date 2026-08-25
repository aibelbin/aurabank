"use client";

import { Button, Field, MonoLabel } from "@aurabank/design";
import { useActionState } from "react";
import { redeemAndOpenAccount } from "@/app/actions/invites";
import { initialJoinState } from "@/lib/invites/state";

/**
 * One form, two blocks: the code that admits you, then who you will be.
 *
 * Not two pages. Splitting them would mean holding a code as "claimed" between
 * screens, and a code claimed but never spent is a code nobody can use.
 */
export function JoinForm() {
  const [state, submit, pending] = useActionState(redeemAndOpenAccount, initialJoinState);
  const values =
    state.status === "error" ? state.values : { code: "", handle: "", name: "", email: "" };

  return (
    <form action={submit} noValidate>
      <Field
        id="code"
        label="Invite code"
        name="code"
        type="text"
        required
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={20}
        defaultValue={values.code}
        placeholder="XXXX-XXXX"
        hint="Eight characters, as issued. Case and hyphens do not matter."
        className="font-mono"
      />

      <div className="mt-12 border-t border-hairline pt-10">
        <MonoLabel muted>Your account</MonoLabel>

        <div className="mt-8 space-y-9">
          <Field
            id="name"
            label="Name"
            name="name"
            type="text"
            required
            autoComplete="name"
            maxLength={60}
            defaultValue={values.name}
            placeholder="what you are called"
            hint="Shown at the head of your statement. It need not be unique."
          />

          <Field
            id="handle"
            label="Username"
            name="handle"
            type="text"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={32}
            defaultValue={values.handle}
            placeholder="how you sign in"
            hint="Unique, and yours alone. Letters, digits, and . _ - only. This is the name on every case you are party to."
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
            placeholder="for the record"
            hint="Held for the record. AuraBank sends no mail, to you or anyone."
          />

          <Field
            id="password"
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={12}
            maxLength={200}
            hint="Twelve characters or more. There is no reset, so write it down."
          />
        </div>
      </div>

      {state.status === "error" ? (
        <p className="mt-9 font-mono text-[0.6875rem] leading-relaxed text-debt" role="alert">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" block disabled={pending} className="mt-10">
        {pending ? "Opening account" : "Redeem and open account"}
      </Button>
    </form>
  );
}
