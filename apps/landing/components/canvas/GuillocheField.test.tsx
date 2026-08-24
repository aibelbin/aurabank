import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { GuillocheField } from "./GuillocheField";
import { STORY_ATLAS } from "@/lib/story/atlas";

/**
 * Minimal WebGL2 stand-in: every method is a spy, and the handful of calls
 * whose return value matters report success.
 */
function fakeWebgl2(overrides: Record<string, unknown> = {}) {
  const members = new Map<string, unknown>();
  return new Proxy({} as Record<string, unknown>, {
    get(_target, property: string) {
      if (property in overrides) return overrides[property];
      switch (property) {
        case "getShaderParameter":
        case "getProgramParameter":
          return () => true;
        case "createShader":
        case "createProgram":
          return () => ({});
        case "getUniformLocation":
          return () => ({});
        default:
          if (!members.has(property)) members.set(property, vi.fn());
          return members.get(property);
      }
    },
  }) as unknown as WebGL2RenderingContext;
}

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

/** Captures the atlas image request so the load can be driven by hand. */
function stubImage() {
  const instances: Array<{ src: string; onload: (() => void) | null; onerror: (() => void) | null }> =
    [];
  class FakeImage {
    src = "";
    decoding = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    constructor() {
      instances.push(this as unknown as (typeof instances)[number]);
    }
  }
  vi.stubGlobal("Image", FakeImage);
  return instances;
}

let getContext: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stubMatchMedia(false);
  getContext = vi.fn(() => fakeWebgl2());
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    getContext as unknown as HTMLCanvasElement["getContext"],
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GuillocheField", () => {
  it("requests a WebGL2 context", () => {
    render(<GuillocheField />);
    expect(getContext).toHaveBeenCalledWith("webgl2", expect.anything());
  });

  it("is decoration: hidden from assistive technology and not interactive", () => {
    const { container } = render(<GuillocheField />);
    const canvas = container.querySelector("canvas");
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    expect(canvas?.className).toContain("pointer-events-none");
  });

  it("renders nothing at all when WebGL2 is unavailable", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = render(<GuillocheField />);
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("removes itself when the shader fails to compile", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      fakeWebgl2({ getShaderParameter: () => false }) as unknown as RenderingContext,
    );
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(<GuillocheField />);

    expect(container.querySelector("canvas")).toBeNull();
    expect(logged).toHaveBeenCalled();
  });

  it("removes itself when the program fails to link", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      fakeWebgl2({ getProgramParameter: () => false }) as unknown as RenderingContext,
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(<GuillocheField />);
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("animates when motion is allowed", () => {
    const raf = vi.fn(() => 1);
    vi.stubGlobal("requestAnimationFrame", raf);
    render(<GuillocheField />);
    expect(raf).toHaveBeenCalled();
  });

  it("draws a single static frame and starts no loop under reduced motion", () => {
    stubMatchMedia(true);
    const raf = vi.fn(() => 1);
    vi.stubGlobal("requestAnimationFrame", raf);

    const gl = fakeWebgl2();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      gl as unknown as RenderingContext,
    );

    render(<GuillocheField />);

    expect(raf).not.toHaveBeenCalled();
    expect(gl.drawArrays).toHaveBeenCalledTimes(1);
  });

  it("does not track the pointer under reduced motion", () => {
    stubMatchMedia(true);
    const addEventListener = vi.spyOn(window, "addEventListener");
    render(<GuillocheField />);
    const events = addEventListener.mock.calls.map(([event]) => event);
    expect(events).not.toContain("pointermove");
  });

  it("requests the story atlas from its documented path", () => {
    const images = stubImage();
    render(<GuillocheField />);
    expect(images).toHaveLength(1);
    expect(images[0].src).toBe(STORY_ATLAS.src);
  });

  it("creates a texture and uploads a placeholder before the atlas arrives", () => {
    const gl = fakeWebgl2();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      gl as unknown as RenderingContext,
    );
    stubImage();

    render(<GuillocheField />);

    expect(gl.createTexture).toHaveBeenCalled();
    // A 1x1 stand-in, so the first frames sample defined memory.
    expect(gl.texImage2D).toHaveBeenCalledTimes(1);
  });

  it("uploads the atlas, flipped, once it has loaded", () => {
    const gl = fakeWebgl2();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      gl as unknown as RenderingContext,
    );
    const images = stubImage();

    render(<GuillocheField />);
    act(() => {
      images[0].onload?.();
    });

    expect(gl.pixelStorei).toHaveBeenCalled();
    expect(gl.texImage2D).toHaveBeenCalledTimes(2);
  });

  it("keeps rendering the ambient plate when the atlas fails to load", () => {
    const gl = fakeWebgl2();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      gl as unknown as RenderingContext,
    );
    const images = stubImage();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    // Run exactly one frame — the loop re-arms itself, so an unbounded stub
    // would recurse forever.
    let ticks = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      if (ticks++ === 0) callback(0);
      return 1;
    });

    const { container } = render(<GuillocheField />);
    act(() => {
      images[0].onerror?.();
    });

    expect(logged).toHaveBeenCalled();
    expect(container.querySelector("canvas")).not.toBeNull();
    expect(gl.drawArrays).toHaveBeenCalled();
  });

  it("releases the texture, the animation frame, and the program on unmount", () => {
    const cancel = vi.fn();
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 7));
    vi.stubGlobal("cancelAnimationFrame", cancel);

    const gl = fakeWebgl2();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      gl as unknown as RenderingContext,
    );

    const { unmount } = render(<GuillocheField />);
    unmount();

    expect(cancel).toHaveBeenCalledWith(7);
    expect(gl.deleteTexture).toHaveBeenCalled();
    expect(gl.deleteProgram).toHaveBeenCalled();
  });
});
