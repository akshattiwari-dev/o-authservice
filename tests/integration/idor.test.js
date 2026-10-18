// Requires a reachable Postgres at DATABASE_URL (see README "Testing").
//
// B3: dedicated IDOR / cross-user category. Every ownership-scoped service
// function in this repo folds the ownership check into the same Prisma
// `where` clause as the lookup itself (id + ownerId/userId together, e.g.
// `prisma.oAuthClient.findFirst({ where: { id, ownerId } })`) rather than
// fetching by id first and checking ownership as a separate step — a
// pattern that's easy to accidentally skip and is exactly how IDOR bugs
// creep in. These tests exist to pin that behavior in place: user B must
// never be able to read, modify, or delete a resource user A owns, no
// matter how correct the id it presents is.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashSecret, randomToken } from "@/utils/crypto";
import {
  getClientForOwner,
  updateClient,
  deleteClient,
  regenerateSecret,
} from "@/services/clientService";
import { issueTokenPair, revokeOwnToken } from "@/services/tokenService";
import { createApiKey, revokeApiKey } from "@/services/apiKeyService";

let userA;
let userB;
let clientOfA;

beforeAll(async () => {
  userA = await prisma.user.create({
    data: {
      name: "IDOR User A",
      email: `idor-a-${randomToken(6)}@test.local`,
      password: await hashSecret("irrelevant-password-1"),
      role: "USER",
    },
  });
  userB = await prisma.user.create({
    data: {
      name: "IDOR User B",
      email: `idor-b-${randomToken(6)}@test.local`,
      password: await hashSecret("irrelevant-password-1"),
      role: "USER",
    },
  });

  clientOfA = await prisma.oAuthClient.create({
    data: {
      name: "User A's Client",
      redirectUris: ["https://client.example/callback"],
      scopes: ["profile:read"],
      isPublic: false,
      clientSecretHash: await hashSecret("irrelevant-secret"),
      ownerId: userA.id,
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } }).catch(() => {});
  await prisma.$disconnect();
});

describe("IDOR — clientService cross-user access", () => {
  it("cross-user: getClientForOwner returns nothing when the requester isn't the owner", async () => {
    const asOwner = await getClientForOwner(clientOfA.id, userA.id);
    const asOther = await getClientForOwner(clientOfA.id, userB.id);
    expect(asOwner).not.toBeNull();
    expect(asOther).toBeNull();
  });

  it("cross-user: updateClient silently no-ops for a non-owner instead of leaking or modifying the row", async () => {
    const result = await updateClient(clientOfA.id, userB.id, { name: "Hijacked Name" });
    expect(result).toBeNull();

    const untouched = await prisma.oAuthClient.findUnique({ where: { id: clientOfA.id } });
    expect(untouched.name).toBe("User A's Client");
  });

  it("cross-user: regenerateSecret refuses to rotate a secret for a client the caller doesn't own", async () => {
    const before = await prisma.oAuthClient.findUnique({ where: { id: clientOfA.id } });
    const result = await regenerateSecret(clientOfA.id, userB.id);
    expect(result).toBeNull();

    const after = await prisma.oAuthClient.findUnique({ where: { id: clientOfA.id } });
    expect(after.clientSecretHash).toBe(before.clientSecretHash); // untouched
  });

  it("cross-user: deleteClient refuses to delete another user's client", async () => {
    const result = await deleteClient(clientOfA.id, userB.id);
    expect(result).toBeNull();

    const stillExists = await prisma.oAuthClient.findUnique({ where: { id: clientOfA.id } });
    expect(stillExists).not.toBeNull();
  });
});

describe("IDOR — tokenService.revokeOwnToken cross-user access", () => {
  it("cross-user: user B cannot revoke an access token issued for user A", async () => {
    const pair = await issueTokenPair({ client: clientOfA, userId: userA.id, scopes: ["profile:read"] });
    const record = await prisma.accessToken.findFirst({ where: { userId: userA.id }, orderBy: { createdAt: "desc" } });

    const revokedByOther = await revokeOwnToken({ id: record.id, userId: userB.id, kind: "access" });
    expect(revokedByOther).toBe(false);

    const stillLive = await prisma.accessToken.findUnique({ where: { id: record.id } });
    expect(stillLive.revoked).toBe(false);

    // Sanity check: the actual owner can revoke it.
    const revokedByOwner = await revokeOwnToken({ id: record.id, userId: userA.id, kind: "access" });
    expect(revokedByOwner).toBe(true);
    void pair;
  });

  it("cross-user: user B cannot revoke a refresh token issued for user A", async () => {
    const pair = await issueTokenPair({ client: clientOfA, userId: userA.id, scopes: ["profile:read"] });
    const record = await prisma.refreshToken.findFirst({ where: { userId: userA.id }, orderBy: { createdAt: "desc" } });

    const revokedByOther = await revokeOwnToken({ id: record.id, userId: userB.id, kind: "refresh" });
    expect(revokedByOther).toBe(false);

    const stillLive = await prisma.refreshToken.findUnique({ where: { id: record.id } });
    expect(stillLive.revoked).toBe(false);
    void pair;
  });

  it("a nonexistent token id revoked by anyone returns false, not an error (no existence oracle)", async () => {
    const result = await revokeOwnToken({ id: "not-a-real-id", userId: userA.id, kind: "access" });
    expect(result).toBe(false);
  });
});

describe("IDOR — apiKeyService.revokeApiKey cross-user access", () => {
  it("cross-user: user B cannot revoke an API key belonging to user A", async () => {
    const { row } = await createApiKey(userA.id, "A's key");

    const revokedByOther = await revokeApiKey(row.id, userB.id);
    expect(revokedByOther).toBeNull();

    const stillLive = await prisma.apiKey.findUnique({ where: { id: row.id } });
    expect(stillLive.revoked).toBe(false);

    const revokedByOwner = await revokeApiKey(row.id, userA.id);
    expect(revokedByOwner).not.toBeNull();
  });
});
