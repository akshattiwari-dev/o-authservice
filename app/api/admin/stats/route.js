import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const [userCount, clientCount, activeAccessTokens, activeRefreshTokens, recentLogs] = await Promise.all([
      prisma.user.count(),
      prisma.oAuthClient.count(),
      prisma.accessToken.count({ where: { revoked: false, expiresAt: { gt: new Date() } } }),
      prisma.refreshToken.count({ where: { revoked: false, expiresAt: { gt: new Date() } } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, action: true, metadata: true, createdAt: true, userId: true },
      }),
    ]);

    return NextResponse.json({
      stats: { userCount, clientCount, activeAccessTokens, activeRefreshTokens },
      recentLogs,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
