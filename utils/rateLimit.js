/**
 * Rate limiter / brute-force lockout tracker.
 *
 * Redis-backed (shares state across instances) when REDIS_URL is set;
 * falls back to an in-memory Map (single process only — see README
 * "Known limitations") when it isn't, or if Redis is unreachable at
 * request time.
 *
 * Every exported function is now `async`, including the in-memory path —
 * that's the one real API change from the previous version, and it's
 * unavoidable: Redis I/O can't be made synchronous, so every call site
 * needed `await` added. The parameter/return shapes are otherwise
 * unchanged. See SUMMARY.md for the full list of call sites touched.
 */
import Redis from "ioredis";

let redisClient = null;
let redisWarned = false;

function warnOnce(message) {
  if (redisWarned) return;
  redisWarned = true;
  console.warn(`[rateLimit] ${message}`);
}

function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (redisClient) return redisClient;

  redisClient = new Redis(process.env.REDIS_URL, {
    // Don't let a slow/dead Redis hang a request — fail fast and fall
    // back to memory rather than blocking the login/token endpoint.
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    lazyConnect: false,
  });
  redisClient.on("error", (err) => warnOnce(`Redis error, falling back to in-memory: ${err.message}`));
  return redisClient;
}

// ── In-memory sliding-window limiter (fallback / default) ──────────────────
const buckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > bucket.windowMs) buckets.delete(key);
  }
}, 60_000).unref?.();

function checkRateLimitMemory(key, { limit, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now, windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, retryAfterMs: windowMs - (now - bucket.windowStart) };
  }
  return { allowed: true, remaining: limit - bucket.count };
}

// ── Redis fixed-window limiter ──────────────────────────────────────────────
// INCR + PEXPIRE-on-first-hit rather than a Lua script: not perfectly
// atomic under a very tight race (two requests could both see count===1
// and both set the expiry), but the failure mode is "the window is a few
// ms longer than intended," which is harmless for a rate limiter. A Lua
// script would close that gap if this ever needs to be exact.
async function checkRateLimitRedis(redis, key, { limit, windowMs }) {
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.pexpire(redisKey, windowMs);
  }
  if (count > limit) {
    const ttl = await redis.pttl(redisKey);
    return { allowed: false, remaining: 0, retryAfterMs: ttl > 0 ? ttl : windowMs };
  }
  return { allowed: true, remaining: Math.max(0, limit - count) };
}

export async function checkRateLimit(key, { limit, windowMs }) {
  const redis = getRedis();
  if (redis) {
    try {
      return await checkRateLimitRedis(redis, key, { limit, windowMs });
    } catch (err) {
      warnOnce(`Redis unreachable, falling back to in-memory: ${err.message}`);
    }
  }
  return checkRateLimitMemory(key, { limit, windowMs });
}

// ─────────────────────────────────────────────────────────────────────────
// Brute-force lockout — distinct from the sliding-window limiter above:
// failures accumulate until a success explicitly clears them, and once the
// threshold is hit the key is locked for a fixed cooldown regardless of
// whether further attempts happen. Used for login attempts and OAuth
// client secret verification.
// ─────────────────────────────────────────────────────────────────────────
const failureBuckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of failureBuckets) {
    if (entry.lockedUntil && entry.lockedUntil < now - 3600_000) {
      failureBuckets.delete(key);
    }
  }
}, 60_000).unref?.();

function recordFailureMemory(key, { maxAttempts, lockoutMs }) {
  const now = Date.now();
  const entry = failureBuckets.get(key) || { count: 0, lockedUntil: 0 };

  entry.count += 1;
  if (entry.count >= maxAttempts) {
    entry.lockedUntil = now + lockoutMs;
  }
  failureBuckets.set(key, entry);

  return isLockedOutMemory(key);
}

function recordSuccessMemory(key) {
  failureBuckets.delete(key);
}

function isLockedOutMemory(key) {
  const entry = failureBuckets.get(key);
  if (!entry) return { locked: false };
  const now = Date.now();
  if (entry.lockedUntil > now) {
    return { locked: true, retryAfterMs: entry.lockedUntil - now };
  }
  return { locked: false };
}

// ── Redis-backed lockout ─────────────────────────────────────────────────
function lockoutKeys(key) {
  return { countKey: `lockout:count:${key}`, lockedKey: `lockout:locked:${key}` };
}

async function recordFailureRedis(redis, key, { maxAttempts, lockoutMs }) {
  const { countKey, lockedKey } = lockoutKeys(key);

  const count = await redis.incr(countKey);
  if (count === 1) {
    // Let the failure counter itself decay even if the caller never
    // succeeds again — same "stale counters eventually vanish" behavior
    // the in-memory sweep gives for free.
    await redis.pexpire(countKey, Math.max(lockoutMs, 3600_000));
  }
  if (count >= maxAttempts) {
    await redis.set(lockedKey, "1", "PX", lockoutMs);
  }
  return isLockedOutRedis(redis, key);
}

async function recordSuccessRedis(redis, key) {
  const { countKey, lockedKey } = lockoutKeys(key);
  await redis.del(countKey, lockedKey);
}

async function isLockedOutRedis(redis, key) {
  const { lockedKey } = lockoutKeys(key);
  const ttl = await redis.pttl(lockedKey);
  if (ttl > 0) return { locked: true, retryAfterMs: ttl };
  return { locked: false };
}

/** Record a failed attempt. Returns whether the key is now locked out. */
export async function recordFailure(key, { maxAttempts, lockoutMs }) {
  const redis = getRedis();
  if (redis) {
    try {
      return await recordFailureRedis(redis, key, { maxAttempts, lockoutMs });
    } catch (err) {
      warnOnce(`Redis unreachable, falling back to in-memory: ${err.message}`);
    }
  }
  return recordFailureMemory(key, { maxAttempts, lockoutMs });
}

/** Clear failures on a successful attempt. */
export async function recordSuccess(key) {
  const redis = getRedis();
  if (redis) {
    try {
      return await recordSuccessRedis(redis, key);
    } catch (err) {
      warnOnce(`Redis unreachable, falling back to in-memory: ${err.message}`);
    }
  }
  return recordSuccessMemory(key);
}

export async function isLockedOut(key) {
  const redis = getRedis();
  if (redis) {
    try {
      return await isLockedOutRedis(redis, key);
    } catch (err) {
      warnOnce(`Redis unreachable, falling back to in-memory: ${err.message}`);
    }
  }
  return isLockedOutMemory(key);
}
