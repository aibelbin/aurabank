import { cn } from "../cn";

/**
 * Weight, not colour, carries the state.
 *
 * Accent colours belong to figures alone, and a status pill is chrome, so the
 * three tones differ by how much ink they spend: solid for a state that wants
 * something from you, outline for one that is live, muted for one that is over.
 */
export type StatusTone = "solid" | "outline" | "muted";

const TONE_CLASS: Record<StatusTone, string> = {
  solid: "bg-ink text-paper",
  outline: "border border-ink/30 text-ink",
  muted: "border border-hairline text-ink/45",
};

/** A mono pill stating where something stands. Reads as a stamp on a form. */
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
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1",
        "font-mono text-[0.625rem] tracking-[0.18em] whitespace-nowrap uppercase",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
