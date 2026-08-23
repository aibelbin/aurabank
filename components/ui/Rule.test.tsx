import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { Rule } from "./Rule";

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

describe("Rule", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is hidden from assistive technology", () => {
    stubIntersectionObserver();
    const { container } = render(<Rule />);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });

  it("holds back the draw animation until it enters the viewport", () => {
    stubIntersectionObserver();
    const { container } = render(<Rule />);
    expect(container.firstElementChild?.className).toContain("rule-line");
    expect(container.firstElementChild?.className).not.toContain("in-view");
  });

  it("draws once in view", () => {
    const observer = stubIntersectionObserver();
    const { container } = render(<Rule />);
    observer.enter();
    expect(container.firstElementChild?.className).toContain("in-view");
  });

  it("is visible when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<Rule />);
    expect(container.firstElementChild?.className).toContain("in-view");
  });
});
