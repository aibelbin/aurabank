import { cn } from "@/lib/cn";
import { MonoLabel } from "./MonoLabel";

/** The page's refrain. Repeated verbatim, the way a bank repeats its terms. */
export function Mantra({ className }: { className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <MonoLabel>You roast.</MonoLabel>
      <span aria-hidden="true" className="h-px w-8 bg-ink/25" />
      <MonoLabel>We verify.</MonoLabel>
      <span aria-hidden="true" className="h-px w-8 bg-ink/25" />
      <MonoLabel>The aura moves.</MonoLabel>
    </p>
  );
}
