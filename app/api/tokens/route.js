import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireSession();

    const [accessTokens, refreshTokens] = await Promise.all([
      // TODO: this is a flat take:50 cap, not cursor-paginated like the
      // admin token list. Fine for a self-service view of one user's own
      // tokens (bounded in practice), but if that assumption stops holding
      // it should get the same cursor pagination as /api/admin/tokens.
      prisma.accessToken.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { client: { select: { name: true, clientId: true } } },
      }),
      prisma.refreshToken.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { client: { select: { name: true, clientId: true } } },
      }),
    ]);

    // Never expose the jti/tokenHash raw — those aren't secrets in
    // themselves (the JWT/refresh string is what's secret) but there's no
    // reason to leak them either.
    const safeAccess = accessTokens.map(({ jti, ...t }) => ({ ...t, id: t.id }));
    const safeRefresh = refreshTokens.map(({ tokenHash, ...t }) => t);

    return NextResponse.json({ accessTokens: safeAccess, refreshTokens: safeRefresh });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
