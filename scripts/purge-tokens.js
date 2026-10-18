/**
 * Deletes old revoked/expired token + authorization-code rows.
 * Run manually (`npm run jobs:purge-tokens`) or on a cron/scheduled task —
 * this is NOT wired to run automatically. See README "Known limitations".
 *
 * Only removes rows past a retention window (default 30 days past
 * expiry/revocation) so nothing recently relevant to debugging is lost.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const RETENTION_MS = Number(process.env.TOKEN_PURGE_RETENTION_MS || 30 * 24 * 60 * 60 * 1000);

async function main() {
  const cutoff = new Date(Date.now() - RETENTION_MS);

  const [codes, access, refresh] = await Promise.all([
    prisma.authorizationCode.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    prisma.accessToken.deleteMany({
      where: { OR: [{ revoked: true }, { expiresAt: { lt: cutoff } }], expiresAt: { lt: cutoff } },
    }),
    prisma.refreshToken.deleteMany({
      where: { OR: [{ revoked: true }, { expiresAt: { lt: cutoff } }], expiresAt: { lt: cutoff } },
    }),
  ]);

  console.log(
    `Purged ${codes.count} authorization codes, ${access.count} access tokens, ${refresh.count} refresh tokens older than ${cutoff.toISOString()}.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
