type Bucket = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as { herdSyncRateLimits?: Map<string, Bucket> };
const buckets = globalForRateLimit.herdSyncRateLimits ?? new Map<string, Bucket>();
if (process.env.NODE_ENV !== "production") globalForRateLimit.herdSyncRateLimits = buckets;

export function takeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > 10_000) for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}
