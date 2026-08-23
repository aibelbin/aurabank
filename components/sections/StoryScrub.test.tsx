import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { StoryScrub } from "./StoryScrub";

function stubMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: reducedMotion,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Places the section at a chosen scroll offset within an 800px viewport. */
function positionSection({ top, height }: { top: number; height: number }) {
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    top,
    height,
    bottom: top + height,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect);
}

const activeStep = (container: HTMLElement) =>
  container.querySelector('[data-caption][data-active="true"]');

beforeEach(() => {
  stubMatchMedia(false);
  // Run scroll work synchronously so assertions see the settled state.
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("StoryScrub", () => {
  it("exposes the whole mechanic as a plain list in server markup", () => {
    const markup = renderToStaticMarkup(<StoryScrub />);
    // Named actors are what make the mechanic legible to a newcomer.
    expect(markup).toContain("Person A roasts Person B.");
    expect(markup).toContain("Person A files a claim.");
    expect(markup).toContain("Person B&#x27;s aura moves to Person A.");
    expect(markup).toContain("Naming Person B, the amount owed, and evidence of the roast.");
    // No scroll readout without JavaScript — it would be meaningless.
    expect(markup).not.toContain("Tape");
  });

  it("marks itself for the canvas to find", () => {
    positionSection({ top: 0, height: 4000 });
    const { container } = render(<StoryScrub />);
    expect(container.querySelector("[data-story-scrub]")).not.toBeNull();
  });

  it("reserves several viewport-heights of scroll distance, fewer on phones", () => {
    positionSection({ top: 0, height: 4000 });
    const { container } = render(<StoryScrub />);
    const section = container.querySelector<HTMLElement>("#story");
    // Shorter by default, taller from md up — dragging a small picture four
    // screens is a long way on a phone.
    expect(section?.className).toContain("h-[280svh]");
    expect(section?.className).toContain("md:h-[400svh]");
  });

  it("puts the captions above the artwork on phones and beside it on desktop", () => {
    positionSection({ top: 0, height: 4000 });
    const { container } = render(<StoryScrub />);
    const captions = container.querySelector('[data-caption]')?.parentElement;
    // mt-10 sits them under the header; md:mt-auto drops them to the bottom.
    expect(captions?.className).toContain("mt-10");
    expect(captions?.className).toContain("md:mt-auto");
  });

  it("switches to the one-step-at-a-time presentation once mounted", () => {
    positionSection({ top: 0, height: 4000 });
    const { container } = render(<StoryScrub />);
    expect(container.querySelectorAll('[data-caption][data-active="true"]')).toHaveLength(1);
  });

  // The artwork's balance bars are the only instrumentation during the scrub.
  it("shows nothing but the current step while scrubbing", () => {
    positionSection({ top: -1600, height: 4000 });
    const { container } = render(<StoryScrub />);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(container.textContent).not.toContain("Tape");
    expect(container.textContent).not.toContain("Scroll to advance");
    expect(container.querySelector("[data-step]")).toBeNull();
  });

  it("reserves the band where the artwork draws the ledger", () => {
    positionSection({ top: 0, height: 4000 });
    const { container } = render(<StoryScrub />);
    const pinned = container.querySelector<HTMLElement>(".sticky");
    expect(pinned?.className).toContain("pb-[12svh]");
  });

  it("shows the first step, headline and explanation, at the start", () => {
    positionSection({ top: 0, height: 4000 });
    const { container } = render(<StoryScrub />);
    expect(activeStep(container)?.textContent).toContain("Person A roasts Person B.");
    // Step one also points the reader at the balance gauges in the artwork.
    expect(activeStep(container)?.textContent).toContain("Watch their balances");
  });

  it("advances the step as the section scrolls past", () => {
    // Halfway through 3200px of scrubbable distance: four steps, so the third.
    positionSection({ top: -1600, height: 4000 });
    const { container } = render(<StoryScrub />);

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(activeStep(container)?.textContent).toContain("Person A files a claim.");
    expect(activeStep(container)?.textContent).toContain("evidence of the roast");
  });

  it("reaches the final step at the end of the story", () => {
    positionSection({ top: -3200, height: 4000 });
    const { container } = render(<StoryScrub />);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(activeStep(container)?.textContent).toContain("Person B's aura moves to Person A.");
  });

  it("hides only the inactive steps from assistive technology", () => {
    positionSection({ top: 0, height: 4000 });
    const { container } = render(<StoryScrub />);
    expect(container.querySelectorAll('[data-caption][aria-hidden="true"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-caption][data-active="true"]')).toHaveLength(1);
  });

  it("stays a plain list under reduced motion, with every step legible at once", () => {
    stubMatchMedia(true);
    positionSection({ top: -1600, height: 4000 });
    const { container } = render(<StoryScrub />);

    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.textContent).not.toContain("Tape");
    expect(container.querySelectorAll("[data-caption]")).toHaveLength(4);
  });
});
