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

  it("discloses that aura is zero-sum", () => {
    expect(markup).toContain("Aura is zero-sum.");
    expect(markup).toContain("There is no aura printer.");
    expect(markup).toContain("We hold no reserves.");
  });

  it("explains aura debt without flinching", () => {
    expect(markup).toContain("A balance can go below zero.");
    expect(markup).toContain("there is no bankruptcy protection");
  });

  it("shows the specimen balance in arrears", () => {
    expect(markup).toContain("−1,240");
    expect(markup).toContain("text-debt");
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
