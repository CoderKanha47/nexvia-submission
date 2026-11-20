export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple fixed-window in-memory rate limiter for auth endpoints.
 * In production this would be Redis-backed; sufficient for single-instance web.
 */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    throw new ApiError(429, `Too many requests. Try again in ${retryAfter}s.`);
  }
}

/** Periodically clear expired buckets to avoid unbounded growth. */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k);
  }
}, 60_000).unref?.();
