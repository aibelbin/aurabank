"use client";

import { Button, MonoLabel } from "@aurabank/design";
import { useState, useTransition } from "react";

/**
 * Withdrawal, behind one deliberate step.
 *
 * Not a dialog: a dialog on a phone is a modal to dismiss. The button simply
 * becomes the confirmation, which cannot be triggered by the same tap that
 * revealed it.
 */
export function WithdrawClaim({ action }: { action: () => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <div className="mt-14 border-t border-hairline pt-8">
        <Button tone="quiet" onClick={() => setArmed(true)}>
          Withdraw this claim
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-14 border-t border-hairline pt-8">
      <MonoLabel muted>
        Withdrawing closes the matter. No aura moves and it cannot be refiled.
      </MonoLabel>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          tone="outline"
          disabled={pending}
          onClick={() => startTransition(async () => action())}
        >
          {pending ? "Withdrawing" : "Confirm withdrawal"}
        </Button>
        <Button tone="quiet" disabled={pending} onClick={() => setArmed(false)}>
          Keep the claim
        </Button>
      </div>
    </div>
  );
}
