import { cn } from "../cn";

/**
 * Plays a grid sprite sheet as a loop, in CSS alone.
 *
 * No canvas, no rAF, no JavaScript of any kind — which is the point. The page
 * has to read correctly with scripting off, and an animation driven by a timer
 * cannot honour `prefers-reduced-motion` without shipping code to check it. A
 * stepped CSS animation honours it in the stylesheet, and rests on the first
 * frame instead of stopping somewhere arbitrary.
 *
 * **Stepped through `background-position`, not through a transform.** The
 * obvious build — an oversized `<img>` slid about inside an overflow-hidden
 * window — animates a transform, which promotes the whole image to its own
 * composited layer. For a 48-frame sheet that layer is `columns × rows` times
 * the size of the frame: measured at 23 megapixels here, and it dropped a
 * fifth of all frames to 30fps while scrolling past. Painting a background
 * instead keeps the element exactly one frame in size, so the compositor only
 * ever handles what is on screen.
 *
 * The arithmetic: with the background sized to `columns × 100%` across, a
 * `background-position-x` of p% places the image at `p% × (1 − columns)` of
 * the box width — so 0% is the first column and 100% the last. `steps(n,
 * jump-none)` is the one stepping function that includes both ends, giving
 * exactly n columns. Same again vertically, timed so the columns sweep once
 * per row.
 */
export function SpriteSheet({
  src,
  srcSmall,
  columns,
  rows,
  frameWidth,
  frameHeight,
  durationMs,
  alt,
  className,
}: {
  src: string;
  /** Half-resolution sheet for small screens. Same grid, same frame count. */
  srcSmall?: string;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  durationMs: number;
  /** Empty marks it decorative; give it words only if it carries meaning. */
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn("sprite-sheet w-full", className)}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={
        {
          aspectRatio: `${frameWidth} / ${frameHeight}`,
          backgroundSize: `${columns * 100}% ${rows * 100}%`,
          // Which file to paint is a media question, so it is answered in the
          // stylesheet; only the URLs come from here.
          "--sprite-src": `url("${src}")`,
          "--sprite-src-small": `url("${srcSmall ?? src}")`,
          // Columns sweep once per row; rows advance once per loop.
          animationDuration: `${durationMs / rows}ms, ${durationMs}ms`,
          // Literals rather than custom properties: `steps()` is the one place
          // a var() is worth not betting on.
          animationTimingFunction: `steps(${columns}, jump-none), steps(${rows}, jump-none)`,
        } as React.CSSProperties
      }
    />
  );
}
