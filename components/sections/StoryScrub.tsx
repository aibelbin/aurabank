"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Rule } from "@/components/ui/Rule";
import { captionForProgress, scrubProgress } from "@/lib/story/scrub";
import { prefersReducedMotion } from "@/lib/motion/use-reduced-motion";

/**
 * The mechanic, in words. The engraving behind these is atmosphere — type is
 * what a reader can actually read, so the explaining happens here.
 */
const STEPS = [
  {
    number: "01",
    headline: "Person A roasts Person B.",
    support: "Two accounts. Watch their balances at the bottom of the screen.",
  },
  {
    number: "02",
    headline: "Person B now owes aura.",
    support: "Owed from the moment it landed. Nothing has moved yet.",
  },
  {
    number: "03",
    headline: "Person A files a claim.",
    support: "Naming Person B, the amount owed, and evidence of the roast.",
  },
  {
    number: "04",
    headline: "Person B's aura moves to Person A.",
    support: "Underwriters approve by hand. Aura is never created — only transferred.",
  },
] as const;

/**
 * The spine of the page: a tall section whose scroll position drives the toon
 * engraved into the canvas behind it. Scrolling back up runs the story
 * backwards, because the frame is a function of position, not of time.
 *
 * While scrubbing, this section shows nothing but the current step. The two
 * balance bars drawn into the artwork are the only instrumentation on screen,
 * so they stay legible instead of competing with a rail and a readout.
 */
export function StoryScrub() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Without JavaScript — or with reduced motion — the steps stay a plain
    // list, which reads the whole mechanic without any scrolling at all.
    if (prefersReducedMotion()) return;
    setScrubbing(true);

    let pending = 0;

    function measure() {
      pending = 0;
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const progress = scrubProgress(rect.top, rect.height, window.innerHeight);
      setStep(captionForProgress(progress, STEPS.length));
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
      // Viewport-heights of scroll: the first is spent pinning, the rest scrubs.
      // Shorter on phones, where four screens of scrolling is a long way to
      // drag a small picture. scrubProgress reads the real height, so the
      // mapping follows automatically.
      className="relative h-[280svh] md:h-[400svh]"
    >
      <Rule />
      {/*
        The bottom padding is deliberate: it reserves the band where the
        artwork draws the two balance bars, so nothing in the DOM sits on top
        of the ledger while the story is running.
      */}
      {/*
        On phones the captions sit directly under the header and the artwork
        takes the lower half of the screen — at that width they would otherwise
        land on top of the figures. From md up they drop to the bottom left and
        share the frame with the artwork, which is wide enough to carry them.
      */}
      <div
        className={cn(
          "sticky top-0 flex h-[100svh] flex-col px-6 pt-10 md:px-12 md:pt-12",
          scrubbing ? "pb-[12svh] md:pb-[11svh]" : "pb-12",
        )}
      >
        <header className="flex items-baseline gap-5">
          <MonoLabel>02</MonoLabel>
          <MonoLabel muted>How settlement works</MonoLabel>
        </header>

        {scrubbing ? (
          // One step at a time, stacked in place and cross-faded. The wash keeps
          // type crisp where it crosses the engraving.
          <div className="relative -mx-6 mt-10 min-h-[13em] max-w-[42ch] bg-[radial-gradient(125%_150%_at_0%_100%,var(--color-paper)_32%,transparent_80%)] px-6 sm:min-h-[11em] md:-mx-12 md:mt-auto md:min-h-[10em] md:px-12">
            {STEPS.map((entry, index) => (
              <div
                key={entry.number}
                data-caption
                data-active={index === step ? "true" : "false"}
                aria-hidden={index === step ? undefined : "true"}
                className={cn(
                  "absolute inset-x-6 bottom-0 transition-opacity duration-500 md:inset-x-12",
                  index === step ? "opacity-100" : "opacity-0",
                )}
              >
                <MonoLabel muted>{entry.number}</MonoLabel>
                <p className="mt-4 text-[clamp(1.75rem,5vw,3.5rem)] leading-[1.02] font-semibold tracking-[-0.03em]">
                  {entry.headline}
                </p>
                <p className="mt-4 max-w-[44ch] text-base leading-[1.5] text-ink/70 md:text-lg">
                  {entry.support}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <ol className="mt-10 max-w-[52ch] space-y-8 md:mt-auto">
            {STEPS.map((entry) => (
              <li key={entry.number} data-caption className="flex gap-5">
                <MonoLabel muted>{entry.number}</MonoLabel>
                <div>
                  <p className="text-xl leading-[1.25] font-semibold md:text-2xl">
                    {entry.headline}
                  </p>
                  <p className="mt-2 leading-[1.5] text-ink/70">{entry.support}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
