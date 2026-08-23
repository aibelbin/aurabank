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
/**
 * How much to enlarge the artwork beyond a plain contain fit.
 *
 * Contain-fitting a 16:9 frame into a portrait phone leaves the artwork a thin
 * strip — roughly a quarter of the screen height on a 390x844 device. The
 * frame's upper area is mostly empty, so enlarging it and letting the top crop
 * costs nothing and makes the figures legible. The cap keeps the labelled
 * balance gauges inside the horizontal crop.
 */
export function storyZoom(
  viewportWidth: number,
  viewportHeight: number,
  frameAspect: number,
): number {
  if (viewportWidth <= 0 || viewportHeight <= 0 || frameAspect <= 0) return 1;
  if (viewportWidth / viewportHeight >= frameAspect) return 1;

  // Fraction of the viewport height a contain fit would occupy.
  const heightFraction = viewportWidth / frameAspect / viewportHeight;
  if (heightFraction <= 0) return 1;
  return Math.min(1.35, Math.max(1, 0.42 / heightFraction));
}

/**
 * Where the frame sits within the viewport, as the offset half of the shader's
 * `p = uv * scale * 0.5 + offset` mapping.
 *
 * Horizontally centred, but anchored to the **bottom** of the viewport rather
 * than centred vertically. The artwork draws the two balance bars along its
 * bottom edge, and bottom-anchoring keeps them pinned to the bottom of the
 * screen like an instrument panel at every aspect ratio. Where the frame
 * already fills the height, this is identical to centring.
 */
export function storyOffset(
  viewportWidth: number,
  viewportHeight: number,
  frameAspect: number,
  zoom = 1,
): [number, number] {
  const minDimension = Math.min(viewportWidth, viewportHeight);
  if (minDimension <= 0 || frameAspect <= 0 || viewportHeight <= 0) return [0.5, 0.5];

  const [, scaleY] = storyScale(viewportWidth, viewportHeight, frameAspect, zoom);
  return [0.5, ((viewportHeight / minDimension) * scaleY) / 2];
}

export function storyScale(
  viewportWidth: number,
  viewportHeight: number,
  frameAspect: number,
  zoom = 1,
): [number, number] {
  const minDimension = Math.min(viewportWidth, viewportHeight);
  if (minDimension <= 0 || frameAspect <= 0) return [1, 1];

  const viewportAspect = viewportWidth / viewportHeight;

  // Zoom divides rather than multiplies: in the shader's
  // `p = uv * scale * 0.5 + offset`, a larger scale maps the frame onto a
  // *smaller* screen area, so enlarging the artwork means shrinking the scale.
  if (viewportAspect > frameAspect) {
    // Viewport is wider than the frame: height is the limiting dimension.
    return [
      minDimension / (frameAspect * viewportHeight * zoom),
      minDimension / (viewportHeight * zoom),
    ];
  }
  // Viewport is narrower: width is the limiting dimension.
  return [
    minDimension / (viewportWidth * zoom),
    (frameAspect * minDimension) / (viewportWidth * zoom),
  ];
}
