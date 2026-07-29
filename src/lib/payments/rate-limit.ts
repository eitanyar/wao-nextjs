/**
 * Minimal in-memory, fixed-window rate limiter.
 *
 * Scope/limits (documented, not hidden):
 * - Per-process only — state lives in a plain `Map` in this module's memory.
 *   Fine as long as this app runs as a single pm2 fork instance (see the
 *   same reasoning in `db.ts`'s header comment re: WAL + busy_timeout). If
 *   this ever runs under pm2 cluster mode or multiple app instances behind a
 *   load balancer, this must move to a shared store (e.g. a `rate_limits`
 *   SQLite table via `getDb()`, or Redis) — a per-process limiter would let
 *   each instance grant its own quota, multiplying the effective limit.
 * - Fixed window (not sliding/token-bucket): a burst right at a window
 *   boundary can allow up to 2x the nominal limit in a short span. Acceptable
 *   for this use case (magic-link request abuse deterrence, not a hard
 *   security boundary).
 */

interface WindowState {
  count: number;
  windowStartMs: number;
}

const buckets = new Map<string, WindowState>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Checks and increments the counter for `key`. Returns whether the request
 * is allowed under `maxRequests` per `windowMs`.
 */
export function checkRateLimit(
  key: string,
  { maxRequests, windowMs }: { maxRequests: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStartMs >= windowMs) {
    buckets.set(key, { count: 1, windowStartMs: now });
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: windowMs - (now - existing.windowStartMs),
    };
  }

  existing.count += 1;
  return { allowed: true, remaining: maxRequests - existing.count, retryAfterMs: 0 };
}

/** Test-only: clears all rate-limit state between test cases. */
export function resetRateLimitState(): void {
  buckets.clear();
}
