import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { useReducedMotion } from "./use-reduced-motion";

type Listener = (event: MediaQueryListEvent) => void;

function stubMatchMedia(matches: boolean) {
  const listeners: Listener[] = [];
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: (_: string, listener: Listener) => listeners.push(listener),
      removeEventListener: vi.fn(),
    })),
  );
  return {
    change(next: boolean) {
      act(() => {
        for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent);
      });
    },
  };
}

describe("useReducedMotion", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports false when the user has expressed no preference", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("reports true when reduced motion is preferred", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("reacts when the preference changes mid-session", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    media.change(true);
    expect(result.current).toBe(true);
  });
});
