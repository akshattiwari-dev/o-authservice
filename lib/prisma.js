import { PrismaClient } from "@prisma/client";

// Next.js dev mode reloads modules on every change; without this guard a
// fresh PrismaClient (and a fresh pool of DB connections) would be created
// on every hot reload. Stashing the instance on `global` survives reloads.
const globalForPrisma = global;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
