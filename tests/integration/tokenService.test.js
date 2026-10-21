// Requires a reachable Postgres at DATABASE_URL (see README "Testing").
// CI provisions this via a service container; locally, point DATABASE_URL
// at a scratch database before running `npm test`.
import { sha256 } from "@/utils/crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashSecret, randomToken } from "@/utils/crypto";
import {
  issueAuthorizationCode,
  redeemAuthorizationCode,
  issueTokenPair,
  rotateRefreshToken,
  issueClientCredentialsTokens,
  introspectToken,
  revokeToken,
} from "@/services/tokenService";

let user;
let client;

beforeAll(async () => {
  user = await prisma.user.create({
    data: {
      name: "Token Service Test User",
      email: `tokenservice-${randomToken(6)}@test.local`,
      password: await hashSecret("irrelevant-password-1"),
      role: "USER",
    },
  });

  client = await prisma.oAuthClient.create({
    data: {
      name: "Token Service Test Client",
      redirectUris: ["https://client.example/callback"],
      scopes: ["profile:read"],
      isPublic: true, // public client -> PKCE required, no secret needed
      ownerId: user.id,
    },
  });
});

afterAll(async () => {
  // FK cascades (onDelete: Cascade) clean up codes/tokens tied to the user/client.
  await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  await prisma.$disconnect();
});

function pkcePair() {
  const codeVerifier = "verifier-".padEnd(64, "x");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

describe("tokenService — authorization codes", () => {
  it("issues a code that can be redeemed exactly once", async () => {
    const { codeVerifier, codeChallenge } = pkcePair();
    const rawCode = await issueAuthorizationCode({
      client,
      userId: user.id,
      redirectUri: client.redirectUris[0],
      scopes: ["profile:read"],
      codeChallenge,
      codeChallengeMethod: "S256",
    });

    const authCode = await redeemAuthorizationCode({
      rawCode,
      client,
      redirectUri: client.redirectUris[0],
      codeVerifier,
    });
    expect(authCode.userId).toBe(user.id);

    // Second redemption of the same code must fail — single-use.
    await expect(
      redeemAuthorizationCode({
        rawCode,
        client,
        redirectUri: client.redirectUris[0],
        codeVerifier,
      })
    ).rejects.toThrow(/invalid|expired|used/i);
  });

  it("rejects redemption with a redirect_uri that doesn't byte-match the original", async () => {
    const { codeVerifier, codeChallenge } = pkcePair();
    const rawCode = await issueAuthorizationCode({
      client,
      userId: user.id,
      redirectUri: client.redirectUris[0],
      scopes: ["profile:read"],
      codeChallenge,
      codeChallengeMethod: "S256",
    });

    // Trailing slash difference — RFC 6749 requires exact match, not
    // URL-equivalence.
    await expect(
      redeemAuthorizationCode({
        rawCode,
        client,
        redirectUri: `${client.redirectUris[0]}/`,
        codeVerifier,
      })
    ).rejects.toThrow(/redirect_uri/i);
  });

  it("rejects an authorization code once it has expired", async () => {
    const { codeVerifier, codeChallenge } = pkcePair();
    const rawCode = await issueAuthorizationCode({
      client,
      userId: user.id,
      redirectUri: client.redirectUris[0],
      scopes: ["profile:read"],
      codeChallenge,
      codeChallengeMethod: "S256",
    });

    // Simulate expiry directly rather than sleeping AUTH_CODE_TTL seconds.
    await prisma.authorizationCode.updateMany({
      where: { codeHash: sha256(rawCode) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(
      redeemAuthorizationCode({ rawCode, client, redirectUri: client.redirectUris[0], codeVerifier })
    ).rejects.toThrow(/expired/i);
  });

  it("rejects redemption of a code that was disabled by an admin mid-flow", async () => {
    const { codeVerifier, codeChallenge } = pkcePair();
    const rawCode = await issueAuthorizationCode({
      client,
      userId: user.id,
      redirectUri: client.redirectUris[0],
      scopes: ["profile:read"],
      codeChallenge,
      codeChallengeMethod: "S256",
    });

    const disabledClient = { ...client, disabled: true };
    await expect(
      redeemAuthorizationCode({ rawCode, client: disabledClient, redirectUri: client.redirectUris[0], codeVerifier })
    ).rejects.toThrow(/disabled/i);
  });
});

describe("tokenService — refresh token rotation", () => {
  it("rotating a refresh token issues a new pair and invalidates the old one", async () => {
    const pair = await issueTokenPair({ client, userId: user.id, scopes: ["profile:read"] });

    const rotated = await rotateRefreshToken({
      rawRefreshToken: pair.refresh_token,
      client,
      requestedScope: null,
    });

    expect(rotated.refresh_token).toBeTruthy();
    expect(rotated.refresh_token).not.toBe(pair.refresh_token);
    expect(rotated.access_token).not.toBe(pair.access_token);
  });

  it("reusing an already-rotated refresh token revokes the whole chain and fails", async () => {
    const pair = await issueTokenPair({ client, userId: user.id, scopes: ["profile:read"] });

    const rotated = await rotateRefreshToken({
      rawRefreshToken: pair.refresh_token,
      client,
      requestedScope: null,
    });

    // Reusing the now-stale original refresh token is a reuse/replay signal.
    await expect(
      rotateRefreshToken({ rawRefreshToken: pair.refresh_token, client, requestedScope: null })
    ).rejects.toThrow(/revoked|expired|invalid/i);

    // The chain revocation should also have caught the token issued by the
    // rotation above — it must be unusable now too.
    await expect(
      rotateRefreshToken({ rawRefreshToken: rotated.refresh_token, client, requestedScope: null })
    ).rejects.toThrow(/revoked|expired|invalid/i);
  });

  it("under concurrent rotation of the same refresh token, exactly one request wins", async () => {
    // Regression test for the race fixed in rotateRefreshToken: two
    // requests presenting the same valid refresh token used to both be
    // able to pass a `revoked === false` read before either write
    // landed, minting two valid token pairs from one refresh token. The
    // atomic updateMany claim closes that — fire both concurrently and
    // assert only one succeeds.
    const pair = await issueTokenPair({ client, userId: user.id, scopes: ["profile:read"] });

    const results = await Promise.allSettled([
      rotateRefreshToken({ rawRefreshToken: pair.refresh_token, client, requestedScope: null }),
      rotateRefreshToken({ rawRefreshToken: pair.refresh_token, client, requestedScope: null }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason.message).toMatch(/revoked|expired|invalid/i);
  });

  it("rejects scope escalation on refresh", async () => {
    const pair = await issueTokenPair({ client, userId: user.id, scopes: ["profile:read"] });

    await expect(
      rotateRefreshToken({
        rawRefreshToken: pair.refresh_token,
        client,
        requestedScope: "profile:read admin:everything",
      })
    ).rejects.toThrow(/scope/i);
  });

  it("rejects a refresh token presented by a different client than issued it", async () => {
    const pair = await issueTokenPair({ client, userId: user.id, scopes: ["profile:read"] });

    const otherClient = await prisma.oAuthClient.create({
      data: {
        name: "Other Client",
        redirectUris: ["https://other.example/callback"],
        scopes: ["profile:read"],
        isPublic: true,
        ownerId: user.id,
      },
    });

    await expect(
      rotateRefreshToken({ rawRefreshToken: pair.refresh_token, client: otherClient, requestedScope: null })
    ).rejects.toThrow(/invalid/i);

    await prisma.oAuthClient.delete({ where: { id: otherClient.id } }).catch(() => {});
  });
});

describe("tokenService — client_credentials grant", () => {
  it("issues a token for a confidential client, and refuses public clients", async () => {
    const confidential = await prisma.oAuthClient.create({
      data: {
        name: "Confidential Test Client",
        redirectUris: ["https://client.example/callback"],
        scopes: ["profile:read"],
        isPublic: false,
        clientSecretHash: await hashSecret("irrelevant-secret"),
        ownerId: user.id,
      },
    });

    const tokens = await issueClientCredentialsTokens({ client: confidential, requestedScope: null });
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeUndefined(); // client_credentials never issues a refresh token

    await expect(issueClientCredentialsTokens({ client, requestedScope: null })).rejects.toThrow(
      /public/i
    );

    await prisma.oAuthClient.delete({ where: { id: confidential.id } }).catch(() => {});
  });
});

describe("tokenService — introspection and revocation", () => {
  it("introspect reports active:true for a live token, active:false after revocation", async () => {
    const pair = await issueTokenPair({ client, userId: user.id, scopes: ["profile:read"] });

    const before = await introspectToken(pair.access_token);
    expect(before.active).toBe(true);
    expect(before.sub).toBe(user.id);

    await revokeToken(pair.access_token, "access_token");

    const after = await introspectToken(pair.access_token);
    expect(after.active).toBe(false);
  });

  it("introspect reports active:false for a garbage token without throwing", async () => {
    const result = await introspectToken("not-a-real-token");
    expect(result.active).toBe(false);
  });

  it("revoking a refresh token also revokes its linked access token (RFC 7009 cascading revocation)", async () => {
    const pair = await issueTokenPair({ client, userId: user.id, scopes: ["profile:read"] });

    await revokeToken(pair.refresh_token, "refresh_token");

    const accessCheck = await introspectToken(pair.access_token);
    const refreshCheck = await introspectToken(pair.refresh_token);
    expect(accessCheck.active).toBe(false);
    expect(refreshCheck.active).toBe(false);
  });
});
