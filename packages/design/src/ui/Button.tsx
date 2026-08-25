import { cn } from "../cn";

export type ButtonTone = "solid" | "outline" | "quiet";

const TONE_CLASS: Record<ButtonTone, string> = {
  /** The ink block. The one thing on a screen that commits an action. */
  solid: "bg-ink text-paper hover:opacity-85",
  /** A hairline block, for the second action beside a primary one. */
  outline: "border border-ink/25 text-ink hover:border-ink",
  /** No block at all, for retreat: cancel, go back, withdraw. */
  quiet: "text-ink/60 underline decoration-ink/25 underline-offset-[6px] hover:text-ink",
};

/**
 * The class the ink block is made of, exported so a link can wear it.
 *
 * The design package knows nothing about routing, so it cannot render a
 * framework's `<Link>`. An app applies this to one instead, and the two stay
 * identical because there is only one source for the class.
 */
export function buttonClass({
  tone = "solid",
  block = false,
  className,
}: {
  tone?: ButtonTone;
  block?: boolean;
  className?: string;
} = {}): string {
  return cn(
    // min-h-11 is 44px: the floor for a touch target on a phone.
    "inline-flex min-h-11 items-center justify-center gap-3 px-7 py-4",
    "font-mono text-[0.6875rem] tracking-[0.18em] uppercase",
    "transition-opacity disabled:opacity-50",
    block && "w-full",
    TONE_CLASS[tone],
    className,
  );
}

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  tone?: ButtonTone;
  block?: boolean;
  className?: string;
};

/** A button in the bank's register: a mono uppercase label, set in ink. */
export function Button({ tone, block, className, type = "button", ...rest }: Props) {
  return <button type={type} className={buttonClass({ tone, block, className })} {...rest} />;
}
