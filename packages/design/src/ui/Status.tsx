import { cn } from "../cn";

/**
 * Where something stands. A marker and a word — never a box.
 *
 * This used to be a bordered pill, and that was the single worst thing in the
 * interface: a small outlined rectangle beside a row is exactly what a
 * secondary button looks like, so half the page appeared pressable and none of
 * it was. A box now means one thing only, everywhere, and that thing is "you
 * can press this".
 *
 * Weight still carries the state, because accent colour belongs to figures:
 * filled for a state that wants something from you, outlined while it is live,
 * a rule once it is over.
 */
export type StatusTone = "solid" | "outline" | "muted";

const MARK: Record<StatusTone, string> = {
  solid: "bg-ink",
  outline: "border border-ink",
  // A centred rule, not a box: closed, inert, nothing to do.
  muted: "h-px w-2 bg-ink/40",
};

const TEXT: Record<StatusTone, string> = {
  solid: "text-ink",
  outline: "text-ink",
  muted: "text-ink/45",
};

export function Status({
  tone = "outline",
  children,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <span
        aria-hidden="true"
        className={cn("w-2 shrink-0", tone === "muted" ? "" : "h-2", MARK[tone])}
      />
      <span
        className={cn(
          "font-mono text-[0.625rem] tracking-[0.18em] uppercase",
          TEXT[tone],
        )}
      >
        {children}
      </span>
    </span>
  );
}
