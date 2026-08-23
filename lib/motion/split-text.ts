/**
 * Explodes a string into line -> word -> character structure so each character
 * can be animated independently.
 *
 * Pure: no DOM, no React, no side effects. The rendering layer decides what to
 * do with the indexes; this module only decides the shape.
 *
 * Character and word indexes are GLOBAL across the whole string, not per-line,
 * so a stagger reads as one continuous motion instead of restarting each line.
 */

export type SplitChar = {
  /** A single user-perceived character. Astral characters stay intact. */
  char: string;
  /** Position among all characters in the input, across every line. */
  index: number;
};

export type SplitWord = {
  chars: SplitChar[];
  /** Position among all words in the input, across every line. */
  index: number;
};

export type SplitLine = {
  words: SplitWord[];
  /** Position among the non-blank lines of the input. */
  index: number;
};

/** Splits on newlines, then whitespace runs. Blank lines are dropped. */
export function splitText(text: string): SplitLine[] {
  const lines: SplitLine[] = [];
  let charIndex = 0;
  let wordIndex = 0;

  for (const rawLine of text.split("\n")) {
    const tokens = rawLine.split(/\s+/).filter((token) => token.length > 0);
    if (tokens.length === 0) continue;

    const words: SplitWord[] = tokens.map((token) => ({
      index: wordIndex++,
      // Array.from iterates by code point, so surrogate pairs survive as one char.
      chars: Array.from(token).map((char) => ({ char, index: charIndex++ })),
    }));

    lines.push({ index: lines.length, words });
  }

  return lines;
}

/** Total character count — the stagger length a caller needs to time a sequence. */
export function countChars(lines: SplitLine[]): number {
  return lines.reduce(
    (total, line) => total + line.words.reduce((sum, word) => sum + word.chars.length, 0),
    0,
  );
}
