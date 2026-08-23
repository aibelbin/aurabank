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
 * Fixed-window limiter held in memory.
 *
 * Deliberately not durable: it resets when the process restarts, which is an
 * acceptable trade for a waitlist and keeps the app free of external services.
 * The clock is injectable so the reset behaviour is testable without waiting.
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

/** Five applications per address per hour. Shared by the whole process. */
export const waitlistRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60 * 60 * 1000,
});
