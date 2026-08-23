"use client";

import { cn } from "@/lib/cn";
import { useInView } from "@/lib/motion/use-in-view";

/** A hairline that draws itself left-to-right on entry. Pure decoration. */
export function Rule({ className }: { className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("rule-line h-px w-full bg-hairline", inView && "in-view", className)}
    />
  );
}
