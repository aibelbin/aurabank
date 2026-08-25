import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "./page";

/**
 * Asserts on server markup, which is what a visitor sees before — or without —
 * JavaScript. Every line here is quoted from the approved spec; if the copy
 * drifts, this fails.
 */
const markup = renderToStaticMarkup(<Home />);

describe("landing page", () => {
  it("leads with the institution and its promise", () => {
    expect(markup).toContain("AURABANK");
    expect(markup).toContain("The central bank of aura.");
    expect(markup).toContain("Aura Mukhyam");
  });

  it("explains the mechanic in the story captions, readable without JavaScript", () => {
    for (const line of [
      "Person A roasts Person B.",
      "Person B now owes aura.",
      "Person A files a claim in the Aura app.",
      "aura moves to Person A.",
    ]) {
      expect(markup).toContain(line);
    }
  });

  it("marks the story section for the canvas to find and scrub", () => {
    expect(markup).toContain("data-story-scrub");
  });

  it("says plainly what the bank is for", () => {
    expect(markup).toContain("This is AuraBank.");
    expect(markup).toContain("and stores your aura.");
  });

  it("names what moves a balance, and what it costs", () => {
    expect(markup).toContain("A sigma moment credits it.");
    expect(markup).toContain("aura-minus evidence, debits it");
  });

  it("explains that a hearing comes before any movement", () => {
    expect(markup).toContain("Nothing moves on a say-so.");
    expect(markup).toContain("a judge rules");
  });

  it("explains aura debt without flinching", () => {
    expect(markup).toContain("it may go below zero");
    expect(markup).toContain("We call that");
    expect(markup).toContain("aura debt");
  });

  it("shows a specimen settlement as a loop, playable without JavaScript", () => {
    // A stepped CSS sheet rather than a video or a canvas: it is the only kind
    // of loop that still runs with scripting off and still stops when someone
    // has asked for less motion.
    expect(markup).toContain("/duel/duel-sheet.png");
    // The grid, stepped on both axes, both ends included.
    expect(markup).toContain("steps(8, jump-none)");
    expect(markup).toContain("steps(6, jump-none)");
    // A lighter sheet for phones, chosen in the stylesheet rather than by script.
    expect(markup).toContain("/duel/duel-sheet-half.png");
    // The plate is captioned. Deliberately not the exact sentence: the caption
    // is copy under active revision, and a quoted string here would fail on
    // every wording change without protecting anything.
    expect(markup).toMatch(/<figcaption[^>]*>.*\S.*<\/figcaption>/s);
  });

  /**
   * The band sits on a page that already holds a WebGL canvas and the story
   * atlas in texture memory. Sliding an oversized image behind a window would
   * promote a 23-megapixel composited layer — measured, and it is what made
   * scrolling past it stutter. Painting a background keeps the element one
   * frame in size. This asserts the cheap technique is the one in the markup,
   * because the expensive one looks identical in a screenshot.
   */
  it("steps the band by painting, not by transforming an oversized layer", () => {
    expect(markup).toContain("background-size");
    expect(markup).toContain("--sprite-src");
    expect(markup).not.toContain("sprite-sheet-rows");
    expect(markup).not.toContain("sprite-sheet-columns");
  });

  it("still carries the mantra", () => {
    expect(markup).toContain("The aura moves.");
  });

  it("ends with the waitlist and its fields", () => {
    expect(markup).toContain("Join the waitlist. Accounts open in order of application.");
    expect(markup).toContain('name="handle"');
    expect(markup).toContain('name="email"');
    expect(markup).toContain("Apply for an account");
  });

  it("carries the honeypot field, hidden from people", () => {
    expect(markup).toContain('name="reference_code"');
    expect(markup).toContain('tabindex="-1"');
  });

  it("closes with the disclaimer", () => {
    expect(markup).toContain("AuraBank is not a bank.");
    expect(markup).toContain("Not insured in any way.");
  });

  it("orders the four beats as specified", () => {
    const order = ["hero", "story", "disclosure", "open-an-account"].map((id) =>
      markup.indexOf(`id="${id}"`),
    );
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("no longer carries the sections that were cut", () => {
    expect(markup).not.toContain("Asked before");
    expect(markup).not.toContain("Can I roast myself for aura?");
    expect(markup).not.toContain("Aura has always been real.");
  });

  it("renders headings as real text for search engines and screen readers", () => {
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("sr-only");
  });
});
