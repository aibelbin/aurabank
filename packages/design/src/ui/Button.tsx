import { cn } from "../cn";

export type ButtonTone = "solid" | "outline" | "quiet";

const TONE_CLASS: Record<ButtonTone, string> = {
  /** The ink block. The one thing on a screen that commits an action. */
  solid: "bg-ink text-paper active:opacity-80 hover:opacity-85",
  /**
   * A ruled block, for the second action beside a primary one.
   *
   * Two pixels and full ink, not a hairline: a hairline box is what a table
   * cell looks like, and this has to read as something you press from across
   * the room.
   */
  outline: "border-2 border-ink text-ink active:bg-ink/10 hover:bg-ink/5",
  /**
   * No block, for retreat: cancel, go back, withdraw. Underlined in full ink
   * so it is unmistakably a control rather than a caption that happens to sit
   * near one.
   */
  quiet: "text-ink underline decoration-ink decoration-2 underline-offset-[6px] active:opacity-70",
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
    // Feedback on the press itself, not on release: a control that does not
    // move under the finger reads as a picture of a control. 100ms, which is
    // below the threshold where it registers as an animation.
    "transition-[opacity,transform,background-color] duration-100 ease-out",
    "active:scale-[0.985] disabled:opacity-50 disabled:active:scale-100",
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
