"use client";

import { useEffect, useState } from "react";
import { cn } from "../cn";
import { prefersReducedMotion } from "../motion/use-reduced-motion";

/**
 * A rubber stamp struck across a document.
 *
 * The one orchestrated motion in an interface that is otherwise instant. It is
 * spent here because this is the moment the document exists for — everything
 * before it is a form being filled in, and everything after it is a record.
 *
 * Weight carries the outcome, not colour: a stamp is chrome, and accent
 * colours belong to figures. Filled for a finding, outlined for anything else.
 */
export function Stamp({
  tone = "outline",
  note,
  children,
  className,
}: {
  tone?: "solid" | "outline";
  /** A second line inside the frame, set smaller. */
  note?: string;
  children: React.ReactNode;
  className?: string;
}) {
  // Struck on mount rather than on scroll: a ruling is at the head of the
  // sheet, so it has already landed by the time anyone scrolls anywhere.
  const [struck, setStruck] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    setStruck(true);
  }, []);

  return (
    <div
      className={cn(
        "stamp inline-block border-2 border-ink p-1",
        tone === "solid" && "bg-ink text-paper",
        struck && "stamp-strike",
        className,
      )}
    >
      <div
        className={cn(
          "border px-5 py-2.5 text-center",
          tone === "solid" ? "border-paper/60" : "border-ink",
        )}
      >
        <p className="font-mono text-[0.8125rem] leading-none font-medium tracking-[0.22em] uppercase">
          {children}
        </p>
        {note ? (
          <p className="mt-2 font-mono text-[0.5625rem] leading-none tracking-[0.14em] uppercase opacity-70">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}
