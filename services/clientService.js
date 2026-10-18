import { prisma } from "@/lib/prisma";
import { hashSecret, randomToken } from "@/utils/crypto";

// G3: getClientByClientId is called on every authorize/token/introspect/
// revoke request — a hot path — so a short TTL cache trims one DB round
// trip per request without meaningfully risking stale reads (30s is
// short enough that a disabled/rotated client is locked out again almost
// immediately, and every mutation path below invalidates its entry
// eagerly anyway, so the TTL is really just a safety net for mutations
// that happen outside this service, if any ever do).
//
// Deliberately process-local (a plain Map), not Redis — this is a cache,
// not shared state that needs cross-instance consistency; a cache miss
// just costs one extra query, so each instance having its own is fine.
const CLIENT_CACHE_TTL_MS = Number(process.env.CLIENT_CACHE_TTL_MS || 30_000);
const clientCache = new Map(); // clientId -> { value, expiresAt }

function cacheGet(clientId) {
  const entry = clientCache.get(clientId);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    clientCache.delete(clientId);
    return undefined;
  }
  return entry.value;
}

function cacheSet(clientId, value) {
  clientCache.set(clientId, { value, expiresAt: Date.now() + CLIENT_CACHE_TTL_MS });
}

/** Invalidate the cached lookup for one client. Call this after any write
 * that could change what getClientByClientId returns for it (update,
 * disable/enable, secret rotation, delete). */
export function invalidateClientCache(clientId) {
  clientCache.delete(clientId);
}

/**
 * Create a new OAuth client. Confidential clients get a freshly generated
 * secret returned ONCE (raw) to the caller — only its hash is persisted.
 * Public clients (isPublic: true) get no secret at all; they must use PKCE.
 */
export async function createClient({ ownerId, name, description, logoUrl, redirectUris, scopes, isPublic }) {
  let clientSecret = null;
  let clientSecretHash = null;

  if (!isPublic) {
    clientSecret = `sk_${randomToken(32)}`;
    clientSecretHash = await hashSecret(clientSecret);
  }

  const client = await prisma.oAuthClient.create({
    data: {
      name,
      description: description || null,
      logoUrl: logoUrl || null,
      redirectUris,
      scopes,
      isPublic,
      clientSecretHash,
      ownerId,
    },
  });

  // clientSecret is only ever available on this return value — the DB row
  // only has the hash from this point forward.
  return { client, clientSecret };
}

export async function listClientsForOwner(ownerId) {
  return prisma.oAuthClient.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClientForOwner(clientRecordId, ownerId) {
  return prisma.oAuthClient.findFirst({
    where: { id: clientRecordId, ownerId },
  });
}

export async function getClientByClientId(clientId) {
  const cached = cacheGet(clientId);
  if (cached !== undefined) return cached;

  const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
  // Cache the miss too (as null) — a bad/typo'd client_id being retried
  // repeatedly (e.g. during a brute-force client_id scan) shouldn't hit
  // the DB every time either.
  cacheSet(clientId, client);
  return client;
}

/** Fetches human-readable descriptions for a set of scope names, for the consent screen. */
export async function getScopeDescriptions(scopeNames) {
  const rows = await prisma.scope.findMany({ where: { name: { in: scopeNames } } });
  const byName = new Map(rows.map((r) => [r.name, r.description]));
  return scopeNames.map((name) => ({ name, description: byName.get(name) || null }));
}

export async function updateClient(clientRecordId, ownerId, data) {
  const existing = await getClientForOwner(clientRecordId, ownerId);
  if (!existing) return null;

  const updated = await prisma.oAuthClient.update({
    where: { id: clientRecordId },
    data: {
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : existing.logoUrl,
      redirectUris: data.redirectUris ?? existing.redirectUris,
      scopes: data.scopes ?? existing.scopes,
    },
  });
  invalidateClientCache(existing.clientId);
  return updated;
}

export async function deleteClient(clientRecordId, ownerId) {
  const existing = await getClientForOwner(clientRecordId, ownerId);
  if (!existing) return null;
  await prisma.oAuthClient.delete({ where: { id: clientRecordId } });
  invalidateClientCache(existing.clientId);
  return existing;
}

/** Regenerate a confidential client's secret. Old secret is immediately invalid. */
export async function regenerateSecret(clientRecordId, ownerId) {
  const existing = await getClientForOwner(clientRecordId, ownerId);
  if (!existing) return null;
  if (existing.isPublic) {
    throw new Error("Public clients do not have a secret.");
  }

  const clientSecret = `sk_${randomToken(32)}`;
  const clientSecretHash = await hashSecret(clientSecret);

  await prisma.oAuthClient.update({
    where: { id: clientRecordId },
    data: { clientSecretHash },
  });
  invalidateClientCache(existing.clientId);

  return clientSecret;
}
