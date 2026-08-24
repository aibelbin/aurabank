"use client";

import { useEffect, useState } from "react";
import { cn } from "../cn";
import { useInView } from "../motion/use-in-view";
import { prefersReducedMotion, useReducedMotion } from "../motion/use-reduced-motion";

type Props = {
  value: number;
  prefix?: string;
  suffix?: string;
  /** Accent colour is reserved for figures — never for body text or chrome. */
  tone?: "ink" | "settle" | "debt";
  durationMs?: number;
  className?: string;
};

const TONE_CLASS = {
  ink: "text-ink",
  settle: "text-settle",
  debt: "text-debt",
} as const;

/**
 * A numeric figure that counts up when scrolled into view.
 *
 * Renders its final value in the initial markup so the number is correct
 * without JavaScript, then rewinds and animates once mounted.
 */
export function Figure({
  value,
  prefix,
  suffix,
  tone = "ink",
  durationMs = 1400,
  className,
}: Props) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [display, setDisplay] = useState(value);
  const [rewound, setRewound] = useState(false);

  // Rewind after mount only — server markup keeps the real number. Checked
  // synchronously, because reading it from state would flash a 0 first.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    setDisplay(0);
    setRewound(true);
  }, []);

  useEffect(() => {
    // Honour a preference that flips mid-session, mid-count.
    if (reduced) {
      setDisplay(value);
      return;
    }
    if (!inView || !rewound) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, rewound, value, durationMs]);

  return (
    <span ref={ref} className={cn("tabular-nums", TONE_CLASS[tone], className)}>
      {prefix}
      {/* Fixed locale keeps server and client markup identical. */}
      {display.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}
