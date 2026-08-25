import { cn } from "../cn";
import { MonoLabel } from "./MonoLabel";

/**
 * The underlined control. Exported so a textarea, a select, or anything else
 * that has to sit in a form matches the input exactly rather than approximately.
 */
export const fieldControlClass = cn(
  "w-full border-b border-ink/25 bg-transparent pb-3 text-xl tracking-[-0.01em]",
  "placeholder:text-ink/30 focus:border-ink focus:outline-none md:text-2xl",
);

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "id"> & {
  id: string;
  label: string;
  /** Standing guidance. Always visible — a placeholder is not a label. */
  hint?: string;
  /** What went wrong with what was typed. Announced, not merely coloured. */
  error?: string;
  /**
   * A control other than a plain input — a textarea, a select, a set of
   * radios. Give it the same `id` and `fieldControlClass` where it applies.
   */
  children?: React.ReactNode;
  className?: string;
};

/** A form line: mono label in the margin, the control underlined beneath it. */
export function Field({ id, label, hint, error, children, className, ...input }: Props) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");

  return (
    <div className={className}>
      <label htmlFor={id} className="block">
        <MonoLabel muted>{label}</MonoLabel>
      </label>

      <div className="mt-4">
        {children ?? (
          <input
            id={id}
            className={fieldControlClass}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            {...input}
          />
        )}
      </div>

      {hint ? (
        <p id={`${id}-hint`} className="mt-3 font-mono text-[0.6875rem] leading-relaxed text-ink/45">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-3 font-mono text-[0.6875rem] leading-relaxed text-debt">
          {error}
        </p>
      ) : null}
    </div>
  );
}
