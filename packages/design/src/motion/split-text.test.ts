import { describe, expect, it } from "vitest";
import { splitText } from "./split-text";

const chars = (text: string) =>
  splitText(text).flatMap((line) => line.words.flatMap((w) => w.chars.map((c) => c.char)));

describe("splitText", () => {
  it("splits a single word into characters", () => {
    const lines = splitText("AURA");
    expect(lines).toHaveLength(1);
    expect(lines[0].words).toHaveLength(1);
    expect(lines[0].words[0].chars.map((c) => c.char)).toEqual(["A", "U", "R", "A"]);
  });

  it("splits words on spaces", () => {
    const lines = splitText("the central bank");
    expect(lines[0].words.map((w) => w.chars.map((c) => c.char).join(""))).toEqual([
      "the",
      "central",
      "bank",
    ]);
  });

  it("collapses runs of whitespace instead of emitting empty words", () => {
    const lines = splitText("aura    moves");
    expect(lines[0].words).toHaveLength(2);
  });

  it("splits lines on newlines", () => {
    const lines = splitText("aura is not created\nit is transferred");
    expect(lines).toHaveLength(2);
    expect(lines[1].words[0].chars.map((c) => c.char).join("")).toBe("it");
  });

  it("drops blank lines and keeps line indexes contiguous", () => {
    const lines = splitText("one\n\n\ntwo");
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.index)).toEqual([0, 1]);
  });

  it("numbers characters globally so the stagger is continuous across words and lines", () => {
    const lines = splitText("ab\ncd");
    const indexes = lines.flatMap((l) => l.words.flatMap((w) => w.chars.map((c) => c.index)));
    expect(indexes).toEqual([0, 1, 2, 3]);
  });

  it("numbers words globally too", () => {
    const lines = splitText("a b\nc");
    const wordIndexes = lines.flatMap((l) => l.words.map((w) => w.index));
    expect(wordIndexes).toEqual([0, 1, 2]);
  });

  it("keeps punctuation attached to its word", () => {
    expect(chars("zero-sum.")).toEqual(["z", "e", "r", "o", "-", "s", "u", "m", "."]);
  });

  it("treats an astral character as one character, not two code units", () => {
    const lines = splitText("a\u{1F480}b");
    expect(lines[0].words[0].chars.map((c) => c.char)).toEqual(["a", "\u{1F480}", "b"]);
  });

  it("returns no lines for empty or whitespace-only input", () => {
    expect(splitText("")).toEqual([]);
    expect(splitText("   \n  \t ")).toEqual([]);
  });

  it("ignores leading and trailing whitespace on a line", () => {
    const lines = splitText("  aura  ");
    expect(lines[0].words).toHaveLength(1);
    expect(lines[0].words[0].chars).toHaveLength(4);
  });
});
