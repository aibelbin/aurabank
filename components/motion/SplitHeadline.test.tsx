import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { SplitHeadline } from "./SplitHeadline";

/** Captures the IntersectionObserver callback so tests can drive intersection. */
function stubIntersectionObserver() {
  const callbacks: IntersectionObserverCallback[] = [];
  const disconnect = vi.fn();

  class Stub implements IntersectionObserver {
    root = null;
    rootMargin = "";
    thresholds: readonly number[] = [];
    constructor(callback: IntersectionObserverCallback) {
      callbacks.push(callback);
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = disconnect;
    takeRecords = () => [];
  }

  vi.stubGlobal("IntersectionObserver", Stub);

  return {
    disconnect,
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

describe("SplitHeadline", () => {
  beforeEach(() => {
    stubIntersectionObserver();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes the intact string to assistive technology exactly once", () => {
    render(<SplitHeadline text="Aura is not created" />);
    expect(screen.getByText("Aura is not created")).toBeDefined();
  });

  it("hides the per-character spans from assistive technology", () => {
    const { container } = render(<SplitHeadline text="aura" />);
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).not.toBeNull();
    expect(hidden?.querySelectorAll(".char")).toHaveLength(4);
  });

  it("renders one animated span per character, excluding spaces", () => {
    const { container } = render(<SplitHeadline text="the aura moves" />);
    expect(container.querySelectorAll(".char")).toHaveLength(12);
  });

  it("stamps each character with its stagger index", () => {
    const { container } = render(<SplitHeadline text="ab" />);
    const spans = Array.from(container.querySelectorAll<HTMLElement>(".char"));
    expect(spans.map((span) => span.style.getPropertyValue("--char-index"))).toEqual(["0", "1"]);
  });

  it("does not animate until the headline enters the viewport", () => {
    const { container } = render(<SplitHeadline text="aura" />);
    expect(container.firstElementChild?.className).not.toContain("in-view");
  });

  it("adds the in-view class once the headline is intersecting", () => {
    const observer = stubIntersectionObserver();
    const { container } = render(<SplitHeadline text="aura" />);
    observer.enter();
    expect(container.firstElementChild?.className).toContain("in-view");
  });

  it("stops observing after the entry animation has been triggered", () => {
    const observer = stubIntersectionObserver();
    render(<SplitHeadline text="aura" />);
    observer.enter();
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it("renders newlines as separate masked lines", () => {
    const { container } = render(<SplitHeadline text={"one\ntwo"} as="h1" />);
    expect(container.querySelectorAll(".overflow-hidden")).toHaveLength(2);
  });

  it("renders the requested element type", () => {
    const { container } = render(<SplitHeadline text="aura" as="h1" />);
    expect(container.firstElementChild?.tagName).toBe("H1");
  });
});
