"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** Fire slightly before the element reaches the viewport edge. */
  rootMargin?: string;
  threshold?: number;
  /** Stay true once triggered. Entry animations want this; loops don't. */
  once?: boolean;
};

/**
 * Reports whether the referenced element has entered the viewport.
 *
 * Where IntersectionObserver is unavailable the element is reported as in view
 * immediately, so entry animations resolve to their final state instead of
 * leaving content invisible.
 */
export function useInView<T extends HTMLElement>({
  rootMargin = "0px 0px -12% 0px",
  threshold = 0,
  once = true,
}: Options = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver !== "function") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);

  return { ref, inView };
}
