// End-to-end Authorization Code + PKCE happy path, exercised at the service
// composition layer (oauth/pkce -> tokenService), which is what
// app/api/oauth/authorize and app/api/oauth/token actually call. Spinning up
// the full Next.js server for a route-handler-level HTTP test isn't worth
// the CI time here; this covers the same real logic without it.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashSecret, randomToken } from "@/utils/crypto";
import { generatePkcePair } from "@/oauth/pkce";
import {
  issueAuthorizationCode,
  redeemAuthorizationCode,
  issueTokenPair,
  authenticateClient,
  introspectToken,
} from "@/services/tokenService";
import { getClientByClientId } from "@/services/clientService";

let user;
let client;
const REDIRECT_URI = "https://client.example/callback";

beforeAll(async () => {
  user = await prisma.user.create({
    data: {
      name: "OAuth Flow Test User",
      email: `oauthflow-${randomToken(6)}@test.local`,
      password: await hashSecret("irrelevant-password-1"),
      role: "USER",
    },
  });

  client = await prisma.oAuthClient.create({
    data: {
      name: "OAuth Flow Test Client",
      redirectUris: [REDIRECT_URI],
      scopes: ["profile:read", "email:read"],
      isPublic: true,
      ownerId: user.id,
    },
  });
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  await prisma.$disconnect();
});

describe("Authorization Code + PKCE — full happy path", () => {
  it("authorize -> token exchange -> introspect all succeed with matching claims", async () => {
    // 1. "Authorize": user approves, server issues a single-use code bound
    //    to a PKCE challenge (mirrors POST /api/oauth/authorize).
    const { codeVerifier, codeChallenge, codeChallengeMethod } = generatePkcePair();

    const rawCode = await issueAuthorizationCode({
      client,
      userId: user.id,
      redirectUri: REDIRECT_URI,
      scopes: ["profile:read", "email:read"],
      codeChallenge,
      codeChallengeMethod,
    });
    expect(rawCode).toBeTruthy();

    // 2. "Token": client presents the code + verifier (mirrors
    //    POST /api/oauth/token with grant_type=authorization_code).
    const resolvedClient = await getClientByClientId(client.clientId);
    await authenticateClient({ client: resolvedClient, clientSecret: undefined });

    const authCode = await redeemAuthorizationCode({
      rawCode,
      client: resolvedClient,
      redirectUri: REDIRECT_URI,
      codeVerifier,
    });

    const tokens = await issueTokenPair({
      client: resolvedClient,
      userId: authCode.userId,
      scopes: authCode.scopes,
    });

    expect(tokens.token_type).toBe("Bearer");
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();
    expect(tokens.scope).toBe("profile:read email:read");

    // 3. Introspect the freshly issued access token — must be active and
    //    carry the right subject/client/scope.
    const introspection = await introspectToken(tokens.access_token);
    expect(introspection.active).toBe(true);
    expect(introspection.sub).toBe(user.id);
    expect(introspection.client_id).toBe(client.clientId);
    expect(introspection.scope).toBe("profile:read email:read");
  });

  it("rejects the token exchange when the wrong code_verifier is presented", async () => {
    const { codeChallenge, codeChallengeMethod } = generatePkcePair();
    const rawCode = await issueAuthorizationCode({
      client,
      userId: user.id,
      redirectUri: REDIRECT_URI,
      scopes: ["profile:read"],
      codeChallenge,
      codeChallengeMethod,
    });

    const resolvedClient = await getClientByClientId(client.clientId);
    await expect(
      redeemAuthorizationCode({
        rawCode,
        client: resolvedClient,
        redirectUri: REDIRECT_URI,
        codeVerifier: "totally-wrong-verifier-padded-to-length-xxxxxxxxxx",
      })
    ).rejects.toThrow(/pkce/i);
  });

  // B2 — deliberate attack / negative cases beyond the happy path above.

  it("rejects a mismatched redirect_uri at token exchange", async () => {
    const { codeVerifier, codeChallenge, codeChallengeMethod } = generatePkcePair();
    const rawCode = await issueAuthorizationCode({
      client,
      userId: user.id,
      redirectUri: REDIRECT_URI,
      scopes: ["profile:read"],
      codeChallenge,
      codeChallengeMethod,
    });

    const resolvedClient = await getClientByClientId(client.clientId);
    await expect(
      redeemAuthorizationCode({
        rawCode,
        client: resolvedClient,
        redirectUri: "https://attacker.example/callback",
        codeVerifier,
      })
    ).rejects.toThrow(/redirect_uri/i);
  });

  it("rejects a missing code_verifier when a PKCE challenge was stored", async () => {
    const { codeChallenge, codeChallengeMethod } = generatePkcePair();
    const rawCode = await issueAuthorizationCode({
      client,
      userId: user.id,
      redirectUri: REDIRECT_URI,
      scopes: ["profile:read"],
      codeChallenge,
      codeChallengeMethod,
    });

    const resolvedClient = await getClientByClientId(client.clientId);
    await expect(
      redeemAuthorizationCode({
        rawCode,
        client: resolvedClient,
        redirectUri: REDIRECT_URI,
        codeVerifier: undefined,
      })
    ).rejects.toThrow(/pkce/i);
  });

  it("rejects the plain PKCE method end-to-end, even when challenge === verifier", async () => {
    const codeVerifier = "a".repeat(64);
    const rawCode = await issueAuthorizationCode({
      client,
      userId: user.id,
      redirectUri: REDIRECT_URI,
      scopes: ["profile:read"],
      codeChallenge: codeVerifier, // plain: challenge is the verifier itself
      codeChallengeMethod: "plain",
    });

    const resolvedClient = await getClientByClientId(client.clientId);
    await expect(
      redeemAuthorizationCode({ rawCode, client: resolvedClient, redirectUri: REDIRECT_URI, codeVerifier })
    ).rejects.toThrow(/challenge_method|pkce/i);
  });

  it("rejects a client_secret mismatch for a confidential client", async () => {
    const confidential = await prisma.oAuthClient.create({
      data: {
        name: "OAuth Flow Confidential Client",
        redirectUris: [REDIRECT_URI],
        scopes: ["profile:read"],
        isPublic: false,
        clientSecretHash: await hashSecret("the-real-secret"),
        ownerId: user.id,
      },
    });

    await expect(
      authenticateClient({ client: confidential, clientSecret: "definitely-not-the-secret" })
    ).rejects.toThrow(/invalid client/i);

    // The real secret still works — confirms the failure above was really
    // about the wrong secret, not a broken client record.
    const authenticated = await authenticateClient({ client: confidential, clientSecret: "the-real-secret" });
    expect(authenticated.id).toBe(confidential.id);

    await prisma.oAuthClient.delete({ where: { id: confidential.id } }).catch(() => {});
  });
});
