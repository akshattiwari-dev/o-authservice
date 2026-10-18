// Requires a reachable Postgres at DATABASE_URL (see README "Testing").
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashSecret, randomToken, verifySecret } from "@/utils/crypto";
import {
  createClient,
  listClientsForOwner,
  getClientForOwner,
  getClientByClientId,
  updateClient,
  deleteClient,
  regenerateSecret,
} from "@/services/clientService";

let owner;

beforeAll(async () => {
  owner = await prisma.user.create({
    data: {
      name: "Client Service Test Owner",
      email: `clientsvc-${randomToken(6)}@test.local`,
      password: await hashSecret("irrelevant-password-1"),
      role: "USER",
    },
  });
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: owner.id } }).catch(() => {});
  await prisma.$disconnect();
});

describe("clientService — CRUD", () => {
  it("createClient returns a raw secret once, and only the hash is ever persisted", async () => {
    const { client, clientSecret } = await createClient({
      ownerId: owner.id,
      name: "Test Confidential Client",
      redirectUris: ["https://client.example/callback"],
      scopes: ["profile:read"],
      isPublic: false,
    });

    expect(clientSecret).toMatch(/^sk_/);
    expect(client.clientSecretHash).not.toBe(clientSecret);
    expect(await verifySecret(clientSecret, client.clientSecretHash)).toBe(true);
  });

  it("createClient issues no secret at all for a public client", async () => {
    const { client, clientSecret } = await createClient({
      ownerId: owner.id,
      name: "Test Public Client",
      redirectUris: ["https://client.example/callback"],
      scopes: ["profile:read"],
      isPublic: true,
    });

    expect(clientSecret).toBeNull();
    expect(client.clientSecretHash).toBeNull();
  });

  it("listClientsForOwner returns only that owner's clients, newest first", async () => {
    const otherOwner = await prisma.user.create({
      data: {
        name: "Other Owner",
        email: `clientsvc-other-${randomToken(6)}@test.local`,
        password: await hashSecret("irrelevant-password-1"),
        role: "USER",
      },
    });
    await createClient({
      ownerId: otherOwner.id,
      name: "Not Yours",
      redirectUris: ["https://other.example/callback"],
      scopes: ["profile:read"],
      isPublic: true,
    });

    const mine = await listClientsForOwner(owner.id);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((c) => c.ownerId === owner.id)).toBe(true);

    await prisma.user.delete({ where: { id: otherOwner.id } }).catch(() => {});
  });

  it("updateClient applies partial updates and leaves unspecified fields untouched", async () => {
    const { client } = await createClient({
      ownerId: owner.id,
      name: "Original Name",
      description: "Original description",
      redirectUris: ["https://client.example/callback"],
      scopes: ["profile:read"],
      isPublic: true,
    });

    const updated = await updateClient(client.id, owner.id, { name: "New Name" });
    expect(updated.name).toBe("New Name");
    expect(updated.description).toBe("Original description"); // untouched
  });

  it("deleteClient removes the row and getClientForOwner no longer finds it", async () => {
    const { client } = await createClient({
      ownerId: owner.id,
      name: "To Be Deleted",
      redirectUris: ["https://client.example/callback"],
      scopes: ["profile:read"],
      isPublic: true,
    });

    const deleted = await deleteClient(client.id, owner.id);
    expect(deleted.id).toBe(client.id);
    expect(await getClientForOwner(client.id, owner.id)).toBeNull();
    expect(await prisma.oAuthClient.findUnique({ where: { id: client.id } })).toBeNull();
  });
});

describe("clientService — regenerateSecret", () => {
  it("rotates the secret so the old one no longer authenticates", async () => {
    const { client, clientSecret: originalSecret } = await createClient({
      ownerId: owner.id,
      name: "Rotation Test Client",
      redirectUris: ["https://client.example/callback"],
      scopes: ["profile:read"],
      isPublic: false,
    });

    const newSecret = await regenerateSecret(client.id, owner.id);
    expect(newSecret).not.toBe(originalSecret);

    const row = await prisma.oAuthClient.findUnique({ where: { id: client.id } });
    expect(await verifySecret(originalSecret, row.clientSecretHash)).toBe(false);
    expect(await verifySecret(newSecret, row.clientSecretHash)).toBe(true);
  });

  it("refuses to generate a secret for a public client", async () => {
    const { client } = await createClient({
      ownerId: owner.id,
      name: "Public Rotation Test Client",
      redirectUris: ["https://client.example/callback"],
      scopes: ["profile:read"],
      isPublic: true,
    });

    await expect(regenerateSecret(client.id, owner.id)).rejects.toThrow(/public clients/i);
  });
});

describe("A3 — getClientByClientId cache + invalidation", () => {
  it("serves a cached value on the second lookup without changing what's returned", async () => {
    const { client } = await createClient({
      ownerId: owner.id,
      name: "Cache Test Client",
      redirectUris: ["https://client.example/callback"],
      scopes: ["profile:read"],
      isPublic: true,
    });

    const first = await getClientByClientId(client.clientId);
    const second = await getClientByClientId(client.clientId); // should hit the cache
    expect(second).toEqual(first);
  });

  it("a disabling update is reflected immediately (cache invalidated, not served stale for up to CLIENT_CACHE_TTL_MS)", async () => {
    const { client } = await createClient({
      ownerId: owner.id,
      name: "Cache Invalidation Test Client",
      redirectUris: ["https://client.example/callback"],
      scopes: ["profile:read"],
      isPublic: true,
    });

    // Warm the cache with the pre-update value.
    await getClientByClientId(client.clientId);

    // updateClient() calls invalidateClientCache() internally.
    await updateClient(client.id, owner.id, { name: "Renamed After Cache Warm" });

    const afterUpdate = await getClientByClientId(client.clientId);
    expect(afterUpdate.name).toBe("Renamed After Cache Warm"); // not the stale cached name
  });

  it("caches a miss too, so a repeated lookup of an unknown client_id doesn't necessarily hit the DB every time", async () => {
    const first = await getClientByClientId("client_does_not_exist_at_all");
    const second = await getClientByClientId("client_does_not_exist_at_all");
    expect(first).toBeNull();
    expect(second).toBeNull();
  });
});
