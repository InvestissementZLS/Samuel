/**
 * In-Memory Rate Limiter — Praxis ZLS
 *
 * Simple sliding window rate limiter using a Map.
 * Works per-process (sufficient for login brute-force prevention on a single Vercel instance).
 *
 * For multi-instance rate limiting at scale, use Vercel KV or Upstash Redis.
 *
 * Usage:
 *   const limiter = getRateLimiter('login', maxAttempts, windowMs);
 *   const result = limiter.check(identifier); // identifier = IP or email
 *   if (!result.allowed) { return 429; }
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const limiters = new Map<string, Map<string, RateLimitEntry>>();

export function getRateLimiter(name: string, maxAttempts: number, windowMs: number) {
    if (!limiters.has(name)) {
        limiters.set(name, new Map());
    }
    const store = limiters.get(name)!;

    return {
        check(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
            const now = Date.now();
            const entry = store.get(identifier);

            if (!entry || now > entry.resetAt) {
                // First attempt or window expired — reset
                store.set(identifier, { count: 1, resetAt: now + windowMs });
                return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs };
            }

            if (entry.count >= maxAttempts) {
                const resetIn = entry.resetAt - now;
                return { allowed: false, remaining: 0, resetIn };
            }

            entry.count++;
            return { allowed: true, remaining: maxAttempts - entry.count, resetIn: entry.resetAt - now };
        },

        reset(identifier: string) {
            store.delete(identifier);
        },
    };
}

// Pre-configured login limiter: 5 attempts per 15 minutes per IP/email
export const loginRateLimiter = getRateLimiter('login', 5, 15 * 60 * 1000);
