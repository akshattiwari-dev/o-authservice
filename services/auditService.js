import { prisma } from "@/lib/prisma";

/**
 * Fire-and-forget audit log write. Never throws into the caller — a
 * logging failure should never break the actual request it's describing.
 */
export async function logAudit({ userId = null, action, metadata = null, ip = null, userAgent = null }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, metadata, ip, userAgent },
    });
  } catch (err) {
    console.error("[audit] failed to write log:", action, err.message);
  }
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
