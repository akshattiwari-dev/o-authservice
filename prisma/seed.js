/**
 * Seeds the platform with default scopes and one admin account.
 * Run with: npm run db:seed
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEFAULT_SCOPES = [
  // OpenID Connect standard scopes
  { name: "openid", description: "OpenID Connect — required to receive an ID Token.", isDefault: true },
  { name: "profile", description: "Access the user's name and profile picture.", isDefault: true },
  { name: "email", description: "Access the user's email address.", isDefault: true },
  { name: "offline_access", description: "Request a refresh token for offline access.", isDefault: false },

  // Legacy / app-specific scopes (keep for backward compatibility)
  { name: "profile:read", description: "Read the user's name and profile picture.", isDefault: true },
  { name: "email:read", description: "Read the user's email address.", isDefault: true },
  { name: "chapters:read", description: "Read the user's chapter progress and notes.", isDefault: false },
  { name: "chapters:write", description: "Update the user's chapter progress and notes.", isDefault: false },
];

async function main() {
  for (const scope of DEFAULT_SCOPES) {
    await prisma.scope.upsert({
      where: { name: scope.name },
      create: scope,
      update: { description: scope.description, isDefault: scope.isDefault },
    });
  }
  console.log(`Seeded ${DEFAULT_SCOPES.length} scopes.`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@o-auth.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        password: passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`Seeded admin user: ${adminEmail} / ${adminPassword} — change this password after first login.`);
  } else {
    console.log(`Admin user ${adminEmail} already exists, skipping.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
