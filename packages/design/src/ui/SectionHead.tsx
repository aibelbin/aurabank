import { cn } from "../cn";
import { MonoLabel } from "./MonoLabel";

/**
 * The head of a block within a document — "Movements", "The hearing".
 *
 * Distinct from `MonoLabel`, which captions a single field. They used to be
 * the same component with the same props, so a heading and the label on a
 * data point were typographically identical and the page read as one flat
 * list of small capitals with nothing standing above anything else.
 *
 * The difference is built from weight, size and tracking as a set rather than
 * from opacity: heavier, a step larger, and *tighter* tracked, because letter
 * spacing is size-specific and a value tuned for 11px reads loose at 12. Full
 * ink, where a field caption is muted.
 */
export function SectionHead({
  children,
  /** The count or note that belongs to this block, set quietly on the right. */
  aside,
  className,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-6", className)}>
      <h2 className="font-mono text-[0.75rem] font-medium tracking-[0.13em] text-ink uppercase">
        {children}
      </h2>
      {aside ? <MonoLabel muted>{aside}</MonoLabel> : null}
    </div>
  );
}
