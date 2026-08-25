import { cn } from "../cn";

export type AmountTone = "ink" | "settle" | "debt" | "auto";

const TONE_CLASS = {
  ink: "text-ink",
  settle: "text-settle",
  debt: "text-debt",
} as const;

/**
 * A figure on a record: static, tabular, and never animated.
 *
 * The sibling of `Figure`, which counts up when it scrolls into view. That
 * belongs on a page that is selling something. A statement is not selling
 * anything — a number on a ledger has always been that number, and animating
 * it would say otherwise.
 *
 * Renders on the server, so a balance needs no JavaScript to be correct.
 */
export function Amount({
  value,
  /** Show an explicit + or −, the way a movement is written rather than a total. */
  signed = false,
  /** "auto" takes the colour from the sign. Accent belongs on figures alone. */
  tone = "ink",
  className,
}: {
  value: number;
  signed?: boolean;
  tone?: AmountTone;
  className?: string;
}) {
  const resolved =
    tone === "auto" ? (value > 0 ? "settle" : value < 0 ? "debt" : "ink") : tone;

  // U+2212, not a hyphen: a minus sign is as wide as a plus in tabular figures.
  const sign = value < 0 ? "−" : signed ? "+" : "";

  return (
    <span className={cn("tabular-nums", TONE_CLASS[resolved], className)}>
      {sign}
      {Math.abs(value).toLocaleString("en-US")}
    </span>
  );
}
