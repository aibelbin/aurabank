import { cn } from "../cn";
import { MonoLabel } from "./MonoLabel";
import { Rule } from "./Rule";

/**
 * The shell every beat of the page sits in: a drawn hairline, a numbered
 * mono caption in the margin, and the column measure.
 */
export function Section({
  id,
  number,
  label,
  children,
  className,
}: {
  id: string;
  number: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("relative", className)}>
      <Rule />
      <div className="mx-auto w-full max-w-[72rem] px-6 py-24 md:px-12 md:py-36">
        <header className="mb-12 flex items-baseline gap-5 md:mb-16">
          <MonoLabel>{number}</MonoLabel>
          <MonoLabel muted>{label}</MonoLabel>
        </header>
        {children}
      </div>
    </section>
  );
}
