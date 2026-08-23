"use client";

import { useEffect, useState } from "react";

/**
 * Reads the preference synchronously. Use this where a decision must be
 * correct on the very first commit; `useReducedMotion` reports `false` until
 * its effect has run, which is too late to avoid a visible flash.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Tracks `prefers-reduced-motion`. Starts `false` so server and client markup
 * agree on first paint, then corrects itself after mount.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
