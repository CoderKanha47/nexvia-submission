import type { RequestHandler } from 'express';
import { AppError } from '../utils/errors';

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(opts: { windowSec: number; max: number }): RequestHandler {
  const buckets = new Map<string, Bucket>();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowSec * 1000 };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));

    if (bucket.count > opts.max) {
      next(new AppError(429, 'RATE_LIMITED', 'Too many requests, try again later'));
      return;
    }

    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }

    next();
  };
}
