// Requires a reachable Postgres at DATABASE_URL (see README "Testing").
//
// Route handlers under app/api are plain functions over the standard
// Request/Response API (see Next.js App Router docs), so they're called
// directly here with a real `Request` object rather than spun up behind an
// HTTP server — same "exercise the real logic, skip the server" philosophy
// tests/integration/oauth-flow.test.js already documents for this repo.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashSecret, randomToken, sha256 } from "@/utils/crypto";
import { authOptions } from "@/lib/auth";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";

function jsonRequest(url, body) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const createdUserIds = [];

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
  await prisma.$disconnect();
});

describe("POST /api/auth/signup", () => {
  it("creates a user on a valid, unique signup", async () => {
    const email = `signup-${randomToken(6)}@test.local`;
    const res = await signup(
      jsonRequest("http://localhost/api/auth/signup", { name: "Test User", email, password: "correct-horse-1" })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.email).toBe(email.toLowerCase());
    createdUserIds.push(body.id);

    const row = await prisma.user.findUnique({ where: { id: body.id } });
    expect(row.password).not.toBe("correct-horse-1"); // stored hashed, not plaintext
  });

  it("rejects a duplicate email without confirming which account exists", async () => {
    const email = `dupe-${randomToken(6)}@test.local`;
    const first = await signup(
      jsonRequest("http://localhost/api/auth/signup", { name: "First", email, password: "correct-horse-1" })
    );
    const firstBody = await first.json();
    createdUserIds.push(firstBody.id);

    const second = await signup(
      jsonRequest("http://localhost/api/auth/signup", { name: "Second", email, password: "another-password-1" })
    );
    expect(second.status).toBe(400);
    const secondBody = await second.json();
    // Deliberately vague — must not say "email already exists".
    expect(secondBody.message.toLowerCase()).not.toContain("exist");
  });

  it("rejects a malformed signup payload with invalid_request", async () => {
    const res = await signup(
      jsonRequest("http://localhost/api/auth/signup", { name: "X", email: "not-an-email", password: "short" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
  });

  it("rate-limits repeated signup attempts from the same IP", async () => {
    const req = () => {
      const request = jsonRequest("http://localhost/api/auth/signup", {
        name: "Flood",
        email: `flood-${randomToken(6)}@test.local`,
        password: "correct-horse-1",
      });
      // getClientIp reads this header — pin it so every call in this test
      // is attributed to the same rate-limit bucket.
      request.headers.set("x-forwarded-for", "203.0.113.77");
      return request;
    };

    const limit = Number(process.env.SIGNUP_RATE_LIMIT || 10);
    const results = [];
    for (let i = 0; i < limit + 3; i++) {
      const res = await signup(req());
      results.push(res.status);
      if (res.status === 201) createdUserIds.push((await res.clone().json()).id);
    }

    expect(results.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});

describe("POST /api/auth/reset-password", () => {
  let user;
  const email = `resetflow-${randomToken(6)}@test.local`;

  beforeAll(async () => {
    user = await prisma.user.create({
      data: { name: "Reset Flow User", email, password: await hashSecret("original-password-1"), role: "USER" },
    });
    createdUserIds.push(user.id);
  });

  async function issueResetToken(expiresInMs = 60 * 60_000) {
    const rawToken = randomToken(32);
    await prisma.verificationToken.create({
      data: { identifier: `reset:${email}`, token: sha256(rawToken), expires: new Date(Date.now() + expiresInMs) },
    });
    return rawToken;
  }

  it("rejects an expired reset token", async () => {
    const rawToken = await issueResetToken(-1000); // already expired
    const res = await resetPassword(
      jsonRequest("http://localhost/api/auth/reset-password", { token: rawToken, password: "new-password-123" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_token");
  });

  it("rejects a reset token that doesn't exist (never issued / already consumed)", async () => {
    const res = await resetPassword(
      jsonRequest("http://localhost/api/auth/reset-password", {
        token: "this-token-was-never-issued",
        password: "new-password-123",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_token");
  });

  it("accepts a valid token, updates the password, and consumes the token (can't be reused)", async () => {
    const rawToken = await issueResetToken();
    const first = await resetPassword(
      jsonRequest("http://localhost/api/auth/reset-password", { token: rawToken, password: "brand-new-password-1" })
    );
    expect(first.status).toBe(200);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated.passwordChangedAt).toBeTruthy();

    // Reusing the same (now-consumed) token must fail.
    const reused = await resetPassword(
      jsonRequest("http://localhost/api/auth/reset-password", { token: rawToken, password: "another-password-2" })
    );
    expect(reused.status).toBe(400);
    const reusedBody = await reused.json();
    expect(reusedBody.error).toBe("invalid_token");
  });
});

describe("A5 — session invalidation on password reset (jwt callback watermark)", () => {
  let user;

  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        name: "Session Invalidation User",
        email: `sessioninval-${randomToken(6)}@test.local`,
        password: await hashSecret("original-password-1"),
        role: "USER",
      },
    });
    createdUserIds.push(user.id);
  });

  it("keeps a token valid across jwt() calls when the password hasn't changed", async () => {
    const signInResult = await authOptions.callbacks.jwt({
      token: {},
      user: { id: user.id, role: "USER", email: user.email, passwordChangedAt: null },
    });
    expect(signInResult).not.toBeNull();

    // A later request re-decodes the same token and jwt() runs again with
    // no `user` (that's only present at sign-in) — this is the "is the
    // session still valid" check path.
    const laterResult = await authOptions.callbacks.jwt({ token: signInResult });
    expect(laterResult).not.toBeNull();
    expect(laterResult.id).toBe(user.id);
  });

  it("invalidates a token issued before a password reset", async () => {
    const signInResult = await authOptions.callbacks.jwt({
      token: {},
      user: { id: user.id, role: "USER", email: user.email, passwordChangedAt: null },
    });
    expect(signInResult).not.toBeNull();

    // Simulate the reset-password route's side effect directly.
    await prisma.user.update({ where: { id: user.id }, data: { passwordChangedAt: new Date() } });

    // The old token (stamped with the pre-reset watermark) must now be
    // rejected outright — this IS the "old sessions get logged out" fix.
    const afterReset = await authOptions.callbacks.jwt({ token: signInResult });
    expect(afterReset).toBeNull();
  });

  it("a fresh sign-in after the reset produces a token that stays valid", async () => {
    const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
    const freshSignIn = await authOptions.callbacks.jwt({
      token: {},
      user: { id: freshUser.id, role: "USER", email: freshUser.email, passwordChangedAt: freshUser.passwordChangedAt },
    });
    expect(freshSignIn).not.toBeNull();

    const stillValid = await authOptions.callbacks.jwt({ token: freshSignIn });
    expect(stillValid).not.toBeNull();
  });
});
