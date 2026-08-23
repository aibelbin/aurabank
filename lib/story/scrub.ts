/**
 * Maths for scroll-scrubbing the story.
 *
 * All pure: no DOM, no GL. The canvas and the caption track both derive their
 * state from these, so they can never disagree about where in the story we are.
 */

/**
 * Progress through a pinned section, 0 to 1.
 *
 * `top` is the section's distance from the top of the viewport (as reported by
 * getBoundingClientRect), so it counts down through negative numbers as the
 * reader scrolls. The scrubbable distance is everything past the first
 * viewport-height, because that height is occupied by the pinned child.
 */
export function scrubProgress(top: number, sectionHeight: number, viewportHeight: number): number {
  const travel = sectionHeight - viewportHeight;
  if (travel <= 0) return 0;
  return Math.min(1, Math.max(0, -top / travel));
}

/** Maps progress onto a frame index. Runs backwards as happily as forwards. */
export function frameForProgress(progress: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  const clamped = Math.min(1, Math.max(0, progress));
  return Math.min(frameCount - 1, Math.floor(clamped * frameCount));
}

/** Which caption belongs to this progress. Captions divide the story evenly. */
export function captionForProgress(progress: number, captionCount: number): number {
  if (captionCount <= 0) return 0;
  const clamped = Math.min(1, Math.max(0, progress));
  return Math.min(captionCount - 1, Math.floor(clamped * captionCount));
}

/**
 * Scale factors mapping the shader's screen coordinates onto the story frame,
 * fitting the frame inside the viewport without distorting it (a "contain"
 * fit). Anything outside the frame simply shows the ambient engraving.
 */
export function storyScale(
  viewportWidth: number,
  viewportHeight: number,
  frameAspect: number,
): [number, number] {
  const minDimension = Math.min(viewportWidth, viewportHeight);
  if (minDimension <= 0 || frameAspect <= 0) return [1, 1];

  const viewportAspect = viewportWidth / viewportHeight;

  if (viewportAspect > frameAspect) {
    // Viewport is wider than the frame: height is the limiting dimension.
    return [minDimension / (frameAspect * viewportHeight), minDimension / viewportHeight];
  }
  // Viewport is narrower: width is the limiting dimension.
  return [minDimension / viewportWidth, (frameAspect * minDimension) / viewportWidth];
}
