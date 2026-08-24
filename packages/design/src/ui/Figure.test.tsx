import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { Figure } from "./Figure";

function stubMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: reducedMotion,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Drives IntersectionObserver and reports whether the element is observed. */
function stubIntersectionObserver() {
  const callbacks: IntersectionObserverCallback[] = [];
  class Stub {
    constructor(callback: IntersectionObserverCallback) {
      callbacks.push(callback);
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = () => [];
  }
  vi.stubGlobal("IntersectionObserver", Stub);
  return {
    enter() {
      act(() => {
        for (const callback of callbacks) {
          callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          );
        }
      });
    },
  };
}

describe("Figure", () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Server markup is what a visitor without JavaScript sees, so assert on it
  // directly rather than on jsdom, where effects have already run.
  it("renders the real value in server markup, so it is correct without JavaScript", () => {
    expect(renderToStaticMarkup(<Figure value={4200} />)).toContain("4,200");
  });

  it("formats thousands with a fixed locale", () => {
    expect(renderToStaticMarkup(<Figure value={1234567} />)).toContain("1,234,567");
  });

  it("renders prefix and suffix around the number", () => {
    const markup = renderToStaticMarkup(<Figure value={12} prefix="−" suffix=" aura" />);
    expect(markup).toContain("−12 aura");
  });

  it("counts up to the final value once it enters the viewport", () => {
    const observer = stubIntersectionObserver();
    // Resolve the animation in a single frame by reporting a time past the duration.
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(performance.now() + 10_000);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const { container } = render(<Figure value={500} durationMs={100} />);
    observer.enter();
    expect(container.textContent).toContain("500");
  });

  it("never starts an animation frame loop under reduced motion", () => {
    stubMatchMedia(true);
    const observer = stubIntersectionObserver();
    const raf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);

    const { container } = render(<Figure value={777} />);
    observer.enter();

    expect(raf).not.toHaveBeenCalled();
    expect(container.textContent).toContain("777");
  });

  it("applies the debt tone for negative balances", () => {
    expect(renderToStaticMarkup(<Figure value={90} tone="debt" />)).toContain("text-debt");
  });
});
