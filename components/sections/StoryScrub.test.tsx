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
  it("exposes the whole story as a plain list in server markup", () => {
    const markup = renderToStaticMarkup(<StoryScrub />);
    expect(markup).toContain("You roast someone.");
    expect(markup).toContain("Settlement clears. The aura moves.");
    // No scroll readout without JavaScript — it would be meaningless.
    expect(markup).not.toContain("Tape");
  });

  it("marks itself for the canvas to find", () => {
    positionSection({ top: 0, height: 4000 });
    const { container } = render(<StoryScrub />);
    expect(container.querySelector("[data-story-scrub]")).not.toBeNull();
  });

  it("reserves several viewport-heights of scroll distance", () => {
    positionSection({ top: 0, height: 4000 });
    const { container } = render(<StoryScrub />);
    const section = container.querySelector<HTMLElement>("#story");
    expect(section?.style.height).toBe("400svh");
  });

  it("switches to the scrub readout once mounted", () => {
    positionSection({ top: 0, height: 4000 });
    const { container } = render(<StoryScrub />);
    expect(container.textContent).toContain("Tape");
  });

  it("shows the first caption at the start of the story", () => {
    positionSection({ top: 0, height: 4000 });
    const { container } = render(<StoryScrub />);
    const active = container.querySelector(".opacity-100");
    expect(active?.textContent).toBe("You roast someone.");
  });

  it("advances the caption as the section scrolls past", () => {
    // Halfway through 3200px of scrubbable distance.
    positionSection({ top: -1600, height: 4000 });
    const { container } = render(<StoryScrub />);

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    const active = container.querySelector(".opacity-100");
    expect(active?.textContent).toBe("You file the claim. Evidence attached.");
  });

  it("reaches the final caption at the end of the story", () => {
    positionSection({ top: -3200, height: 4000 });
    const { container } = render(<StoryScrub />);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(container.querySelector(".opacity-100")?.textContent).toBe(
      "Settlement clears. The aura moves.",
    );
  });

  it("reports the tape position, which is how the reader knows it is scrubbing", () => {
    positionSection({ top: -3200, height: 4000 });
    const { container } = render(<StoryScrub />);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(container.textContent).toContain("096 / 96");
  });

  it("hides only the inactive captions from assistive technology", () => {
    positionSection({ top: 0, height: 4000 });
    const { container } = render(<StoryScrub />);
    const hidden = container.querySelectorAll('p[aria-hidden="true"]');
    expect(hidden).toHaveLength(3);
  });

  it("stays a plain list under reduced motion, with no scrubbing at all", () => {
    stubMatchMedia(true);
    positionSection({ top: -1600, height: 4000 });
    const { container } = render(<StoryScrub />);

    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.textContent).not.toContain("Tape");
  });
});
