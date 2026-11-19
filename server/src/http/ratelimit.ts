/**
 * A fixed-window rate limiter, in memory.
 *
 * This is not hardening to add later. Inference is managed — AEGIS AI holds
 * the credential and pays for every turn — and the live-context channel
 * carries attacker-influenceable content. A per-caller ceiling is a direct
 * consequence of the no-bring-your-own-key decision.
 *
 * Limits: it is per process, so N instances allow N times the rate, and it
 * forgets everything on restart. For one instance in pre-alpha that is the
 * right trade; a shared store is needed before horizontal scaling.
 */

export type RateLimiter = {
  /** True when the call is allowed. Consumes one unit when it is. */
  take(key: string): boolean;
  /** Seconds until the current window rolls. For Retry-After. */
  retryAfter(): number;
  reset(): void;
};

export function fixedWindow(limit: number, windowMs: number): RateLimiter {
  const counts = new Map<string, { n: number; resetAt: number }>();

  const sweep = (nowMs: number): void => {
    // Bounded cleanup so a long-running process does not grow a map entry
    // per key seen, forever.
    if (counts.size < 10_000) return;
    for (const [k, v] of counts) if (v.resetAt <= nowMs) counts.delete(k);
  };

  return {
    take(key) {
      const nowMs = Date.now();
      sweep(nowMs);
      const slot = counts.get(key);
      if (!slot || slot.resetAt <= nowMs) {
        counts.set(key, { n: 1, resetAt: nowMs + windowMs });
        return true;
      }
      if (slot.n >= limit) return false;
      slot.n += 1;
      return true;
    },
    retryAfter: () => Math.ceil(windowMs / 1000),
    reset: () => counts.clear(),
  };
}
