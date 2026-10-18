import { prisma } from "@/lib/prisma";
import { randomToken, sha256 } from "@/utils/crypto";

export async function createApiKey(userId, name) {
  const rawKey = `oa_${randomToken(24)}`;
  const keyHash = sha256(rawKey);
  const keyPrefix = rawKey.slice(0, 10);

  const row = await prisma.apiKey.create({
    data: { userId, name, keyHash, keyPrefix },
  });

  // Raw key is returned once and never recoverable again.
  return { row, rawKey };
}

export async function listApiKeys(userId) {
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, revoked: true, createdAt: true },
  });
}

export async function revokeApiKey(id, userId) {
  const existing = await prisma.apiKey.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.apiKey.update({ where: { id }, data: { revoked: true } });
}

export async function verifyApiKey(rawKey) {
  const keyHash = sha256(rawKey);
  const row = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!row || row.revoked) return null;
  await prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  return row;
}
