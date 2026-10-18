import { prisma } from "@/lib/prisma";

/**
 * Custom error class so callers (the route handler) can distinguish
 * "the guard rejected this" from an unexpected failure without string-
 * matching a message, the way a couple of other services in this repo
 * do (see tokenService.js's use of `Errors.*`). Kept local to this
 * service rather than in oauth/errors.js since this isn't an OAuth
 * concern.
 */
export class AdminGuardError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Change a user's role, refusing to demote the last remaining ADMIN.
 * Extracted out of the route handler so this — the actual business rule
 * — is unit-testable against a real Prisma client without needing to
 * mock a Next.js request/response cycle.
 */
export async function updateUserRole(userId, role) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target) {
    throw new AdminGuardError("not_found", "User not found.");
  }

  if (target.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new AdminGuardError("last_admin", "Cannot demote the last remaining admin.");
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, role: true },
  });
}
