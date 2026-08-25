"use client";

import { Button, Field } from "@aurabank/design";
import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { initialSignInState } from "@/lib/auth/state";

export function SignInForm() {
  const [state, submit, pending] = useActionState(signIn, initialSignInState);

  return (
    <form action={submit} className="space-y-9" noValidate>
      <Field
        id="handle"
        label="Handle"
        name="handle"
        type="text"
        required
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={32}
        defaultValue={state.status === "error" ? state.handle : ""}
        placeholder="how you are known"
      />

      <Field
        id="password"
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        maxLength={200}
      />

      {state.status === "error" ? (
        <p className="font-mono text-[0.6875rem] leading-relaxed text-debt" role="alert">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" block disabled={pending}>
        {pending ? "Verifying" : "Sign in"}
      </Button>
    </form>
  );
}
