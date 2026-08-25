type Window = { count: number; resetAt: number };

export type RateLimitVerdict = {
  allowed: boolean;
  /** Milliseconds until the caller's window resets. Zero when allowed. */
  retryAfterMs: number;
};

export type RateLimiter = {
  consume(key: string): RateLimitVerdict;
};

/**
 * Fixed-window limiter held in memory, the same shape the landing page uses.
 *
 * Deliberately not durable: it resets when the process restarts, which is an
 * acceptable trade here and keeps the app free of external services. The clock
 * is injectable so the reset behaviour is testable without waiting.
 */
export function createRateLimiter({
  limit,
  windowMs,
  now = () => Date.now(),
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const windows = new Map<string, Window>();

  return {
    consume(key) {
      const timestamp = now();

      // Drop stale windows so the map cannot grow without bound.
      for (const [existingKey, window] of windows) {
        if (window.resetAt <= timestamp) windows.delete(existingKey);
      }

      const window = windows.get(key);

      if (!window) {
        windows.set(key, { count: 1, resetAt: timestamp + windowMs });
        return { allowed: true, retryAfterMs: 0 };
      }

      if (window.count >= limit) {
        return { allowed: false, retryAfterMs: window.resetAt - timestamp };
      }

      window.count += 1;
      return { allowed: true, retryAfterMs: 0 };
    },
  };
}

const MINUTE = 60 * 1000;

/** Ten attempts a quarter hour, per address. Slows a guesser without locking out a typist. */
export const signInLimiter = createRateLimiter({ limit: 10, windowMs: 15 * MINUTE });

/** Codes are single-use anyway; this stops someone enumerating them. */
export const redemptionLimiter = createRateLimiter({ limit: 10, windowMs: 60 * MINUTE });

/** Filing is the expensive action — it costs somebody else aura. */
export const filingLimiter = createRateLimiter({ limit: 10, windowMs: 60 * MINUTE });

/** Phrases a wait in the bank's register rather than in milliseconds. */
export function retryMessage(retryAfterMs: number, desk: string): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / MINUTE));
  return `Too many attempts from this address. ${desk} reopens in ${minutes} minute${
    minutes === 1 ? "" : "s"
  }.`;
}
