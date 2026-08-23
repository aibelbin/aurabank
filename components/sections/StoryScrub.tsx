"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Rule } from "@/components/ui/Rule";
import { STORY_ATLAS } from "@/lib/story/atlas";
import { captionForProgress, frameForProgress, scrubProgress } from "@/lib/story/scrub";
import { prefersReducedMotion } from "@/lib/motion/use-reduced-motion";

/** Viewport-heights of scroll. The first is spent pinning; the rest scrubs. */
const SCREENS = 4;

const CAPTIONS = [
  "You roast someone.",
  "It lands.",
  "You file a claim.",
  "Evidence attached.",
  "Underwriters review.",
  "Settlement clears.",
] as const;

/**
 * The spine of the page: a tall section whose scroll position drives the toon
 * engraved into the canvas behind it. Scrolling back up runs the story
 * backwards, because the frame is a function of position, not of time.
 *
 * This section owns only the captions and the scroll readout. The artwork lives
 * in GuillocheField, which finds this element by its `data-story-scrub` hook.
 */
export function StoryScrub() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [caption, setCaption] = useState(0);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    // Without JavaScript — or with reduced motion — the captions stay a plain
    // list, which reads the whole story without any scrolling at all.
    if (prefersReducedMotion()) return;
    setScrubbing(true);

    let pending = 0;

    function measure() {
      pending = 0;
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const progress = scrubProgress(rect.top, rect.height, window.innerHeight);

      // Only re-render when something visible actually changes.
      setCaption(captionForProgress(progress, CAPTIONS.length));
      setFrame(frameForProgress(progress, STORY_ATLAS.frameCount));
    }

    function onScroll() {
      if (pending) return;
      pending = requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(pending);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section
      id="story"
      ref={sectionRef}
      data-story-scrub
      className="relative"
      style={{ height: `${SCREENS * 100}svh` }}
    >
      <Rule />
      <div className="sticky top-0 flex h-[100svh] flex-col justify-between px-6 py-10 md:px-12 md:py-12">
        <header className="flex items-baseline gap-5">
          <MonoLabel>02</MonoLabel>
          <MonoLabel muted>How settlement works</MonoLabel>
        </header>

        {scrubbing ? (
          // Scrubbing: one caption at a time, stacked in place and cross-faded.
          // The wash keeps type crisp where it crosses the engraving.
          <div className="relative -mx-6 h-[6em] max-w-[34ch] bg-[radial-gradient(120%_150%_at_0%_100%,var(--color-paper)_30%,transparent_78%)] px-6 md:-mx-12 md:h-[4.5em] md:px-12">
            {CAPTIONS.map((text, index) => (
              <p
                key={text}
                aria-hidden={index === caption ? undefined : "true"}
                className={cn(
                  "absolute inset-x-0 bottom-0 text-[clamp(1.75rem,5vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.03em] transition-opacity duration-500",
                  index === caption ? "opacity-100" : "opacity-0",
                )}
              >
                {text}
              </p>
            ))}
          </div>
        ) : (
          <ol className="max-w-[38ch] space-y-5">
            {CAPTIONS.map((text, index) => (
              <li key={text} className="flex gap-5">
                <MonoLabel muted>{String(index + 1).padStart(2, "0")}</MonoLabel>
                <span className="text-xl leading-[1.3] font-medium md:text-2xl">{text}</span>
              </li>
            ))}
          </ol>
        )}

        <footer className="flex items-baseline justify-between">
          <MonoLabel muted>Scroll to advance settlement</MonoLabel>
          {scrubbing ? (
            <MonoLabel muted>
              Tape {String(frame + 1).padStart(3, "0")} / {STORY_ATLAS.frameCount}
            </MonoLabel>
          ) : null}
        </footer>
      </div>
    </section>
  );
}
