import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

function limiterAt(clock: { value: number }, limit = 3, windowMs = 1000) {
  return createRateLimiter({ limit, windowMs, now: () => clock.value });
}

describe("createRateLimiter", () => {
  it("allows requests up to the limit", () => {
    const clock = { value: 0 };
    const limiter = limiterAt(clock);
    expect([1, 2, 3].map(() => limiter.consume("ip").allowed)).toEqual([true, true, true]);
  });

  it("blocks the request after the limit is reached", () => {
    const clock = { value: 0 };
    const limiter = limiterAt(clock);
    for (let attempt = 0; attempt < 3; attempt += 1) limiter.consume("ip");
    expect(limiter.consume("ip").allowed).toBe(false);
  });

  it("reports how long until the window resets", () => {
    const clock = { value: 0 };
    const limiter = limiterAt(clock);
    for (let attempt = 0; attempt < 3; attempt += 1) limiter.consume("ip");
    clock.value = 400;
    expect(limiter.consume("ip").retryAfterMs).toBe(600);
  });

  it("allows requests again once the window has passed", () => {
    const clock = { value: 0 };
    const limiter = limiterAt(clock);
    for (let attempt = 0; attempt < 3; attempt += 1) limiter.consume("ip");
    clock.value = 1001;
    expect(limiter.consume("ip").allowed).toBe(true);
  });

  it("tracks each key independently", () => {
    const clock = { value: 0 };
    const limiter = limiterAt(clock);
    for (let attempt = 0; attempt < 3; attempt += 1) limiter.consume("first");
    expect(limiter.consume("second").allowed).toBe(true);
  });
});
