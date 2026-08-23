import { describe, expect, it } from "vitest";
import {
  captionForProgress,
  frameForProgress,
  scrubProgress,
  storyOffset,
  storyScale,
} from "./scrub";

describe("scrubProgress", () => {
  // A 4000px section pinned in an 800px viewport scrubs over 3200px.
  it("is zero before the section has reached the top of the viewport", () => {
    expect(scrubProgress(600, 4000, 800)).toBe(0);
  });

  it("is zero exactly as the section arrives", () => {
    expect(scrubProgress(0, 4000, 800)).toBe(0);
  });

  it("is halfway through the scrubbable distance", () => {
    expect(scrubProgress(-1600, 4000, 800)).toBeCloseTo(0.5);
  });

  it("reaches one when the section has been fully traversed", () => {
    expect(scrubProgress(-3200, 4000, 800)).toBe(1);
  });

  it("clamps rather than overshooting past the end", () => {
    expect(scrubProgress(-9999, 4000, 800)).toBe(1);
  });

  it("returns zero when the section is not taller than the viewport", () => {
    expect(scrubProgress(-100, 800, 800)).toBe(0);
  });
});

describe("frameForProgress", () => {
  it("starts on the first frame", () => {
    expect(frameForProgress(0, 96)).toBe(0);
  });

  it("ends on the last frame, never past it", () => {
    expect(frameForProgress(1, 96)).toBe(95);
  });

  it("lands mid-story halfway through", () => {
    expect(frameForProgress(0.5, 96)).toBe(48);
  });

  it("moves backwards symmetrically, which is what scrolling up needs", () => {
    expect(frameForProgress(0.75, 96)).toBe(72);
    expect(frameForProgress(0.25, 96)).toBe(24);
  });

  it("clamps out-of-range progress", () => {
    expect(frameForProgress(-3, 96)).toBe(0);
    expect(frameForProgress(9, 96)).toBe(95);
  });

  it("handles an empty atlas without dividing by zero", () => {
    expect(frameForProgress(0.5, 0)).toBe(0);
  });
});

describe("captionForProgress", () => {
  it("gives each caption an equal share of the story", () => {
    expect(captionForProgress(0, 4)).toBe(0);
    expect(captionForProgress(0.3, 4)).toBe(1);
    expect(captionForProgress(0.6, 4)).toBe(2);
    expect(captionForProgress(1, 4)).toBe(3);
  });

  it("never exceeds the last caption", () => {
    expect(captionForProgress(1.5, 3)).toBe(2);
  });
});

describe("storyScale", () => {
  const FRAME_ASPECT = 480 / 270;

  it("maps the frame edges to exactly 0 and 1 when aspects match", () => {
    const [scaleX, scaleY] = storyScale(1600, 900, FRAME_ASPECT);
    const minDimension = 900;
    // Reproduces the shader: p = uv * scale * 0.5 + 0.5
    const uvAtRightEdge = 1600 / minDimension;
    const uvAtTopEdge = 900 / minDimension;
    expect(uvAtRightEdge * scaleX * 0.5 + 0.5).toBeCloseTo(1);
    expect(uvAtTopEdge * scaleY * 0.5 + 0.5).toBeCloseTo(1);
  });

  it("letterboxes rather than stretching on a wider viewport", () => {
    const [scaleX, scaleY] = storyScale(2400, 900, FRAME_ASPECT);
    // Height still fills; width is scaled so the frame keeps its proportions.
    expect(scaleY).toBeCloseTo(1);
    expect(scaleX).toBeGreaterThan(0);
    // The frame's own aspect survives the mapping.
    expect(scaleY / scaleX).toBeCloseTo((FRAME_ASPECT * 900) / 900);
  });

  it("pillarboxes rather than cropping on a narrow phone viewport", () => {
    const [scaleX, scaleY] = storyScale(390, 844, FRAME_ASPECT);
    expect(scaleX).toBeCloseTo(1);
    expect(scaleY).toBeCloseTo(FRAME_ASPECT);
  });

  it("degrades safely on a zero-sized viewport", () => {
    expect(storyScale(0, 0, FRAME_ASPECT)).toEqual([1, 1]);
  });
});

describe("storyOffset", () => {
  const FRAME_ASPECT = 480 / 270;

  /** Reproduces the shader mapping: p = uv * scale * 0.5 + offset. */
  function frameYAtViewportBottom(width: number, height: number) {
    const [, scaleY] = storyScale(width, height, FRAME_ASPECT);
    const [, offsetY] = storyOffset(width, height, FRAME_ASPECT);
    const uvAtBottom = -height / Math.min(width, height);
    return uvAtBottom * scaleY * 0.5 + offsetY;
  }

  it("is centred horizontally", () => {
    expect(storyOffset(1600, 900, FRAME_ASPECT)[0]).toBe(0.5);
  });

  it("puts the bottom of the artwork on the bottom of the viewport", () => {
    expect(frameYAtViewportBottom(1600, 900)).toBeCloseTo(0);
  });

  it("keeps the ledger pinned to the bottom when the frame is pillarboxed", () => {
    // A viewport narrower than 16:9 would otherwise centre the frame and float
    // the balance bars up into the captions.
    expect(frameYAtViewportBottom(1280, 900)).toBeCloseTo(0);
    expect(frameYAtViewportBottom(390, 844)).toBeCloseTo(0);
  });

  it("matches plain centring where the frame already fills the height", () => {
    expect(storyOffset(1600, 900, FRAME_ASPECT)[1]).toBeCloseTo(0.5);
    expect(storyOffset(2400, 900, FRAME_ASPECT)[1]).toBeCloseTo(0.5);
  });

  it("degrades safely on a zero-sized viewport", () => {
    expect(storyOffset(0, 0, FRAME_ASPECT)).toEqual([0.5, 0.5]);
  });
});
