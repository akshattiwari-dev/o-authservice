// No DATABASE_URL or REDIS_URL needed — REDIS_URL is intentionally left
// unset here so this exercises the in-memory fallback path directly. The
// Redis-backed path was verified manually against a real Redis instance
// (see SUMMARY.md); it isn't re-tested here because CI doesn't run a
// Redis service container, only Postgres.
import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, recordFailure, recordSuccess, isLockedOut } from "@/utils/rateLimit";

function uniqueKey(prefix) {
  return `${prefix}:${Math.random().toString(36).slice(2)}`;
}

describe("utils/rateLimit — sliding window (in-memory)", () => {
  it("allows requests up to the limit, then rejects with a retryAfterMs", async () => {
    const key = uniqueKey("window");
    const opts = { limit: 3, windowMs: 60_000 };

    expect((await checkRateLimit(key, opts)).allowed).toBe(true);
    expect((await checkRateLimit(key, opts)).allowed).toBe(true);
    expect((await checkRateLimit(key, opts)).allowed).toBe(true);

    const fourth = await checkRateLimit(key, opts);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks independent keys independently", async () => {
    const opts = { limit: 1, windowMs: 60_000 };
    const keyA = uniqueKey("a");
    const keyB = uniqueKey("b");

    expect((await checkRateLimit(keyA, opts)).allowed).toBe(true);
    expect((await checkRateLimit(keyA, opts)).allowed).toBe(false);
    // keyB has never been hit — must not be affected by keyA's usage.
    expect((await checkRateLimit(keyB, opts)).allowed).toBe(true);
  });
});

describe("utils/rateLimit — lockout tracker (in-memory)", () => {
  it("locks out after maxAttempts failures, and a success clears it", async () => {
    const key = uniqueKey("lockout");
    const opts = { maxAttempts: 3, lockoutMs: 60_000 };

    expect((await recordFailure(key, opts)).locked).toBe(false);
    expect((await recordFailure(key, opts)).locked).toBe(false);
    const third = await recordFailure(key, opts);
    expect(third.locked).toBe(true);

    expect((await isLockedOut(key)).locked).toBe(true);

    await recordSuccess(key);
    expect((await isLockedOut(key)).locked).toBe(false);
  });

  it("a key that has never failed is never locked out", async () => {
    const key = uniqueKey("never-failed");
    expect((await isLockedOut(key)).locked).toBe(false);
  });
});
