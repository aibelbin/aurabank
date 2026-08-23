import { cn } from "@/lib/cn";

/**
 * Small monospaced label. Monospace is what makes text read as a bank
 * statement rather than a webpage, so it carries every number and caption.
 */
export function MonoLabel({
  children,
  muted = false,
  className,
}: {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[0.6875rem] uppercase tracking-[0.18em]",
        muted && "text-ink/45",
        className,
      )}
    >
      {children}
    </span>
  );
}
