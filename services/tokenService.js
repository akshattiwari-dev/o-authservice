import { prisma } from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import { sha256, randomToken, verifySecret } from "@/utils/crypto";
import { signAccessToken,signIdToken, verifyAccessToken } from "@/lib/jwt";
import { verifyPkce, isAllowedChallengeMethod } from "@/oauth/pkce";
import { Errors } from "@/oauth/errors";
import { recordFailure, recordSuccess, isLockedOut } from "@/utils/rateLimit";

const ACCESS_TOKEN_TTL = Number(process.env.ACCESS_TOKEN_TTL || 900);
const REFRESH_TOKEN_TTL = Number(process.env.REFRESH_TOKEN_TTL || 2592000);
const AUTH_CODE_TTL = Number(process.env.AUTHORIZATION_CODE_TTL || 120);

const CLIENT_AUTH_MAX_ATTEMPTS = 5;
const CLIENT_AUTH_LOCKOUT_MS = 5 * 60_000; // 5 minutes

function assertClientEnabled(client) {
  if (client.disabled) {
    throw Errors.unauthorizedClient("This client has been disabled by an administrator.");
  }
}

// ── Authorization code ─────────────────────────────────────────────────

/** Issue a fresh single-use authorization code after the user approves consent. */
export async function issueAuthorizationCode({
  client,
  userId,
  redirectUri,
  scopes,
  codeChallenge,
  codeChallengeMethod,
  playgroundFlowId,
}) {
  const rawCode = randomToken(32);
  const codeHash = sha256(rawCode);

  await prisma.authorizationCode.create({
    data: {
      codeHash,
      clientId: client.id,
      userId,
      redirectUri,
      scopes,
      codeChallenge: codeChallenge || null,
      codeChallengeMethod: codeChallengeMethod || null,
      playgroundFlowId: playgroundFlowId || null,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL * 1000),
    },
  });

  return rawCode;
}

/**
 * Redeem an authorization code for tokens. Validates: existence, expiry,
 * single-use, exact redirect_uri match, and PKCE. Marks the code used
 * atomically first so a replay can never succeed, even under a race.
 */
export async function redeemAuthorizationCode({ rawCode, client, redirectUri, codeVerifier }) {
  assertClientEnabled(client);

  const codeHash = sha256(rawCode);

  const result = await prisma.authorizationCode.updateMany({
    where: { codeHash, used: false },
    data: { used: true },
  });

  if (result.count === 0) {
    throw Errors.invalidGrant("Authorization code is invalid, expired, or already used.");
  }

  const authCode = await prisma.authorizationCode.findUnique({ where: { codeHash } });

  if (!authCode || authCode.expiresAt < new Date()) {
    throw Errors.invalidGrant("Authorization code has expired.");
  }
  if (authCode.clientId !== client.id) {
    throw Errors.invalidGrant("Authorization code was not issued to this client.");
  }
  // Byte-for-byte comparison — no trailing-slash normalization, no case
  // folding, no prefix matching. RFC 6749 §3.1.2.3 requires this to be
  // treated as an exact string match, and that's exactly what JS `!==`
  // does against two strings: no implicit normalization happens here.
  if (authCode.redirectUri !== redirectUri) {
    throw Errors.invalidGrant("redirect_uri does not match the authorization request byte-for-byte.");
  }

  if (authCode.codeChallengeMethod && !isAllowedChallengeMethod(authCode.codeChallengeMethod)) {
    // Should be unreachable (the authorize step already rejects "plain"),
    // but refuse defensively if an old/tampered record ever has it.
    throw Errors.invalidGrant("Unsupported code_challenge_method on stored authorization code.");
  }

  const pkceOk = verifyPkce({
    codeVerifier,
    codeChallenge: authCode.codeChallenge,
    codeChallengeMethod: authCode.codeChallengeMethod,
  });
  if (!pkceOk) {
    throw Errors.invalidGrant("PKCE verification failed.");
  }
  if (client.isPublic && !authCode.codeChallenge) {
    // Defense in depth — public clients should never have been issued a
    // code without PKCE in the first place, but refuse here too.
    throw Errors.invalidGrant("PKCE is required for public clients.");
  }

  return authCode;
}

// ── Access + refresh token issuance ───────────────────────────────────

export async function issueTokenPair({ client, userId, scopes }) {
  const jti = uuid();

  const accessTokenRow = await prisma.accessToken.create({
    data: {
      jti,
      clientId: client.id,
      userId,
      scopes,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL * 1000),
    },
  });

  const accessTokenJwt = await signAccessToken({
    jti,
    sub: userId,
    clientId: client.clientId,
    scopes,
    ttlSeconds: ACCESS_TOKEN_TTL,
  });

  const rawRefreshToken = randomToken(40);
  await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(rawRefreshToken),
      clientId: client.id,
      userId,
      scopes,
      accessTokenId: accessTokenRow.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
    },
  });

  const response = {
    access_token: accessTokenJwt,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL,
    refresh_token: rawRefreshToken,
    scope: scopes.join(" "),
  };

  // OpenID Connect: issue id_token when "openid" scope is present
  if (scopes.includes("openid")) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    response.id_token = await signIdToken({
      sub: userId,
      clientId: client.clientId,
      ttlSeconds: ACCESS_TOKEN_TTL,
      email: user?.email || null,
      name: user?.name || null,
    });
  }

  return response;
}
/**
 * Refresh token grant, with rotation: the presented token is revoked and a
 * brand new access+refresh pair is issued and linked via `rotatedToId`.
 * If a caller ever presents an already-rotated (or revoked) refresh token,
 * that's a signal of possible theft/replay — we revoke the entire chain.
 */
export async function rotateRefreshToken({ rawRefreshToken, client, requestedScope }) {
  assertClientEnabled(client);

  const tokenHash = sha256(rawRefreshToken);
  const now = new Date();

  // Atomic claim, same pattern as redeemAuthorizationCode: the write
  // (revoked: false -> true) and the "is this token still usable" check
  // happen in one conditional UPDATE, not a separate read-then-write.
  // Without this, two concurrent requests presenting the same refresh
  // token could both pass a `revoked === false` check before either
  // write landed, and both would mint a valid new token pair — exactly
  // the reuse case the chain-revocation logic below exists to catch.
  // Postgres serializes concurrent UPDATEs to the same row, so at most
  // one of two racing calls can ever see claim.count === 1.
  const claim = await prisma.refreshToken.updateMany({
    where: { tokenHash, clientId: client.id, revoked: false, expiresAt: { gt: now } },
    data: { revoked: true },
  });

  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing || existing.clientId !== client.id) {
    throw Errors.invalidGrant("Refresh token is invalid.");
  }

  if (claim.count === 0) {
    // Already revoked, already expired, or just lost the claim race to a
    // concurrent request presenting the same token — all three are reuse
    // signals, so revoke the whole lineage defensively either way.
    //
    // TODO: narrow residual race — if we lost the claim to a concurrent
    // winner that's still mid-flight (issueTokenPair + the rotatedToId
    // write below haven't landed yet), our revokeTokenChain walk here can
    // start before that new link exists and so won't catch it. The
    // window is milliseconds (one more DB round trip), not the original
    // both-requests-succeed bug, but closing it fully would need the
    // winner to attach rotatedToId inside the same claim transaction
    // rather than as a follow-up write.
    await revokeTokenChain(existing.id);
    throw Errors.invalidGrant(
      "Refresh token has been revoked or expired. Reuse detected — all related tokens revoked."
    );
  }

  let scopes = existing.scopes;
  if (requestedScope) {
    const requested = requestedScope.split(" ").filter(Boolean);
    const notGranted = requested.filter((s) => !existing.scopes.includes(s));
    if (notGranted.length > 0) {
      throw Errors.invalidScope(`Cannot escalate scope on refresh: ${notGranted.join(", ")}`);
    }
    scopes = requested;
  }

  if (existing.accessTokenId) {
    await prisma.accessToken
      .update({ where: { id: existing.accessTokenId }, data: { revoked: true } })
      .catch(() => {});
  }

  const newPair = await issueTokenPair({ client, userId: existing.userId, scopes });

  const newTokenHash = sha256(newPair.refresh_token);
  const newRow = await prisma.refreshToken.findUnique({ where: { tokenHash: newTokenHash } });

  // `existing` is already revoked (the atomic claim above did that) —
  // this second update only attaches rotatedToId so revokeTokenChain can
  // walk forward through the lineage later.
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { rotatedToId: newRow.id },
  });

  return newPair;
}

async function revokeTokenChain(refreshTokenId) {
  const visited = new Set();
  let current = await prisma.refreshToken.findUnique({ where: { id: refreshTokenId } });

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    await prisma.refreshToken.update({ where: { id: current.id }, data: { revoked: true } });
    if (current.accessTokenId) {
      await prisma.accessToken
        .update({ where: { id: current.accessTokenId }, data: { revoked: true } })
        .catch(() => {});
    }
    current = current.rotatedToId
      ? await prisma.refreshToken.findUnique({ where: { id: current.rotatedToId } })
      : null;
  }
}

// ── Introspection (RFC 7662) ───────────────────────────────────────────

export async function introspectToken(rawToken) {
  // Try as an access token (JWT) first.
  try {
    const payload = await verifyAccessToken(rawToken);
    const row = await prisma.accessToken.findUnique({ where: { jti: payload.jti } });
    if (!row || row.revoked || row.expiresAt < new Date()) {
      return { active: false };
    }
    return {
      active: true,
      scope: row.scopes.join(" "),
      client_id: payload.client_id,
      sub: payload.sub,
      exp: payload.exp,
      iat: payload.iat,
      token_type: "Bearer",
    };
  } catch {
    // Not a valid/verifiable access token JWT — fall through to refresh token check.
  }

  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(rawToken) } });
  if (!row || row.revoked || row.expiresAt < new Date()) {
    return { active: false };
  }

  const client = await prisma.oAuthClient.findUnique({ where: { id: row.clientId } });
  return {
    active: true,
    scope: row.scopes.join(" "),
    client_id: client?.clientId,
    sub: row.userId,
    exp: Math.floor(row.expiresAt.getTime() / 1000),
    token_type: "refresh_token",
  };
}

// ── Revocation (RFC 7009) ──────────────────────────────────────────────

export async function revokeToken(rawToken, tokenTypeHint) {
  const tryAccess = async () => {
    try {
      const payload = await verifyAccessToken(rawToken);
      await prisma.accessToken.updateMany({ where: { jti: payload.jti }, data: { revoked: true } });
      return true;
    } catch {
      return false;
    }
  };

  const tryRefresh = async () => {
    const tokenHash = sha256(rawToken);
    const result = await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
    if (result.count > 0) {
      const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (row?.accessTokenId) {
        await prisma.accessToken
          .update({ where: { id: row.accessTokenId }, data: { revoked: true } })
          .catch(() => {});
      }
      return true;
    }
    return false;
  };

  // RFC 7009: the server SHOULD try the hinted type first, then fall back.
  if (tokenTypeHint === "refresh_token") {
    if (await tryRefresh()) return;
    await tryAccess();
  } else {
    if (await tryAccess()) return;
    await tryRefresh();
  }
  // Per spec, revocation of an invalid/unknown token is NOT an error —
  // the endpoint always responds 200 either way (handled by the route).
}

/**
 * Client Credentials grant (RFC 6749 §4.4) — machine-to-machine, no user
 * involved at all. Only confidential clients may use this grant (a public
 * client has no secret to prove its own identity with, so there'd be
 * nothing distinguishing "this app" from "anyone").
 */
export async function issueClientCredentialsTokens({ client, requestedScope }) {
  if (client.isPublic) {
    throw Errors.unauthorizedClient("Public clients cannot use the client_credentials grant.");
  }

  let scopes = client.scopes;
  if (requestedScope) {
    const requested = requestedScope.split(" ").filter(Boolean);
    const notGranted = requested.filter((s) => !client.scopes.includes(s));
    if (notGranted.length > 0) {
      throw Errors.invalidScope(`Client is not permitted to request: ${notGranted.join(", ")}`);
    }
    scopes = requested;
  }

  const jti = uuid();
  await prisma.accessToken.create({
    data: {
      jti,
      clientId: client.id,
      // Client-credentials tokens represent the client itself, not a user —
      // `userId` still needs a value because the column is required, so we
      // attribute it to the client's owner (the developer who registered
      // it) for audit/dashboard purposes only. `sub` in the JWT is the
      // client_id, not this userId, which is what a resource server should
      // actually check for this grant type.
      userId: client.ownerId,
      scopes,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL * 1000),
    },
  });

  const accessTokenJwt = await signAccessToken({
    jti,
    sub: client.clientId,
    clientId: client.clientId,
    scopes,
    ttlSeconds: ACCESS_TOKEN_TTL,
  });

  // No refresh token for client_credentials — the client can just request
  // a new access token directly using its credentials again.
  return {
    access_token: accessTokenJwt,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL,
    scope: scopes.join(" "),
  };
}

// ── Self-service revocation (user revoking their own tokens) ──────────

/**
 * Revoke one of the caller's own access/refresh tokens by record id.
 * Ownership is enforced inside the `where` clause itself (id + userId
 * together), not via a separate fetch-then-check — a mismatched userId
 * simply matches zero rows, so this can't be tricked into revoking
 * another user's token (IDOR) regardless of what id is passed in.
 * Returns true if a token was revoked, false if no matching row was found
 * (either it doesn't exist, or it belongs to someone else — the caller
 * can't distinguish the two, which is the point).
 */
export async function revokeOwnToken({ id, userId, kind }) {
  if (kind === "refresh") {
    const result = await prisma.refreshToken.updateMany({
      where: { id, userId },
      data: { revoked: true },
    });
    return result.count > 0;
  }
  const result = await prisma.accessToken.updateMany({
    where: { id, userId },
    data: { revoked: true },
  });
  return result.count > 0;
}

// ── Client authentication ──────────────────────────────────────────────

/**
 * Authenticates a confidential client's secret (or confirms a public
 * client needs none). Brute-forcing a client secret is throttled
 * independently of the general token-endpoint rate limit: repeated wrong
 * secrets for the same client_id lock that client out for a cooldown
 * period, regardless of which IP the attempts come from.
 */
export async function authenticateClient({ clientSecret, client }) {
  if (!client) throw Errors.invalidClient("Unknown client.");
  assertClientEnabled(client);

  if (client.isPublic) {
    // Public clients authenticate via PKCE only, never a secret.
    return client;
  }

  const lockoutKey = `client-auth:${client.clientId}`;
  const lockStatus = await isLockedOut(lockoutKey);
  if (lockStatus.locked) {
    throw Errors.invalidClient(
      `Too many failed authentication attempts for this client. Try again in ${Math.ceil(
        lockStatus.retryAfterMs / 1000
      )}s.`
    );
  }

  if (!clientSecret) {
    throw Errors.invalidClient("client_secret is required for confidential clients.");
  }
  const valid = await verifySecret(clientSecret, client.clientSecretHash);
  if (!valid) {
    await recordFailure(lockoutKey, { maxAttempts: CLIENT_AUTH_MAX_ATTEMPTS, lockoutMs: CLIENT_AUTH_LOCKOUT_MS });
    throw Errors.invalidClient("Invalid client credentials.");
  }

  await recordSuccess(lockoutKey);
  return client;
}

/**
 * S3: real data for the dashboard's "token issuance" chart, replacing the
 * previous hardcoded mock series. Bucketed in JS rather than a SQL
 * date_trunc groupBy — this is a small, bounded per-user query (one
 * person's tokens over a week), so the simpler approach is fine; a
 * multi-tenant admin-wide version of this would want a real groupBy.
 */
export async function getRecentTokenIssuance(userId, days = 7) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await prisma.accessToken.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const buckets = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({
    date,
    label: new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }),
    count,
  }));
}
