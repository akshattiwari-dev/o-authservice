// Requires a reachable Postgres at DATABASE_URL (see README "Testing").
import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashSecret, randomToken } from "@/utils/crypto";
import { updateUserRole, AdminGuardError } from "@/services/adminService";

const createdUserIds = [];

async function makeUser(role) {
  const user = await prisma.user.create({
    data: {
      name: "Admin Guard Test User",
      email: `adminguard-${randomToken(6)}@test.local`,
      password: await hashSecret("irrelevant-password-1"),
      role,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

afterEach(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } }).catch(() => {});
});

describe("adminService.updateUserRole — last-admin guard", () => {
  it("promotes a regular user without issue", async () => {
    const user = await makeUser("USER");
    const updated = await updateUserRole(user.id, "DEVELOPER");
    expect(updated.role).toBe("DEVELOPER");
  });

  it("allows demoting an admin when other admins still exist", async () => {
    const adminA = await makeUser("ADMIN");
    await makeUser("ADMIN"); // adminB — keeps the count above 1

    const updated = await updateUserRole(adminA.id, "USER");
    expect(updated.role).toBe("USER");
  });

  it("refuses to demote the last remaining admin", async () => {
    // Isolate from any admins seeded elsewhere by operating on a user we
    // just created and controlling the count via the assertion below —
    // this checks the guard fires at all, not the exact global count.
    const lastAdmin = await makeUser("ADMIN");

    // Demote every other admin in the system first so this one really is
    // the last, matching what the guard actually checks. These are NOT
    // added to createdUserIds — afterEach only deletes fixtures this
    // test created, never pre-existing accounts (e.g. a seeded admin).
    const others = await prisma.user.findMany({ where: { role: "ADMIN", id: { not: lastAdmin.id } } });
    for (const other of others) {
      await prisma.user.update({ where: { id: other.id }, data: { role: "USER" } });
    }

    try {
      await expect(updateUserRole(lastAdmin.id, "USER")).rejects.toThrow(AdminGuardError);
      await expect(updateUserRole(lastAdmin.id, "USER")).rejects.toMatchObject({ code: "last_admin" });
    } finally {
      // Restore the demoted admins even if an assertion above fails, so
      // this test never leaves the DB without any admin.
      for (const other of others) {
        await prisma.user.update({ where: { id: other.id }, data: { role: "ADMIN" } }).catch(() => {});
      }
    }
  });

  it("throws not_found for a nonexistent user", async () => {
    await expect(updateUserRole("nonexistent-id", "USER")).rejects.toMatchObject({ code: "not_found" });
  });
});
