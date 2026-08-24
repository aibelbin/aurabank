"use client";

import { Fragment, type CSSProperties } from "react";
import { cn } from "../cn";
import { splitText } from "./split-text";
import { useInView } from "./use-in-view";

type Props = {
  /** Newlines become separate masked lines. */
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "div";
  className?: string;
};

/**
 * Renders text as individually animated characters rising out of a clip mask.
 *
 * The intact string is exposed to assistive technology exactly once; the
 * per-character spans are hidden from it, so screen readers never announce
 * text one letter at a time.
 */
export function SplitHeadline({ text, as: Tag = "h2", className }: Props) {
  const { ref, inView } = useInView<HTMLElement>();
  const lines = splitText(text);

  return (
    <Tag ref={ref as never} className={cn(className, inView && "in-view")}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {lines.map((line) => (
          // The mask: characters start below the baseline and are clipped away.
          <span key={line.index} className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
            {line.words.map((word, wordPosition) => (
              <Fragment key={word.index}>
                <span className="inline-block whitespace-nowrap">
                  {word.chars.map((character) => (
                    <span
                      key={character.index}
                      className="char"
                      style={{ "--char-index": character.index } as CSSProperties}
                    >
                      {character.char}
                    </span>
                  ))}
                </span>
                {wordPosition < line.words.length - 1 ? (
                  <span className="inline-block">&nbsp;</span>
                ) : null}
              </Fragment>
            ))}
          </span>
        ))}
      </span>
    </Tag>
  );
}
